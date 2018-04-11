# Copyright (c) 2013, Mianul Islam and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from glob import glob

from frappe.utils.file_manager import get_files_path


def execute(filters=None):
    return GetMissingFromFolder(filters).run()


class GetMissingFromFolder:
    def __init__(self, filters):
        self.filters = filters or {}
        self.files = []
        self.missing_files = []
        if self.filters.get('has_manual_folder'):
            self.file_folder_joiner = '/*/'
            del self.filters['has_manual_folder']
        else:
            self.file_folder_joiner = '/'
        self.log_doc = 'Designer Log' if frappe.get_value('Folder Manage', self.filters.get('folder'), 'folder_type') == "Output" else 'QC Log'

    def run(self):
        self.prepare_conditions()
        self.get_files()
        self.get_missing_files()
        return self.get_columns(), self.missing_files

    @staticmethod
    def get_columns():
        return [
            {
                "fieldname": "file",
                "fieldtype": "Data",
                "label": _("File"),
                "width": 200
            },
            {
                "fieldname": "folder",
                "fieldtype": "Data",
                "label": _("Folder"),
                "width": 250
            },
            {
                "fieldname": "employeee",
                "fieldtype": "Link",
                "options": "Employee",
                "label": _("Employee ID"),
                "width": 150
            },
            # {
            #     "fieldname": "employee_name",
            #     "fieldtype": "Data",
            #     "label": _("Employee Name"),
            #     "width": 180
            # }
        ]

    def prepare_conditions(self):
        if self.filters.get('folder'):
            if self.filters.get('folder') == "Upload":
                self.filters['folder'] = "Upload/"
            self.filters['tabFile`.`folder'] = ('like', self.filters.get('folder') + '%')
            del self.filters['folder']
        if not self.filters.get('is_folder'):
            self.filters['is_folder'] = 0

        if frappe.boot.get_bootinfo().employee and frappe.boot.get_bootinfo().employee.get('designation') == "Designer":
            self.filters['employee'] = frappe.boot.get_bootinfo().employee.get('name')

    def get_files(self):
        fields = ['`tabFile`.name', '`tabFile`.file_name', '`tabFile`.folder', '`tabDesigner Log`.employee']
        conditions, values = frappe.db.build_conditions(self.filters)
        self.files = frappe.db.sql("""select {fields} from tabFile left join `tabDesigner Log`
        on `tabDesigner Log`.file = tabFile.name where {con} order by tabFile.job_no DESC """.format(fields=', '.join(fields), con=conditions), values)
        return self.files

    def get_missing_files(self):
        for f_obj in self.files:
            if not len(glob(get_files_path(*(f_obj[2].split('/')))+self.file_folder_joiner+self.get_file_name(f_obj[1])+'*')):
                row = [self.get_file_name(f_obj[1], True), f_obj[2], f_obj[3]]
                self.missing_files.append(row)

    @staticmethod
    def get_file_name(f_name, with_ext=False):
        if with_ext:
            return f_name.split('/')[-1]
        return '.'.join(f_name.split('/')[-1].split('.')[:-1])
