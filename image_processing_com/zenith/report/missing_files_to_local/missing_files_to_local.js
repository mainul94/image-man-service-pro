// Copyright (c) 2016, Mianul Islam and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Missing Files to Local"] = {
    "filters": [
        {
            fieldname: 'folder',
            fieldtype: 'Link',
            options: 'Folder Manage',
            label: __("From Folder"),
			reqd: true,
			get_query: function () {
            	return {
            		filters: [["Folder Manage", "folder_type", "in", ["Output", "Upload"]]]
				}
            },
			default: frappe.defaults.get_user_default('output_folder')
        },
		{
			fieldname: 'job_no',
			fieldtype: 'Link',
			options: 'Sales Invoice',
			label: __("Job No")
		}
    ]
};
