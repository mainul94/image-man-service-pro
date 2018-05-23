frappe.pages['disk-status'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __('Disk Usages'),
		single_column: true
	});
    frappe.call({
        method: "image_processing_com.zenith.page.disk_status.disk_status.disk_used",
		callback: r => {
            if (r['message']) {
                r.message.forEach(row=> {
                	let folder_id = row.location_of.join('_').replace(/\s+/g, '_');
                	$(`<div class="col-xs-12" id="${folder_id}"></div>`).appendTo(page.body);
                	let args = {
						parent: `#${folder_id}`,
						title: `<strong>${row.location_of.join(', ')}</strong>`,
						subtitle: `<strong style="padding-left: 26px">${__("Total")} :</strong> ${row.size}, <strong>${__("Used")} :</strong>
${row.used}, <strong>${__("Free")} :</strong> ${row.avail}.`,
						data: {
							datasets: [
								{
									values: [parseFloat(row.use_p), 100 - parseFloat(row.use_p)]
								}
							],
							labels: ["Used", "Free"]
						},
						colors: ["red", 'light-green'],
						type: 'percentage',
					};
                    setTimeout(new Chart(args));
				});
            }
		}
	});
};