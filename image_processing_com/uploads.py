# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe


@frappe.whitelist()
def new_upload(**args):
    frappe.msgprint(str(frappe.form_dict))
    pass
