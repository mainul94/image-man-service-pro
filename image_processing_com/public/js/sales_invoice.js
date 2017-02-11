/**
 * Created by mainul on 2/11/17.
 */
frappe.ui.form.on('Sales Invoice', {
	onload:function () {
	    msgprint("This message call from another app");
    }
});