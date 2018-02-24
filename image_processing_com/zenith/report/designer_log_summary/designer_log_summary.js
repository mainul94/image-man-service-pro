// Copyright (c) 2016, Mianul Islam and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Designer Log Summary"] = {
	"filters": [
		{
			fieldname: "job_no",
			fieldtype: "Link",
			options: "Sales Invoice",
			label: __("Job No")
		},
		{
			fieldname: 'creation',
			fieldtype: 'DateRange',
			label: __("Date"),
		},
		{
			fieldname: 'employee',
			fieldtype: 'Link',
			options: 'Employee',
			label: __("Designer")
		},
		{
			fieldname: 'status',
			fieldtype: 'Select',
            options: "\nAssign\nHold\nFinished\nRename\nBack File\nReturn\nWrong",
			label: __("Status")
		},
		{
			fieldname: 'level',
			fieldtype: 'Link',
            options: "Level",
			label: __("Level")
		},
		{
			fieldname: 'view_as',
			fieldtype: 'Select',
            options: "Level\nStatus",
			label: __("View As"),
			default: "Level"
		}
	]
};
