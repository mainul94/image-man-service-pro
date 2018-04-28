# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from .boot import _backup_to_dropbox
import frappe.integrations.doctype.dropbox_settings.dropbox_settings
from .utils.file import _thumbnail, validate_file, generate_content_hash
from frappe.core.doctype.file.file import File

__version__ = '0.0.1'

""" Replace Methods """
File.make_thumbnail = _thumbnail
File.validate_file = validate_file
File.generate_content_hash = generate_content_hash

frappe.integrations.doctype.dropbox_settings.dropbox_settings.backup_to_dropbox = _backup_to_dropbox
