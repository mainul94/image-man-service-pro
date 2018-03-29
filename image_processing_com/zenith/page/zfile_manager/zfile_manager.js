
frappe.provide("zfile.tree");
frappe.provide("zfile.ui");

const get_root_and_root_folder = () => {
    var root = '';
    var root_folder = {};
    let route = frappe.get_route();
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
    return [root, root_folder]
}

frappe.pages['zfile_manager'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'File Manager',
        single_column: false
    });

    page.add_menu_item(__("Add to Desktop"), function () {
        frappe.add_to_desktop(page.title, 'File')
    });
    let root_and_folder = get_root_and_root_folder()
    frappe.model.with_doctype('File', function() {
        wrapper.ZFile = new frappe.ZfileList({
            // method: 'frappe.desk.reportview.get',
            wrapper: wrapper,
            page: wrapper.page,
            no_loading: true,
            root:root_and_folder[0],
            root_folder:root_and_folder[1]
        });

        zfile.init_tree = new zfile.tree({
            page: wrapper.page,
            root:root_and_folder[0],
            root_folder:root_and_folder[1],
            file_list: wrapper.ZFile
        })
    });
};

frappe.pages['zfile_manager'].refresh = function (wrapper) {
    let root_and_folder = get_root_and_root_folder();
    let checkclassInt = setInterval (()=> {
        if (typeof wrapper.ZFile !== 'undefined'){
            if (root_and_folder[0] !== wrapper.ZFile.root){
                wrapper.ZFile.root = zfile.init_tree.root = root_and_folder[0];
                wrapper.ZFile.root_folder = zfile.init_tree.root_folder = root_and_folder[1];
                wrapper.ZFile.run_manager();
                zfile.init_tree.render_side_menu()
            }else if (!wrapper.ZFile.runed) {
                wrapper.ZFile.run_manager();
            }
            clearInterval(checkclassInt)
        }
    })
    
}


frappe.ZfileList = frappe.ui.BaseList.extend({
    init: function(opts) {
        $.extend(this, opts);
        this.runed = false;
        wrap = this;
        this.rows_html = {};
        this.filters = {};
        this.page_length  = 20;
        this.start = 0;
        this.cur_page = 1;
        this.no_result_message = 'No Files to Display';
        this.default_setup();
        this.init_instruction_view();
        if (this.root) {
            var me = this;
            // setup listing
            me.make({
                doctype: 'File',
                page: me.page,
                method: 'frappe.client.get_list',
                args: me.get_args,
                parent: me.page.main,
                // start: 0,
                show_filters: true
            });
            this.render_header();
        }
    },

    run_manager() {
        this.permissions = {};
        this.set_permissions();
        if (!this.check_permission('can_read')) {
            frappe.set_route('/')
        }
        this.set_page_title();
        this.filter_list.clear_filters();
        this.filter_list.add_filter("File", "folder", "=", this.root);
        this.run();
        this.get_all_employees();
        this.generated_multi_assign = false;
        this.render_buttons();
        this.init_select_all();
        this.folder_open();
        this.set_level_change_attr();
        this.refresh_list();
        this.runed = true
    },

    init_instruction_view() {
        this.$instruction = new frappe.ui.Dialog(__("Job Details"))
        frappe.templates['job_instruction'] = ' <strong class="text-muted"> Instruction: </strong> <div>{%= doc.instruction %}</div>\
        <hr><strong class="text-muted"> Comment:</strong> <div> {%= doc.commend %} </div>';
    },

    view_job_details(job){
        let me = this;
        frappe.call({
            method: 'image_processing_com.z_file_manager.get_job_instruction',
            args: {
                file_name: job
            },
            callback: r => {
                if (!r.xhr) {
                    me.$instruction.set_title(r.message.name)
                    $(me.$instruction.body).html(frappe.render_template('job_instruction', {doc: r.message}))
                    me.$instruction.show()
                }
            }
        })
    },

    refresh_list() {
        let me = this;
        this.page.set_secondary_action(__("Refresh"), function () {
            me.run()
        });
    },

    set_permissions(){
        if (in_array(frappe.user_roles, 'Processing')) {
            this.permissions.can_assign = true;
            this.permissions.can_read = true;
            this.permissions.can_write = true;
            this.permissions.can_delete = true;
            if (this.root_folder.folder_type === "Download") {
                this.permissions.can_set_level = true;
            }
        }
        if (in_array(frappe.user_roles, 'QC')) {
            this.permissions.can_assign = true;
            this.permissions.can_read = true;
            this.permissions.can_write = true;
        }
        if (in_array(frappe.user_roles, 'Designer')) {
            if (in_array(["Designer", "Output"], this.root_folder.folder_type)) {
                this.permissions.can_read = true;
            }
            if (in_array(["Output"], this.root_folder.folder_type)) {
                this.permissions.can_write = true;
            }
        }
    },

    check_permission(permission){
        if (this.permissions[permission]) {
            return true
        }
        else {
            return false
        }
    },

    get_all_employees(){
        let me = this;

        frappe.call({
            method: "image_processing_com.z_file_manager.get_active_employee",
            args: {
                filters: {
                    designation: "Designer"
                }
            },
            callback(data){
                if (data['message']) {
                    me.employees = data.message
                }
                else {
                    me.employees = []
                }
            },
            freeze: true
        });
    },

    set_level_change_attr: function () {
        var me = this;
        $(me.wrapper).on('change', 'select[name^="level"]', function (e) {
            $(this).attr('data-change', true);
            me.change_level_field()
        })
    },

    change_level_field:function () {
        var me = this;
        var values = [];
        $('select[data-change="true"][name^="level"]').each(function (i, el) {
            values.push({
                "name": $(el).closest('.z_list_item[data-name]').data('name'),
                "val": $(el).val()
            })
        });
        if (values.length) {
            me.save_changed_levels(values)
        }
    },

    save_changed_levels: function(values){
        frappe.call({
            method:"image_processing_com.z_file_manager.save_level",
            args:{
                "values": values
            },
            callback:function (r) {
                if (r['message']) {
                    frappe.show_alert({
                        message: r.message,
                        indicator: 'green'
                    });
                }else {can_assign
                    msgprint({
                        message: __("!Sorry, unable to set level please contact with System Admin"),
                        indicator: 'red'
                    }, __("ERROR"))
                }
            }
        })
    },

    folder_open: function() {
        var me =this;
        $(me.wrapper).on("dblclick", ".z_list_item[data-type='Folder']", function () {
            me.filter_list.clear_filters();
            me.filter_list.add_filter("File", "folder", "=", $(this).data('name'));
            me.run()
        });
        $(me.wrapper).on("click", ".z_list_item[data-type='Folder'] .view_instruction", function () {
            me.view_job_details($(this).closest('.z_list_item').data('name'));
        });
    },

    get_args: function(){
        var args = {
            doctype: this.doctype,
            fields:["*"],
            filters: this.filter_list.get_filters(),
            order_by: 'name desc',
            save_list_settings: false,
            limit_page_length: this.page_length,
            limit_start: this.start
        };

        args.filters = args.filters.concat(this.filter_list.default_filters);
        return args;
    },

    render_header: function () {
        $(frappe.render_template('image_list_header', {}))
            .appendTo(this.wrapper.find('.list-headers'));

        this.set_up_folder_action();
        this.filter_list.wrapper.find('.show_filters').addClass('hide')
    },

    set_up_folder_action() {
        let folder = this.wrapper.find('.up_folder');
        let me = this;
        folder.on('click', function () {
            let folder_parent = me.filter_list.get_filter('folder').value.split('/');
            folder_parent.pop();
            folder_parent = folder_parent.join('/');
            me.filter_list.clear_filters();
            me.filter_list.add_filter("File", "folder", "=", folder_parent);
            me.run();
        });
    },

    toggle_up_folder() {
        let folder = this.wrapper.find('.up_folder');
        if (folder && this.filter_list.get_filter('folder').value.includes('/')) {
            folder.show()
        }else {
            folder.hide()
        }

    },

    render_view:function(data){
        this.toggle_up_folder();
        this.get_level_lists();
        for (var i = 0; i < data.length; i++) {
            if (this.root_folder.folder_type === "Designer" && this.filter_list.get_filter('folder').value === this.root_folder.name && !(in_array(frappe.user_roles, 'QC') || in_array(frappe.user_roles, 'Processing'))) {
                if (data[i].name !== this.root_folder.name + '/' + frappe.boot.employee.name) {
                    continue
                }
            }
            this.rows_html[data[i].name] = {};
            this.rows_html[data[i].name].$wrapper = $(frappe.render_template('image_thumbnail', {data: data[i], level_lists: this.level_lists, can_set_level: this.check_permission('can_set_level')}))
                .appendTo(this.wrapper.find('.result-list'));
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
    get_selected_items:function (type) {
        var me = this;
        var selected_f_or_f = me.page.main.find(".list-delete:checked");
        if (!selected_f_or_f.length) {
            msgprint(__("Please select minimum one file or folder"));
            return
        }
        var files = jQuery.map( selected_f_or_f, function( a ) {
            let $el = $(a).closest('.z_list_item');
            if (typeof type === 'undefined' || $el.data('type')=== type) {
                return $el.data('name')
            }
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
                    if (data['message']) {
                        window.open(data.message.url, '_blank').focus();
                    }
                }
            })
        }
    },
    assign:function () {
        var me = this;
        frappe.prompt([
            {
                fieldname:'employee',
                fieldtype:'Link',
                options:'Employee',
                reqd: 1,
                label: __("Employee")
            }
        ], function (values) {
            me.call_assign_method({
                employee: values.employee,
                files: me.get_selected_items()
            })
        });
    },

    f_delete:function () {
        var me = this;
        var files = this.get_selected_items();
        if (files) {
            frappe.call({
                method:"image_processing_com.z_file_manager.delete",
                args:{
                    files:files
                },
                callback:function (data) {
                    if (data['message']) {
                        for (var i = 0; i < files.length; i++) {
                            me.page.main.find("[data-name='"+files[i]+"']").remove();
                        }
                        me.toggle_actions();
                        frappe.show_alert({message:__(data.message), indicator:'red'});
                        if (typeof zfile.init_tree !== 'undefined') {
                            zfile.init_tree.file_list.run()
                        }
                    }
                }
            })
        }
    },

    render_buttons: function(){
        var me = this;
        this.page.clear_actions_menu()
        // me.make_upload_field();
        // me.page.add_action_item("Download", function(){me.download()});
        if (this.check_permission('can_set_level')) {
            me.page.add_action_item("Set Level", function(){
                if (!me.muti_level_prompt) {
                    me.set_level();
                    me.muti_level_prompt.show()
                }else {
                    me.muti_level_prompt.show()
                }
            });
        }
        if (in_array(["Download"], this.root_folder.folder_type) && this.check_permission('can_assign')) {
            me.page.add_action_item("Assign To Multiple", function(){me.multiple_assign()});
            me.page.add_action_item("Assign To", function(){me.assign()});
        }
        if (this.check_permission('can_delete')) {
            me.page.add_action_item("Delete", function(){
                frappe.confirm(__("Are you sure you want to Delete"), function () {
                    me.f_delete()
                });
            });
        }
        /*if (this.check_permission('can_write')) {
            me.page.set_primary_action("Upload", function(){
                me.$upload_folder.trigger('click');
            },"fa-plus", __('Upload Folder'));
            me.page.set_secondary_action('Upload File', function() {
                me.$upload_file.trigger('click');
            }, 'fa fa-upload', __('Upload File'))
        }*/

        if (in_array(["Designer"], this.root_folder.folder_type) && in_array(frappe.user_roles, 'Designer') && this.check_permission('can_read')) {
            me.page.add_action_item("Hold", function(){
                me.hold_by_emp();
            });
        }

        if (in_array(["Designer"], this.root_folder.folder_type) && in_array(frappe.user_roles, 'Designer') && this.check_permission('can_read')) {
            me.page.add_action_item("Back", function(){
                me.back_file();
            });
        }

        if (in_array(["Designer"], this.root_folder.folder_type) && in_array(frappe.user_roles, 'Designer') && this.check_permission('can_read')) {
            me.page.add_action_item("Done", function(){
                me.done_by_designer();
            });
        }

        if (in_array(["QC"], this.root_folder.folder_type) && in_array(frappe.user_roles, 'QC') && this.check_permission('can_read')) {
            me.page.add_action_item("Done", function(){
                me.done_by_designer('Upload');
            });
        }
        if (in_array(["Upload"], this.root_folder.folder_type) && in_array(frappe.user_roles, 'Processing') && this.check_permission('can_read')) {
            me.page.add_action_item("Uploading", function(){
                me.move_folder_to('Uploading', true);
            });
        }
        if (in_array(["Uploading"], this.root_folder.folder_type) && in_array(frappe.user_roles, 'Processing') && this.check_permission('can_read')) {
            me.page.add_action_item("Upload Backup", function(){
                me.move_folder_to('Upload Backup', true);
            });
        }
        if (in_array(["Download", "Output"], this.root_folder.folder_type) && in_array(frappe.user_roles, 'QC')
        && frappe.boot['employee']) {
            me.page.add_action_item("Assign To Me", function(){me.assign_qc_himself()});
        }
        this.delete_empty_folder_btn()
    },

    delete_empty_folder_btn() {
        let me = this;
        this.page.add_action_item("Delete Enpty Folder", function(){me.delete_empty_folder()});
    },

    delete_empty_folder(){
        let me = this;
        frappe.call({
            method: 'image_processing_com.z_file_manager.check_empty_folder_and_delete',
            args: {
                folders: me.get_selected_items('Folder')
            },
            freeze: true,
            freeze_message: __("Deleting Empty Folder"),
            callback: data => {
                if(!data.xhr) {
                    if (typeof zfile.init_tree !== 'undefined') {
                        zfile.init_tree.render_side_menu()
                    }
                    me.run()
                }
            }
        })
    },

    move_folder_to(to_folder, move_org) {
        let me = this;
        if (!move_org) {

        }
        frappe.call({
            method: "image_processing_com.z_file_manager.move_folder",
            args: {
                files: me.get_selected_items("Folder"),
                from_root: me.root_folder.name,
                to_root: to_folder,
                move_org_file: move_org
            },
            callback: function(data){
                if (!data.xhr) {

                    frappe.show_alert(__("Done"))
                    // me.check_and_delete_empty_files("Done");
                }
            }
        });
    },

    assign_qc_himself() {
        this.call_assign_method({
            employee: frappe.boot['employee'].name,
            root: this.root_folder.name,
            type: "Assign to QC",
            files: this.get_selected_items()
        })
    },

    hold_by_emp() {
        console.log("Hi")
    },
    back_file() {

    },

    done_by_designer(target_folder, is_delete_org_folder) {
        let me = this;
        let employee = this.get_employee_from_folder();
        if (!employee) {
            return
        }
        if (!target_folder) {
            target_folder = 'Output'
        }
        frappe.call({
            method: 'image_processing_com.z_file_manager.designer_action',
            args: {
                type: 'Finished',
                root_folder: me.root_folder.path,
                to_root: target_folder,
                move_folder: '',
                employee: employee,
                files: me.get_selected_items(),
                is_delete_org_folder: is_delete_org_folder || ''
            },
            freeze: true,
            freeze_message: __("Updating..."),
            callback: function(data){
                if (!data.xhr) {

                    frappe.show_alert(__("Done"))
                    // me.check_and_delete_empty_files("Done");
                }
            }

        })
    },
    get_employee_from_folder() {
        let splt_val = this.filter_list.get_filter('folder').value.split('/');
        if (splt_val.length > 1) {
            return splt_val[1]
        }
        return null
    },

    multiple_assign(){
        if (!this.generated_multi_assign) {
            this.init_multiple_assign();
        }
        this.multiple_assign_employee.$dialog.show()
    },

    init_multiple_assign(){

        this.multiple_assign_employee = {};

        this.multiple_assign_employee.$dialog = new frappe.ui.Dialog({
            title: "Multiple Assign",
            fields: [
                {"fieldtype": "HTML", "label": __("Employees"), "fieldname": "employees"}
            ]
        });

        this.multiple_assign_employee.$employeeBody = $(frappe.render_template('employee_dialog', {employees: this.employees}))
            .appendTo(this.multiple_assign_employee.$dialog.fields_dict.employees.$wrapper);
        this.multiple_assign_employee.$employeeBody.on('click', '.list-group-item[data-name]', function () {
            $(this).toggleClass('active')
        });
        let me = this;
        this.multiple_assign_employee.$dialog.set_primary_action(__("Assign"), function () {
            let data = {
                employee:[],
                files:me.get_selected_items()
            };
            me.multiple_assign_employee.$employeeBody.find('.list-group-item[data-name].active').each(function (idx, el) {
                data.employee.push($(el).attr('data-name'))
            });
            me.call_assign_method(data)
        });
    },

    call_assign_method(data){
        let me = this;
        frappe.call({
            method: 'image_processing_com.z_file_manager.assign',
            args: data,
            callback: function (r) {
                if (r['message']) {
                    frappe.show_alert({
                        message: 'Successfully Assign',
                        indicator: 'green'
                    });
                    if (typeof me.multiple_assign_employee !== 'undefined') {
                        me.multiple_assign_employee.$dialog.hide();
                    }
                    me.run();
                    me.toggle_actions();
                }else {
                    msgprint({
                        message: __("!Sorry, unable to Assign please contact with System Admin"),
                        indicator: 'red'
                    }, __("ERROR"))
                }
            }
        });
    },

    set_level: function () {
        var me = this;
        me.muti_level_prompt = frappe.prompt({
            "fieldname": "level",
            "fieldtype": "Link",
            "options": "Level",
            "label": __("Level")
        },function (data) {
            me.get_selected_items();
            me.get_selected_items().forEach(function (item) {
                var $item = $('.z_list_item[data-name="'+item+'"]');
                if ($item && $item.data('type') == 'File') {
                    $item.find('select[name^="level"]').val(data.level).attr('data-change', true)
                }
            });
            me.change_level_field()
        },__("Select Level"),__("Set"));
    },

    toggle_actions: function () {
        var me = this;
        if (me.page.main.find(".list-delete:checked").length) {
            //show buttons
            $(me.page.actions_btn_group).show();
            $(me.page.btn_primary).hide();
            $(me.page.btn_secondary).hide()
        } else {
            //hide button
            $(me.page.actions_btn_group).hide();
            $(me.page.btn_primary).show();
            $(me.page.btn_secondary).show()
        }
    },

    default_setup: function () {
        if (!this.root) {
            this.set_default_root()
        }
    },

    set_page_title:function () {
        if (this.root_folder['title']) {
            this.page.set_title(this.root_folder['title'])
        }
    },

    make_upload_field: function () {
        var me = this;
        this.$upload_folder = $('<input class="hidden" type="file" id="file_input" webkitdirectory="" directory="">')
            .on('change', function (e) {
                me.on_change_upload(e)
            })
            .appendTo(me.page.main);

        this.$upload_file = $('<input class="hidden" type="file" id="file_input_file">')
            .on('change', function (e) {
                me.on_change_upload(e)
            })
            .appendTo(me.page.main);

    },
    on_change_upload: function (e) {
        var items = e.target.files;
        var opts ={confirm_is_private:0};
        opts.args = {
            "from_form":1,
            "queued": 1
        };
        opts.callback = function (attachment, error) {
            console.log(attachment);
            console.log(error)
        };
        opts.args.folder = this.filter_list.get_filter('folder').value;
        this.upload_multiple_files(items, opts.args, opts)
        // frappe.upload.multifile_upload(items, opts.args,opts);
        // for (var i=0; i < items.length; i++) {
        //     this.read_file(items[i], opts.args, opts)
        // }
    },
    upload_multiple_files: function (files /*FileData array*/, args, opts) {
        var me = this;
        var i = -1;

        // upload the first file
        upload_next();
        // subsequent files will be uploaded after
        // upload_complete event is fired for the previous file
        $(document).on('upload_complete', on_upload);

        function upload_next() {
            i += 1;
            var file = files[i];
            args.is_private = 0;
            args.file_url = me.filter_list.get_filter('folder').value + '/' + (file.webkitRelativePath.length > 0? file.webkitRelativePath : file.name);
            file.file_url = args.file_url;
            args.folder = args.file_url.replace('/' + file.name, '');
            args.filename = file.name;
            delete args.file_url;
            frappe.upload.upload_file(file, args, opts);
            frappe.show_progress(__('Uploading'), i+1, files.length);
        }

        function on_upload(e, attachment) {
            if (i === files.length - 1) {
                $(document).off('upload_complete', on_upload);
                frappe.hide_progress();
                me.run();
                return;
            }
            upload_next();
        }
    },
    read_file: function(fileobj, args, opts) {
        var me = this;
        var freader = new FileReader();
        freader.onload = function() {
            args.file_url = me.filter_list.get_filter('folder').value + '/' + (fileobj.webkitRelativePath.length > 0? fileobj.webkitRelativePath : fileobj.name);
            args.folder = args.file_url.replace('/' + fileobj.name, '');
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
        this._super(args);
        if (args.tree.label === "Designer" && args.tree.label !== args.data.value && !(in_array(frappe.user_roles, 'QC') || in_array(frappe.user_roles, 'Processing'))) {
            let val_split = args.data.value.split('/');
            if (args.data.value !== args.tree.label + '/' + frappe.boot.employee.name && val_split.length === 2) {
                $(this.parent).addClass('hide')
            }
        }
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

//Get file base name
function get_base_name(str) {
    return new String(str).substring(str.lastIndexOf('/') + 1);
}

function in_array(array, value) {
    if (array.indexOf != undefined) {
        return array.indexOf(value) != -1;
    }
    for (var i = 0; i < array.length; i++) {
        if (array[i] == value) {
            return true;
        }
    }
    return false;
}