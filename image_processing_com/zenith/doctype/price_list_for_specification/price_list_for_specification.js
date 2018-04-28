// Copyright (c) 2018, Mianul Islam and contributors
// For license information, please see license.txt

frappe.ui.form.on('Price List for Specification', {
	setup: frm => {
        frappe.call({
            method: 'image_processing_com.utils.sales_invoice.get_specification',
            callback: data => {
                if (data['message']) {
                    frm.set_df_property('specification', 'options', data['message']);
                }
            }
        });
    },
	refresh: function(frm) {

	}
});
