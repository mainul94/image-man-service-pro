# -*- coding: utf-8 -*-
# Copyright (c) 2015, Mianul Islam and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.defaults import set_global_default


class FolderManage(Document):
    def validate(self):
        self.path = self.title

    def on_update(self):
        if self.is_default:
            set_global_default(frappe.scrub(self.folder_type)+'_folder', self.name)
        if not frappe.db.exists("File", self.title):
            frappe.get_doc({
                "doctype": "File",
                "is_folder": 1,
                "is_home_folder": 1,
                "file_name": self.title
            }).insert()
