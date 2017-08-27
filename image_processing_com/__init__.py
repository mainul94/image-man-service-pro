# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from utils.file import _thumbnail
from frappe.core.doctype.file.file import File

__version__ = '0.0.1'


""" Replace Methods """
File.make_thumbnail = _thumbnail
