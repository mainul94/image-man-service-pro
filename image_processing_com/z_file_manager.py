# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe

@frappe.whitelist()
def get_folders(doctype, filters=None, fields="name"):
    conditions, values = frappe.db.build_conditions({"is_folder":1})
    return frappe.db.sql("""select name as value, if(ifnull(is_folder,"")!="",1,0) as expandable from tabFile  where {}""".format(conditions),values, as_dict=True)
    return frappe.get_all(doctype, filters=filters, fields=fields)


@frappe.whitelist()
def get_children():
    # frappe.throw(str(frappe.form_dict))
    if frappe.form_dict.parent:
        return frappe.db.sql("""select
    			name as value,
    			file_name,
    			if((SELECT count(name) from tabFile where folder = value and is_folder = 1), 1, 0) as expandable
    			from `tabFile`
    			where folder=%s
    			and is_folder = 1
    			order by idx
    			""", frappe.form_dict.parent, as_dict=True)