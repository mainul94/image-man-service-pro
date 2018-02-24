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
			"module_name": "Designer Log Summery",
			"color": "royal",
			"icon": "fa fa-list-o",
			"type": "query-report",
			"is_query_report": True,
			"label": _("Designer and Processing man Summery")
		}
	]
