const set_total_qty = frm => {
    if (!frm.doc.items) {
        return
    }
    let total=0;
    frm.doc.items.forEach(function (item) {
        total += parseFloat(item.qty)
    });
    frm.set_value('total_qty', total)
};

frappe.ui.form.on('Sales Invoice Item', 'normal_rate', function (frm, cdt, cdn) {
    let item = frappe.get_doc(cdt, cdn);
    item.rate = item.normal_rate;
    frm.script_manager.trigger('rate', cdt, cdn)
});

frappe.ui.form.on("Sales Invoice", {
    refresh(frm) {
        if (!frm.doc.__islocal && frm.doc.docstatus===1) {
            frm.add_custom_button("Sync Download Folder", function () {
                frappe.call({
                    method: 'image_processing_com.utils.sales_invoice.sync_folder',
                    args:{
                        invoice: frm.doc.name,
                        folder: frm.doc.download_folder
                    },
                    freeze: true,
                    freeze_message: __("Synchronising ..."),
                    callback(data) {
                        if (!data.xhr) {
                            frappe.msgprint({
                                message: __("Your request set as background job"),
                                indicator: 'yellow'
                            }, __("Synchronise Info"));
                        }
                    }
                });
            });
        }
    },
    validate(frm) {
        set_total_qty(frm)
    },
    specification: frm => {
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Price List for Specification',
                name: frm.doc.specification
            },
            callback: r => {
                if (r['message']) {
                    frm.set_value('selling_price_list', r.message.price_list);
                    frm.set_value('currency', r.message.currency);
                }
            }
        });
    }
});