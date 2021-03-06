# -*- coding: utf-8 -*-
# Copyright (c) 2015, Mianul Islam and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class Level(Document):
	pass


@frappe.whitelist()
def get_levels():
	return frappe.get_all("Level")