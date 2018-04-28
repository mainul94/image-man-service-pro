# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from .boot import _backup_to_dropbox
import frappe.integrations.doctype.dropbox_settings.dropbox_settings

__version__ = '0.0.1'

frappe.integrations.doctype.dropbox_settings.dropbox_settings.backup_to_dropbox = _backup_to_dropbox
