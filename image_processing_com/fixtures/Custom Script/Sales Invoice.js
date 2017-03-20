/**
 * Created by mainul on 3/20/17.
 */
// calculate sales incentive
frappe.ui.form.on("Sales Invoice", {
    validate: function(frm) {
        msgprint("This is a simple message from CUstom Scriopt");
        // calculate incentives for each person on the deal
        total_incentive = 0;
        $.each(frm.doc.sales_team, function(i, d) {

            // calculate incentive
            var incentive_percent = 2;
            if(frm.doc.base_grand_total > 400) incentive_percent = 4;

            // actual incentive
            d.incentives = flt(frm.doc.base_grand_total) * incentive_percent / 100;
            total_incentive += flt(d.incentives)
        });

        frm.doc.total_incentive = total_incentive;
    }
});

