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
                	$(`<div class="col-sm-3" id="${folder_id}"></div>`).appendTo(page.body);
                	let args = {
						parent: `#${folder_id}`,
						title: row.location_of.join(', '),
						subtitle: `<strong>${__("Total")} :</strong> ${row.size}<br>
						<strong>${__("Used")} :</strong> ${row.used}<br>
						<strong>${__("Free")} :</strong> ${row.avail}<br>`,
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
						height: 140
					};
                    setTimeout(new Chart(args));
				});
            }
		}
	});
};