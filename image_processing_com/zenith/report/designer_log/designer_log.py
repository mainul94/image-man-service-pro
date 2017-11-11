# Copyright (c) 2013, Mianul Islam and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _

def execute(filters=None):
    columns = [
        _("Date") + ":Date:100",
        _("Job No") + ":Link/Sales Invoice:150",
        _("File") + ":Data:200",
        _("Designer ID") + ":Link/Employee:100",
        _("Designer Name") + ":Data:200",
        _("Status") + ":Data:150",
        _("Level") + ":Link/Level:100"
    ]
    return columns, get_data(filters)


def get_data(filters):
    new_filters = {}
    new_filters['tabFile`.`is_folder'] = 0
    new_filters['tabDesigner Log`.`creation'] = ('>=', filters.get('from_date'))
    if filters.get('job_no'):
        new_filters['tabDesigner Log`.`job_no'] = filters.get('job_no')
    if filters.get('employee'):
        new_filters['tabDesigner Log`.`employee'] = filters.get('employee')
    if filters.get('status'):
        new_filters['tabDesigner Log`.`status'] = filters.get('status')
    if filters.get('level'):
        new_filters['tabDesigner Log`.`level'] = filters.get('level')
    if filters.get('file'):
        new_filters['tabFile`.`file_name'] = ('like', '%'+filters.get('file')+'%')
    conditions, values = frappe.db.build_conditions(new_filters)
    conditions += ' and `tabDesigner Log`.`creation` <= %(tabDesigner Log`.`to_date)s'
    values['tabDesigner Log`.`to_date'] = filters.get('to_date')
    return frappe.db.sql("""SELECT `tabDesigner Log`.creation as date, `tabDesigner Log`.job_no, tabFile.file_name, `tabDesigner Log`.employee,
	tabEmployee.employee_name, `tabDesigner Log`.status, `tabDesigner Log`.level FROM `tabDesigner Log`
	LEFT JOIN tabEmployee ON `tabDesigner Log`.employee = tabEmployee.name
	LEFT JOIN tabFile ON `tabDesigner Log`.file = tabFile.name WHERE {}""".format(conditions), values)
