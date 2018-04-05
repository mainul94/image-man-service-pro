frappe.provide("zfile.ui");

const get_root_and_root_folder = () => {
    let root = '';
    let root_folder = {};
    let route = frappe.get_route();
    let folder_manager = route.length >= 2 ? route[1] : null;
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
};

frappe.pages['zfile_manager'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'File Manager',
        single_column: true
    });

    page.add_menu_item(__("Add to Desktop"), function () {
        frappe.add_to_desktop(page.title, 'File')
    });
    let root_and_folder = get_root_and_root_folder();
    frappe.model.with_doctype('File', function() {
        wrapper.ZFile = new frappe.ZfileList({
            // method: 'frappe.desk.reportview.get',
            wrapper: wrapper,
            page: wrapper.page,
            no_loading: true,
            root:root_and_folder[0],
            root_folder:root_and_folder[1]
        });
    });
};

frappe.pages['zfile_manager'].refresh = function (wrapper) {
    let root_and_folder = get_root_and_root_folder();
    let checkclassInt = setInterval (()=> {
        if (typeof wrapper.ZFile !== 'undefined'){
            if (root_and_folder[0] !== wrapper.ZFile.root){
                wrapper.ZFile.root = root_and_folder[0];
                wrapper.ZFile.root_folder = root_and_folder[1];
                wrapper.ZFile.run_manager();
            }else if (!wrapper.ZFile.runed) {
                wrapper.ZFile.run_manager();
            }
            clearInterval(checkclassInt)
        }
    })
};


frappe.ZfileList = frappe.ui.BaseList.extend({
    init: function(opts) {
        $.extend(this, opts);
        this.runed = false;
        this.rows_html = {};
        this.filters = {};
        this.page_length  = 20;
        this.start = 0;
        this.cur_page = 1;
        this.no_result_message = 'No Files to Display';
        this.default_setup();
        this.init_instruction_view();
        if (this.root) {
            const me = this;
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
        this.$instruction = new frappe.ui.Dialog(__("Job Details"));
        // language=HTML
        frappe.templates['job_instruction'] = '<strong class="text-muted"> Instruction: </strong> <div>{%= doc.instruction %}</div>\
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
                    me.$instruction.set_title(r.message.name);
                    $(me.$instruction.body).html(frappe.render_template('job_instruction', {doc: r.message}));
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
        return !!this.permissions[permission];
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
        let me = this;
        $(me.wrapper).on('change', 'select[name^="level"]', function () {
            $(this).attr('data-change', true);
            me.change_level_field()
        })
    },

    change_level_field:function () {
        let me = this;
        let values = [];
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
                }else {
                    msgprint({
                        message: __("!Sorry, unable to set level please contact with System Admin"),
                        indicator: 'red'
                    }, __("ERROR"))
                }
            }
        })
    },

    folder_open: function() {
        let me = this;
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
        let args = {
            doctype: this.doctype,
            fields: ["*"],
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
        for (let i = 0; i < data.length; i++) {
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
        let me = this;
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
        let me = this;

        $(".list-select-all").on("click", function () {
            $(me.wrapper).find('.list-delete').prop("checked", $(this).prop("checked"));
            me.toggle_actions();
        });

        $(me.wrapper).on("click", ".list-delete", function (event) {
            me.toggle_actions();

            // multi-select using shift key
            let $this = $(this);
            if (event.shiftKey && $this.prop("checked")) {
                let $end_row = $this.parents(".list-row");
                let $start_row = $end_row.prevAll(".list-row")
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
        let me = this;
        let selected_f_or_f = me.page.main.find(".list-delete:checked");
        if (!selected_f_or_f.length) {
            msgprint(__("Please select minimum one file or folder"));
            return
        }
        return jQuery.map( selected_f_or_f, function( a ) {
            let $el = $(a).closest('.z_list_item');
            if (typeof type === 'undefined' || $el.data('type')=== type) {
                return $el.data('name')
            }
        });
    },
    download:function () {
        let files = this.get_selected_items();
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
        let me = this;
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
        let me = this;
        let files = this.get_selected_items();
        if (files) {
            frappe.call({
                method:"image_processing_com.z_file_manager.delete",
                args:{
                    files:files
                },
                callback:function (data) {
                    if (data['message']) {
                        for (let i = 0; i < files.length; i++) {
                            me.page.main.find("[data-name='"+files[i]+"']").remove();
                        }
                        me.toggle_actions();
                        frappe.show_alert({message:__(data.message), indicator:'red'});
                    }
                }
            })
        }
    },

    render_buttons: function(){
        let me = this;
        this.page.clear_actions_menu();
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
        let me = this;
        me.muti_level_prompt = frappe.prompt({
            "fieldname": "level",
            "fieldtype": "Link",
            "options": "Level",
            "label": __("Level")
        },function (data) {
            me.get_selected_items();
            me.get_selected_items().forEach(function (item) {
                let $item = $('.z_list_item[data-name="' + item + '"]');
                if ($item && $item.data('type') === 'File') {
                    $item.find('select[name^="level"]').val(data.level).attr('data-change', true)
                }
            });
            me.change_level_field()
        },__("Select Level"),__("Set"));
    },

    toggle_actions: function () {
        let me = this;
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
    return String(str).substring(str.lastIndexOf('/') + 1);
}

function in_array(array, value) {
    if (array.indexOf !== undefined) {
        return array.indexOf(value) !== -1;
    }
    for (let i = 0; i < array.length; i++) {
        if (array[i] === value) {
            return true;
        }
    }
    return false;
}