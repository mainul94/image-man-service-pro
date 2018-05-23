frappe.listview_settings['Designer Log'] = {
    onload: function (listview) {
        var method = "image_processing_com.utils.action_queries.update_log_status";

        listview.page.add_menu_item(__("Wrong"), function () {
            listview.call_for_selected_items(method, {
                "status": "Wrong",
                "doctype":listview.doctype
            });
        });
        let dialog = new frappe.ui.Dialog({
            title: __("Rename File"),
            fields: [
                {
                    fieldtype: 'Link', fieldname: 'employee', options: 'Employee', reqd: 1
                }
            ]
        });

        dialog.set_primary_action(__("Rename"), values => {
            if (values.employee) {
                listview.call_for_selected_items(method, {
                    "status": "Rename",
                    "doctype":listview.doctype,
                    "employee": values.employee
                });
                dialog.hide()
            }
        });

        listview.page.add_menu_item(__("Rename"), function () {
            dialog.show()
        });

        listview.page.add_menu_item(__("Return"), function () {
            listview.call_for_selected_items(method, {
                "status": "Return",
                "doctype":listview.doctype
            });
        });

        listview.page.add_menu_item(__("Finished"), function () {
            listview.call_for_selected_items(method, {
                "status": "Finished",
                "doctype":listview.doctype
            });
        });

        listview.page.add_menu_item(__("Cancel"), function () {
            listview.call_for_selected_items(method, {
                "status": "Cancel",
                "doctype":listview.doctype
            });
        });
    }
};