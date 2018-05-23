frappe.pages['disk-status'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Disk Status',
		single_column: true
	});
    frappe.call({
        method: "image_processing_com.zenith.page.disk_status.disk_status.disk_used",
		callback: r => {
            if (r['message']) {
                r.message.forEach(row=> {
                	console.log(row)
				});
            }
		}
	});
};