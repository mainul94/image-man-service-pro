frappe.pages['action-on-log'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Change Status',
		single_column: true
	});
	page.doctype = page.add_select(__("Log"), ['Designer Log', 'QC Log'])
	page.ListViewWrapper = $('<div>').appendTo(page.body)
	$.extend(frappe.boot.user.all_read, ['Designer Log', 'QC Log'])
	// page.doctype.on('change', function(e){
	// 	frappe.model.with_doctype (page.doctype.val(), function (){
	// 		wrapper.page.ListView = new frappe.views.ListView({
	// 			page: page,
	// 			parent: wrapper,
	// 			doctype: page.doctype.val()
	// 		});
	// 	})
	// })
}