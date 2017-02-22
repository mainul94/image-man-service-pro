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
            }
        }
        this.add_multiple_upload_button()
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
        var meta = frappe.get_meta('Image Child');

        for (var i= 0; i < meta.fields.length; i++) {
            if (meta.fields[i].in_list_view) {
                $input = new frappe.ui.form.make_control({
                    df: meta.fields[i],
                    parent: this.$row.$body
                });
                $input.set_label(__(meta.fields[i].label));
                $input.make_input();
                if (meta.fields[i].fieldtype == "Link") {
                    // Todo Fill link field value
                }else
                {
                    $input.set_value(row[meta.fields[i].fieldname]);
                }
                if (in_list(['Attach', 'AttachImage'], meta.fields[i].fieldtype)) {
                    $input.$wrapper.prepend('<img src="' + row[meta.fields[i].fieldname] + '">')
                }

            }
        }


    },

    add_multiple_upload_button: function() {
        var me = this;
        this.$mutiple_upload = $('<input type="file" id="file_input" webkitdirectory="" directory="">')
            .on('change', function (e) {
                me.on_change_upload(e)
            })
            .appendTo(this.$header)
    },

    on_change_upload: function (e) {
        e.preventDefault();
        var items = e.target.files;
        var args = {
            method: "image_processing_com.uploads.new_upload"
        };
        var opt = {};
        opt.callback = function (r) {
            console.log(r)
        };
        for (var i=0; i<items.length; i++) {
            frappe.upload.upload_to_server(items[i], args,opt);
        }
    }

});

frappe.ui.form.on('Sales Invoice', {
    onload:function (frm) {
        new mainul.customize.sales_invoice(frm);
    }
});