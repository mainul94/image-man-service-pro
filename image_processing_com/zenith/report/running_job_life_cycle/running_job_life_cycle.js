// Copyright (c) 2016, Mianul Islam and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Running Job Life cycle"] = {
	"filters": [
		{
			fieldname: "job_no",
			fieldtype: "Link",
			options: "Sales Invoice",
			label: __("Job No")
		}
	]
};
