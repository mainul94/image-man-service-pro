import json

import frappe
from frappe import _


@frappe.whitelist()
def update_log_status(names, doctype, status):
    if frappe.has_permission(doctype, "write") or any_in(frappe.get_roles(), ['Admin', 'QC', 'Processing']):
        names = json.loads(names)
        for name in names:
            doc = frappe.get_doc(doctype, name)
            doc.update_status(status)
    else:
        frappe.throw(_("Not permitted"), frappe.PermissionError)


any_in = lambda a, b: any(i in b for i in a)
