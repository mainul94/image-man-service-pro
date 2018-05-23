# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from frappe import _

def get_data():
	return [
		{
			"module_name": "Image Processing Com",
			"color": "royal",
			"icon": "octicon file-media",
			"type": "module",
			"label": _("Image Processing Com")
		},
		{
			"module_name": "Zenith",
			"color": "royal",
			"icon": "fa fa-camera",
			"type": "module",
			"label": _("Zenith")
		},
		{
			"module_name": "Disk Status",
			"color": "green",
			"icon": "octicon octicon-server",
			"type": "page",
			"link": "disk-status",
			"label": _("Disk Usages")
		}
	]
