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
        this.$header = this.frm.fields_dict.image_view.$wrapper.find('.file-heading-row');
        this.$rows = this.frm.fields_dict.image_view.$wrapper.find('.rows');
        this.$footer = this.frm.fields_dict.image_view.$wrapper.find('.file-footer');
        this.$upload = this.$footer.find('.file-upload');
        this.$download = this.$footer.find('.file-download');

        this.set_header_title();
        var images = this.frm.doc.images;
        if (images) {
            for (var i = 0; i < images.length; i++) {
                this.add_row(images[i])
            }
        }
        this.current_path = 'Home';
        this.add_multiple_upload_button();
        this.setup_dragdrop_in_child_row()
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
        var items = e.target.files;
        var opts ={confirm_is_private:0};
        var args = {
            method: "image_processing_com.uploads.new_upload"
        };
        opts.args = {
            "folder": this.current_path,
            "method": "image_processing_com.uploads.new_upload",
            "from_form":1,
            "doctype": this.frm.doc.doctype,
            "docname": this.frm.doc.name,
            "file_url": "/files/download",
            "queued": 1
        };
        opts.callback = function (atch, r) {
            console.log(atch)
            console.log(r)
        };
        // frappe.upload.multifile_upload(items, opts.args,opts);
        for (var i=0; i < items.length; i++) {
            this.read_file(items[i], opts.args, opts)
        }
    },

    setup_dragdrop_in_child_row: function(doclist) {
        var me = this;
        me.current_folder = 'Home';
        this.$rows.on('dragenter dragover', false)
			.on('drop', function (e) {
			    msgprint("Hello")
			    e.preventDefault();
                var items = e.target.files;
                console.log(items);
				/*var dataTransfer = e.originalEvent.dataTransfer;
				if (!(dataTransfer && dataTransfer.files && dataTransfer.files.length > 0)) {
					return;
				}
				e.stopPropagation();
				e.preventDefault();*/
			});
	},
    read_file: function(fileobj, args, opts) {

        var freader = new FileReader();
        freader.onload = function() {
            args.filename = fileobj.name;
            dataurl = freader.result;
            args.filedata = freader.result.split(",")[1];
            args.file_size = fileobj.size;
            // frappe.upload._upload_file(fileobj, args, opts, dataurl);
            frappe.upload.upload_to_server(fileobj, args, opts, dataurl);
        };
        freader.readAsDataURL(fileobj);
    }

});

frappe.ui.form.on('Sales Invoice', {
    onload:function (frm) {
        new mainul.customize.sales_invoice(frm);
    }
});