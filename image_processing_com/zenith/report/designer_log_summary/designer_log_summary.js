// Copyright (c) 2016, Mianul Islam and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Designer Log Summary"] = {
	"filters": [
		{
			fieldname: "owner",
			fieldtype: "Link",
			options: "User",
			label: __("Processing Man")
		},
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
			label: __("Level"),
			hidden: true
		},
		{
			fieldname: 'view_as',
			fieldtype: 'Select',
            options: "Level\nStatus",
			label: __("View As"),
			default: "Level",
			change: () => {
				let value = frappe.query_report_filters_by_name["view_as"].value;
				if (value==="Level") {
					frappe.query_report_filters_by_name["level"].$wrapper.addClass('hide-control');
					frappe.query_report_filters_by_name["status"].$wrapper.removeClass('hide-control')
                }else {
					frappe.query_report_filters_by_name["level"].$wrapper.removeClass('hide-control');
					frappe.query_report_filters_by_name["status"].$wrapper.addClass('hide-control')
				}
				frappe.query_report.refresh()
			}
		}
	]
};
