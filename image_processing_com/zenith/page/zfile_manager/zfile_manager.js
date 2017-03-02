
frappe.provide("zfile.tree");
frappe.provide("zfile.ui");

frappe.pages['zfile_manager'].on_page_load = function(wrapper) {

    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'File Manager',
        single_column: false
    });

    var root = '';
    var root_folder = {};
    var folder_manager = route.length >=2? route[1]: null;
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
                    root_folder = r.message;
                    root = url_validate((r.message.parent_path?r.message.parent_path:'') +(r.message.path?r.message.path:''));
                }
            }
        });
    }

    frappe.model.with_doctype('File', function() {
        wrapper.ZFile = new frappe.ZfileList({
            method: 'frappe.desk.reportview.get',
            wrapper: wrapper,
            page: wrapper.page,
            no_loading: true,
            root:root,
            root_folder:root_folder
        });

        wrapper.Tree = new zfile.tree({
            page: wrapper.page,
            root:root,
            root_folder:root_folder,
            file_list: wrapper.ZFile
        })
    });

};

frappe.ZfileList = frappe.ui.Listing.extend({
    init: function(opts) {
        $.extend(this, opts);
        wrap = this;
        this.rows_html = {};
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
            this.render_header();
            this.run();
            this.render_buttons()
            this.init_select_all()
        }
    },

    get_args: function(){
        var args = {
            doctype: this.doctype,
            fields:["*"],
            filters: this.filter_list.get_filters(),
            order_by: 'name desc',
            save_list_settings: false
        };

        args.filters = args.filters.concat(this.filter_list.default_filters);

        return args;
    },

    render_header: function () {
        $(frappe.render_template('image_list_header', {}))
            .appendTo(this.wrapper.find('.list-headers'))
    },

    render_list:function(data){
        this.get_level_lists();
        for (var i = 0; i < data.length; i++) {
            this.rows_html[data[i].name] = {};
            this.rows_html[data[i].name].$wrapper = $(frappe.render_template('image_thumbnail', {data: data[i], level_lists: this.level_lists}))
                .appendTo(this.wrapper.find('.result-list'))
            this.rows_html[data[i].name].$level_wrapper = this.rows_html[data[i].name].$wrapper.find('.level_wrapper');

        }

        this.wrapper.find('.result').css('overflow', 'hidden');
    },

    get_level_lists: function () {
        var me = this;
        me.level_lists = [];
        frappe.call({
            method: "image_processing_com.zenith.doctype.level.level.get_levels",
            async: false,
            callback:function (data) {
                if (data['message']) {
                    me.level_lists = data.message
                }
            }
        })
    },

    init_select_all:function () {
        var me = this;

        $(".list-select-all").on("click", function () {
            $(me.wrapper).find('.list-delete').prop("checked", $(this).prop("checked"));
            me.toggle_actions();
        });

        $(me.wrapper).on("click", ".list-delete", function (event) {
            me.toggle_actions();

            // multi-select using shift key
            var $this = $(this);
            if (event.shiftKey && $this.prop("checked")) {
                var $end_row = $this.parents(".list-row");
                var $start_row = $end_row.prevAll(".list-row")
                    .find(".list-delete:checked").last().parents(".list-row");
                if ($start_row) {
                    $start_row.nextUntil($end_row).find(".list-delete").prop("checked", true);
                }
            }
        });

        // after delete, hide delete button
        me.toggle_actions();

    },
    get_selected_items:function () {
        var me = this;
        var selected_f_or_f = me.page.main.find(".list-delete:checked");
        if (!selected_f_or_f.length) {
            msgprint(__("Please select minimum one file or folder"));
            return
        }
        var files = jQuery.map( selected_f_or_f, function( a ) {
            return $(a).closest('.z_list_item').data('name')
        });
        return files;
    },
    download:function () {
        var files = this.get_selected_items();
        if (files) {
            frappe.call({
                method:"image_processing_com.z_file_manager.download",
                args:{
                    files:files
                },
                callback:function (data) {
                    msgprint("Hope Completely Downloaded")
                }
            })
        }
    },
    assign:function () {

    },

    f_delete:function () {

    },

    render_buttons: function(){
        var me = this;
        me.page.add_action_item("Download", function(){me.download()});
        me.page.add_action_item("Assign To", function(){me.assign()});
        me.page.add_action_item("Delete", function(){me.f_delete()});

        me.page.set_primary_action("Upload", function(){

        },"fa-plus","New Email");
    },
    toggle_actions: function () {
        var me = this;
        if (me.page.main.find(".list-delete:checked").length) {
            //show buttons
            $(me.page.actions_btn_group).show();
            $(me.page.btn_primary).hide()
        } else {
            //hide button
            $(me.page.actions_btn_group).hide();
            $(me.page.btn_primary).show()
        }
    },

    default_setup: function () {
        if (!this.root) {
            this.set_default_root()
        }
        this.set_page_title();

    },

    set_page_title:function () {
        if (this.root_folder['title']) {
            this.page.set_title(this.root_folder['title'])
        }
    }
});


zfile.tree = Class.extend({
    init:function (opts) {
        $.extend(this, opts);
        this.render_side_menu();
    },

    render_side_menu:function () {
        var me = this;
        me.page.sidebar.empty();
        this.make_tree(me.get_options())
    },

    make_tree: function(opts) {
        var me = this;
        this.opts = {};
        $.extend(this.opts, opts);
        this.opts.get_tree_root = true;
        $(me.parent).find(".tree").remove();
        this.tree = new zfile.ui.tree({
            parent: me.page.sidebar,
            label: me.root,
            args: me.args,
            method: "image_processing_com.z_file_manager.get_children",
            toolbar: me.get_toolbar(),
            get_label: me.opts.get_label,
            onrender: me.opts.onrender,
            icons:{
                "normal": "fa fa-fw fa-folder",
                "expandable": "fa fa-fw fa-folder"
            },
            onclick: function(node) { me.select_node(node) }
        });
        cur_tree = this.tree;
    },

    get_options:function () {
        var opts = {};
        var me = this;
        opts.get_label =  function(node) {
            if (typeof node !== "undefined") {
                return node.data.file_name || node.data.value;
            }
        };

        opts.click = function(node) {
            node.parent.find('.tree-node-toolbar.btn-group').hide();
            me.file_list.filter_list.clear_filters();
            me.file_list.filter_list.add_filter("File", 'folder', '=', node.data.value);
            me.file_list.run()
        };
        return opts;
    },

    get_toolbar: function() {
        var me = this;

        var toolbar = [
            {toggle_btn: true},
            /*{
             label:__(me.can_write? "Edit": "Details"),
             condition: function(node) {
             return !node.root && me.can_read;
             },
             click: function(node) {
             frappe.set_route("Form", me.doctype, node.label);
             }
             },
             {
             label:__("Add Child"),
             condition: function(node) { return me.can_create && node.expandable; },
             click: function(node) {
             me.new_node();
             },
             btnClass: "hidden-xs"
             },
             {
             label:__("Rename"),
             condition: function(node) { return !node.root && me.can_write; },
             click: function(node) {
             frappe.model.rename_doc(me.doctype, node.label, function(new_name) {
             node.tree_link.find('a').text(new_name);
             node.label = new_name;
             });
             },
             btnClass: "hidden-xs"
             },
             {
             label:__("Delete"),
             condition: function(node) { return !node.root && me.can_delete; },
             click: function(node) {
             frappe.model.delete_doc(me.doctype, node.label, function() {
             node.parent.remove();
             });
             },
             btnClass: "hidden-xs"
             }*/
        ];

        if(this.opts.toolbar && this.opts.extend_toolbar) {
            return toolbar.concat(this.opts.toolbar)
        } else if (this.opts.toolbar && !this.opts.extend_toolbar) {
            return this.opts.toolbar
        } else {
            return toolbar
        }
    },

    select_node: function(node) {
        var me = this;
        if(this.opts.click) {
            this.opts.click(node);
        }
        if(this.opts.view_template) {
            this.node_view.empty();
            $(frappe.render_template(me.opts.view_template,
                {data:node.data, doctype:me.doctype})).appendTo(this.node_view);
        }
    }
});

zfile.ui.tree = frappe.ui.Tree.extend({
    init: function(args) {
        $.extend(this, args);
        this.nodes = {};
        this.wrapper = $('<div class="tree">').appendTo(this.parent);
        this.rootnode = new zfile.ui.TreeNode({
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
            },
            icons:this.icons
        });
        this.rootnode.toggle();
    }
});

zfile.ui.TreeNode = frappe.ui.TreeNode.extend({
    init:function(args) {
        this.icons={
            "normal": "octicon octicon-primitive-dot",
            "expandable": "fa fa-fw fa-folder"
        };
        this._super(args)
    },
    make_icon: function() {
        // label with icon
        var me= this;
        var icon_html = '<i class="'+ me.icons.normal +' text-extra-muted"></i>';
        if(this.expandable) {
            icon_html = '<i class="'+ me.icons.expandable +' text-muted" style="font-size: 14px;"></i>';
        }
        $(icon_html + ' <a class="tree-label grey h6">' + this.get_label() + "</a>").
        appendTo(this.tree_link);

        this.tree_link.find('i').click(function() {
            setTimeout(function() { me.toolbar.find(".btn-expand").click(); }, 100);
        });

        this.tree_link.find('a').click(function() {
            if(!me.expanded) setTimeout(function() { me.toolbar.find(".btn-expand").click(); }, 100);
        });
    },
    addnode: function(data) {
        var $li = $('<li class="tree-node">');
        if(this.tree.drop) $li.draggable({revert:true});
        return new zfile.ui.TreeNode({
            tree: this.tree,
            parent: $li.appendTo(this.$ul),
            parent_label: this.label,
            label: data.value,
            expandable: data.expandable,
            data: data,
            icons:this.icons
        });
    }
});


function url_validate(url) {
    if (typeof url !== "string") {
        console.warn("url_validate(url) must be receive a string type value");
        return
    }
    return url.replace('//','');
}