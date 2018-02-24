# Copyright (c) 2013, Mianul Islam and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _


def execute(filters=None):
    return DesignerLogSummary(filters).run()


class DesignerLogSummary:
    def __init__(self, filters):
        self.columns = [
            {
                "fieldname": "employee",
                "label": _("Designer ID"),
                "filedtype": "Link",
                "options": "Employee",
                "width": 150
            }
        ]
        self.view_col, self.group_by = '', ''
        self.filters = filters or {}
        self.doctype = "Designer Log"
        self.employees = self.get_employees()
        self.view_as = self.filters.get('view_as', 'Level')
        self.levels = sorted(self.get_level_list()) if self.view_as == "Level" else self.get_status_list()
        self.prepare_filters()
        self.get_columns()

    def run(self):
        self.get_log_data()
        data = self.rearrange_data()
        return self.columns, data, None, self.get_chart_data(data)

    def get_columns(self):
        for level in self.levels:
            self.columns.append({
                "fieldname": level,
                "label": level,
                "fieldtype": 'Int',
                "width": 90
            })

    def get_chart_data(self, data):
        rows = []
        labels = self.levels
        for d in data:
            row = []
            for l in labels:
                row.append(d.get(l, 0))
            rows.append(
                {
                    'values': row
                }
            )

        return {
            "data": {
                'labels': labels,
                'datasets': rows
            },
            "type": 'percentage'
        }

    @staticmethod
    def get_level_list():
        return [l[0] for l in frappe.get_all("Level", as_list=True, limit_page_length=0)]

    def get_status_list(self):
        return frappe.get_meta(self.doctype).get_field('status').get('options').split('\n')

    def prepare_filters(self):
        if self.filters.get('creation'):
            self.filters['creation'] = ('between', self.filters.get('creation'))
        if self.filters.get('view_as'):
            del self.filters['view_as']
        if self.view_as == "Level":
            self.view_col = 'level'
            self.group_by = 'level'
            if self.filters.get('level'):
                del self.filters['level']
        else:
            self.view_col = 'status'
            self.group_by = 'status'
            if self.filters.get('status'):
                del self.filters['status']

    def get_employees(self):
        filters = {}
        if self.filters.get('employee'):
            filters = {"name": self.filters.get('employee')}
        return frappe.get_all('Employee', filters=filters, fields=['name', 'employee_name'], as_list=True, limit_page_length=0)

    def get_log_data(self):
        conditons, values = frappe.db.build_conditions(self.filters)
        if conditons:
            conditons = ' and ' + conditons.replace('`creation` = (%(creation_0)s, %(creation_1)s)', '(`creation` between %(creation_0)s and %(creation_1)s)')

        self.log_data = frappe.db.sql(""" select employee, count({view_as}) as counted_val, {view_as} as level from `tab{doc}` where name is not NULL
  {conditons} group by employee, {group_by}""".format(doc=self.doctype, conditons=conditons, view_as=self.view_col,
                                                          group_by=self.group_by), values)

    def rearrange_data(self):
        data = {}
        for row in self.log_data:
            if not data.get(row[0]):
                data[row[0]] = {"employee": row[0]}
            data[row[0]][row[2]] = row[1]
        return data.values()
