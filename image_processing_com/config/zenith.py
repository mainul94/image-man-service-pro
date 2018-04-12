from __future__ import unicode_literals
from frappe import _


def get_data():
    return [
        {
            "label": _("Setup"),
            "icon": "fa fa-cog",
            "items": [
                {
                    "type": "doctype",
                    "name": "Sales Invoice"
                },
                {
                    "type": "doctype",
                    "name": "Folder Manage"
                },
                {
                    "type": "doctype",
                    "name": "Level"
                },
                {
                    "type": "doctype",
                    "name": "Designer Log"
                },
                {
                    "type": "doctype",
                    "name": "QC Log"
                }
            ]
        },
        {
            "label": _("Reports"),
            "icon": "fa fa-list",
            "items": [
                {
                    "type": "report",
                    "is_query_report": True,
                    "name": "Designer Log",
                    "doctype": "Designer Log"
                },
                {
                    "name": "Designer Log Summery",
                    "type": "report",
                    "is_query_report": True,
                    "label": _("Designer and Processing man Summery"),
                    "doctype": "Designer Log"
                },
                {
                    "name": "Missing Files to Local",
                    "type": "report",
                    "is_query_report": True,
                    "label": _("Missing Files in Local"),
                    "doctype": "File"
                },
                {
                    "name": "Running Job Life cycle",
                    "type": "report",
                    "is_query_report": True,
                    "label": _("Running Job Life cycle"),
                    "doctype": "Sales Invoice"
                }
            ]
        }
    ]
