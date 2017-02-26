frappe.pages['zfile_manager'].on_page_load = function(wrapper) {

    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'File Manager',
        single_column: false
    });

    frappe.model.with_doctype('File', function() {
        wrapper.ZFile = new frappe.ZfileList({
            method: 'frappe.desk.reportview.get',
            wrapper: wrapper,
            page: wrapper.page,
            no_loading: true
        });
    });

};

frappe.ZfileList = frappe.ui.Listing.extend({
    init: function(opts) {
        $.extend(this, opts);
        wrap = this;
		this.wrapper = opts.wrapper;
		this.filters = {};
		this.page_length  = 20;
		this.start = 0;
		this.cur_page = 1;
		this.no_result_message = 'No Emails to Display';
        this.default_setup();
        if (this.root) {
            var me = this;
            // setup listing
            me.make({
                doctype: 'File',
                page: me.page,
                method: 'frappe.desk.reportview.get',
                get_args: me.get_args,
                parent: me.page.main,
                start: 0,
                show_filters: true
            });
            this.filter_list.add_filter("File", "folder", "=", this.root)//this.root);

            this.run()
        }
    },

	get_args: function(){
		var args = {
			doctype: this.doctype,
			fields:["name", "folder"],
			filters: this.filter_list.get_filters(),
			order_by: 'name desc',
			save_list_settings: false
		};

		args.filters = args.filters.concat(this.filter_list.default_filters)

		return args;
	},
    render_list:function(data){
        console.log(data)
    },

    default_setup: function () {
        if (!this.root) {
			this.set_default_root()
        }
        this.set_page_title();
        this.render_side_menu()

    },

	set_default_root:function () {
		this.root = '';
		this.root_folder = {};
        var folder_manager = route.length >=2? route[1]: null;
        var me = this;
        if (folder_manager) {
            frappe.call({
                method:"frappe.client.get",
                args:{
                    doctype: "Folder Manage",
                    name: folder_manager
                },
                async:false,
                callback: function (r) {
                    if (r["message"]) {
                        me.root_folder = r.message;
                        me.root = url_validate((r.message.parent_path?r.message.parent_path:'') +(r.message.path?r.message.path:''));
                    }
                }
            });
        }
    },

    render_side_menu:function () {
    	var me = this;
    	me.page.sidebar.empty();
		this.side_bar = new frappe.ZfileTree({
			parent: me.page.sidebar,
            label: me.root_folder["title"]? me.root_folder.title:me.root,
            drop:false,
            root:me.root
		})
    },

    set_page_title:function () {
        if (this.root_folder['title']) {
            this.page.set_title(this.root_folder['title'])
        }
    }
});


frappe.ZfileTree = frappe.ui.Tree.extend({
	init:function (args) {
		$.extend(this, args);
		this.nodes = {};
		this.wrapper = $('<div class="tree">').appendTo(this.parent);
		this.rootnode = new frappe.ui.TreeNode({
			tree: this,
			parent: this.wrapper,
			label: this.label,
			parent_label: null,
			expandable: true,
			root: true,
			data: {
				value: this.label,
				parent: this.label,
				expandable: true
			}
		});
		this.rootnode.toggle();
		this.call_child_folder()
    },

    call_child_folder:function () {
	    var me = this;
	    console.log(me.root);
        frappe.call({
            method:"image_processing_com.z_file_manager.get_folders",
            args:{
                doctype:"File",
                filters:{
                    is_folder: 1,
                    folder:me.root
                }
            },
            callback:function (data) {
                if (data['message']) {
                    for (var i = 0; i < data.message.length; i++) {
                        me.rootnode.addnode({
                            label: data.message.name,
                            drop:false,
                        })
                    }
                }
            }
        })
    }
});

function url_validate(url) {
    if (typeof url !== "string") {
        console.warn("url_validate(url) must be receive a string type value");
        return
    }
    return url.replace('//','');
}