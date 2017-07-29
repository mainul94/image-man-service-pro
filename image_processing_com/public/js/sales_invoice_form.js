frappe.ui.form.on('Sales Invoice Item', 'normal_rate', function (frm, cdt, cdn) {
    let item = frappe.get_doc(cdt, cdn);
    item.rate = item.normal_rate;
    frm.script_manager.trigger('rate', cdt, cdn)
});