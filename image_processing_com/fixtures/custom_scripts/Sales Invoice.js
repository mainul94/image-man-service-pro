/**
 * Created by mainul on 3/20/17.
 */
// calculate sales incentive
frappe.ui.form.on("Sales Invoice", {
    onload:function (frm) {
        frm.price_view = true;
        frm.complex_price_view = true;
        if (in_list(roles, 'Designer') || in_list(roles, 'QC')) {
            frm.price_view = false;
            frm.complex_price_view = false
        }else if (in_list(roles, 'Processing')) {
            frm.complex_price_view = true
        }
    }
});