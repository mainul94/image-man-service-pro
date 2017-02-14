/**
 * Created by mainul on 2/11/17.
 */

frappe.provide('mainul.customize.sales_invoice');

mainul.customize.sales_invoice = Class.extend({
	init: function (frm) {
		this.frm = frm;
		this.make();
    },

	make: function () {
		this.frm.fields_dict.image_view.$wrapper.append(frappe.render_template('image_view', {data: {}}));
		this.$header = this.frm.fields_dict.image_view.$wrapper.find('.grid-heading-row');
		this.$rows = this.frm.fields_dict.image_view.$wrapper.find('.rows');
		this.$footer = this.frm.fields_dict.image_view.$wrapper.find('.grid-footer');

		this.set_header_title();
		var images = this.frm.doc.images;
        if (images.length > 0) {
            for (var i = 0; i < images.length; i++) {
                this.add_row(images[i])

				console.log(i)
            }
        }
    },

	set_header_title: function (title) {
		this.$header.find('.title').html(typeof title != 'undefined'? title : __("Images"))
    },
	
	add_row: function (row) {
        if (typeof row === 'undefined') {
        	return
        }

		this.$row = $('<div>').addClass('col-sm-4').attr({
			'data-name': row.name,
			'data-idx': row.idx
		}).appendTo(this.$rows);

        this.$row.$body = $('<div>').addClass('img-thumbnail').appendTo(this.$row);
		this.$row.$body.append('<img src="/files/qus.jpg">');
    }

});

frappe.ui.form.on('Sales Invoice', {
	onload:function (frm) {
	    new mainul.customize.sales_invoice(frm);
    }
});