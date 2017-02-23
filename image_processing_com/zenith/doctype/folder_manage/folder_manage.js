// Copyright (c) 2016, Mianul Islam and contributors
// For license information, please see license.txt

frappe.ui.form.on('Folder Manage', {
	onload:function (frm) {
		frm.set_query('parent_path',function() {
			return {
				filters: [
					{"is_folder": 1}
				]
			}
        })
    },
	refresh: function(frm) {

	}
});
