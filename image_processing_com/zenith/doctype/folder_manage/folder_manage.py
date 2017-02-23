# -*- coding: utf-8 -*-
# Copyright (c) 2015, Mianul Islam and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class FolderManage(Document):
	def validate(self):
		if not self.path:
			pass
			# self.path =
