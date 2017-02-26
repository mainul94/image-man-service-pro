# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe

@frappe.whitelist()
def get_folders(doctype, filters=None, fields="name"):
    return frappe.get_all(doctype, filters=filters, fields=fields)