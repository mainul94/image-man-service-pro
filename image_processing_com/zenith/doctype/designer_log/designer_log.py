# -*- coding: utf-8 -*-
# Copyright (c) 2017, Mianul Islam and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document


class DesignerLog(Document):
    def validate(self):
        self.set_missing_values()

    def set_missing_values(self):
        _file = frappe.get_doc('File', self.file)
        mapped_fields = {
            "folder": "folder",
            "file_name": "file_name",
            "thumbnail": "thumbnail_url"
        }
        for key, value in mapped_fields.iteritems():
            if (self.get(key) is None) and (_file.get(value) is not None) and (key not in self.dont_update_if_missing):
                self.set(key, _file.get(value))
        self.set('file_name', _file.get('file_name').split('/')[-1])

    def update_status(self, status):
        self.set('status', status)
        if self.status == "Wrong":
            self.set('fine', frappe.get_value('Level', self.level, 'fine'))
        self.save()
