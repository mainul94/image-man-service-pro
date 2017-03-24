# -*- coding: utf-8 -*-
# Copyright (c) 2015, Mianul Islam and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.utils import get_files_path

class FolderManage(Document):
	def validate(self):
		pass
		self.path = self.title

	def on_update(self):
		if not frappe.db.exists("File", self.title):
			frappe.get_doc({
				"doctype": "File",
				"is_folder": 1,
				"is_home_folder": 1,
				"file_name": self.title
			}).insert()
			# frappe.create_folder(get_files_path(self.title))