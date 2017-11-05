// Copyright (c) 2016, Mianul Islam and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Designer Log"] = {
	"filters": [
		{
			fieldname: "job_no",
			fieldtype: "Link",
			options: "Sales Invoice",
			label: __("Job No")
		},
		{
			fieldname: 'from_date',
			fieldtype: 'Datetime',
			label: __("From"),
			reqd: true,
			default: frappe.datetime.month_start()
		},
		{
			fieldname: 'to_date',
			fieldtype: 'Datetime',
			label: __("To"),
			reqd: true,
			default: frappe.datetime.month_end()
		},
		{
			fieldname: 'employee',
			fieldtype: 'Link',
			options: 'Employee',
			label: __("Designer")
		},
		{
			fieldname: 'file',
			fieldtype: 'Data',
			label: __("File Name")
		},
		{
			fieldname: 'status',
			fieldtype: 'Select',
            options: "\nAssign\nHold\nFinished\nRename\nBack File\nReturn\nWrong",
			label: __("Status")
		}
	]
};
