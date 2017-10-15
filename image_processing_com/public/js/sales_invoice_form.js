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
                            show_alert({
                                message: __("Successfully Synchronise"),
                                indicator: 'green'
                            });
                        }
                    }
                });
            });
        }
    }
});