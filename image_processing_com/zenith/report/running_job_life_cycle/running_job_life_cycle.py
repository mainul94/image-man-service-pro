# Copyright (c) 2013, Mianul Islam and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe


def execute(filters=None):
	folders = get_folders()
	return get_columns(folders), get_data(folders, filters)


def get_columns(folder_list):
	columns = [
		"Job ID:Link/Sales Invoice:100",
		"Cust Job ID:Data:150",
		"Qty:Int:80",
	]
	for folder in folder_list:
		columns.append("{}:Int:100".format(folder))
	columns.append("Total in Hand:Int:80")
	return columns


def get_folders():
	return [f[0] for f in frappe.get_all("Folder Manage", as_list=True, order_by='sort_value asc')]


def get_data(folders, filters):
	conditions = 'tabFile.is_folder = 0 and `tabSales Invoice`.is_finished = 0 and `tabSales Invoice`.docstatus = 1' \
				 ' and `tabSales Invoice`.name is not null'
	if filters.get('job_no'):
		conditions += " and tabFile.job_no = '{}'".format(filters.get('job_no'))

	files = frappe.db.sql("""select `tabSales Invoice`.name, `tabSales Invoice`.customer_job_no, `tabSales Invoice`.total_qty, count(*), tabFile.folder as folder_qty from tabFile
left join `tabSales Invoice` on `tabSales Invoice`.name = tabFile.job_no where {con}
 group by job_no, folder order by `tabSales Invoice`.name desc""".format(con=conditions))
	rows = {}
	folder_index = 4
	added_index = 3
	for _file in files:
		base_folder = _file[folder_index].split('/')[0]
		if base_folder not in folders:
			continue
		if rows.get(_file[0]):
			row = rows.get(_file[0])
		else:
			rows[_file[0]] = row = [_file[0], _file[1], _file[2]]
			for x in folders:
				row.append(0)
		row[folders.index(base_folder)+added_index] += _file[3]
	new_rows = []
	keys = rows.keys()
	keys.sort(reverse=True)
	for idx in keys:
		row = rows[idx]
		row.append(sum(row[added_index:]))
		new_rows.append(row)
	return new_rows
