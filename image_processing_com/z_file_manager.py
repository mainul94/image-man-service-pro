# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe
import os
import zipfile
from frappe.utils import get_files_path, get_site_path
from frappe.utils import cstr
import ast
from frappe.utils.data import now_datetime, nowtime
from frappe import _
from frappe.defaults import get_user_default
from uploads import create_missing_folder
from frappe.core.doctype.file.file import move_file as move_file_from_original_file


@frappe.whitelist()
def get_folders(doctype, filters=None, fields="name"):
    """Get List View Data"""
    conditions, values = frappe.db.build_conditions({"is_folder":1})
    return frappe.db.sql("""select name as value, if(ifnull(is_folder,"")!="",1,0) as expandable from tabFile  where {}""".format(conditions),values, as_dict=True)
    return frappe.get_all(doctype, filters=filters, fields=fields)


@frappe.whitelist()
def get_children():
    """Get Folder Children"""
    if frappe.form_dict.parent:
        return frappe.db.sql("""select name as value, file_name,
    			if((SELECT count(name) from tabFile where folder = value and is_folder = 1), 1, 0) as expandable
    			from `tabFile` where folder=%s and is_folder = 1 order by idx """, frappe.form_dict.parent,
                             as_dict=True)

def get_file(file):
    """Return File Document"""
    return frappe.get_doc("File", file)


def zipdir(path, ziph, replace=''):
    """ziph is zipfile handle"""
    path = os.path.abspath(path)
    replace = os.path.abspath(replace)
    if not os.path.exists(path):
        return
    if os.path.isfile(path):
        ziph.write(path, path.replace(replace, '', 1))
    else:
        for root, dirs, files in os.walk(path):
            for file in files:
                ziph.write(os.path.join(root, file), path.replace(replace, '', 1))


def create_zip_get_path(files, root, file_name):
    import subprocess
    file_name = cstr(now_datetime()) + cstr(file_name)

    zipf = zipfile.ZipFile(file_name, 'w')

    check_file_or_folder(files, zipf, root)

    zipf.close()
    path = get_files_path(('tmp/' + str(nowtime()).replace(':', '').replace('.', '')))
    abs_real_path = os.path.abspath(file_name)
    abs_move_path = os.path.abspath(path)
    frappe.create_folder(abs_move_path)
    abs_move_path = abs_move_path + '/' + file_name
    p = subprocess.Popen(['mv',  abs_real_path, abs_move_path],
                         stdout=subprocess.PIPE)
    p.wait()
    if not p.returncode:
        return path.replace(get_files_path(), '/files') + '/' + file_name


def check_file_or_folder(files, zipf, root):
    for file in files:
        doc = get_file(file)
        if doc.is_folder and not doc.file_url:
            check_file_or_folder(frappe.get_all("File", {"folder": doc.name}), zipf, root)
        elif doc.file_url:
            file_path = get_files_path(*(doc.file_url.replace('/files', '').split('/')), is_private=doc.is_private)
            zipdir(file_path, zipf, get_files_path(is_private=doc.is_private).replace('/files', root, 1))


@frappe.whitelist()
def download(**kwargs):
    """Down load file or Folder"""
    files = ast.literal_eval(kwargs.get('files'))
    if files:
        if len(files) == 1 and frappe.db.exists("File", files[0]) and not get_file(files[0]).is_folder:
            file = get_file(files[0])
            return {
                "type": "Single Image",
                "url": file.file_name and file.file_url.replace('#', '%23')
            }
        else:
            return {
                "type": "Zip File",
                "url": create_zip_get_path(files, kwargs.get('root', ''), kwargs.get('file_name', 'files.zip'))
            }


@frappe.whitelist()
def assign(**kwargs):
    """Assign file to Designer"""
    files = kwargs.get('files')
    if not files:
        return
    files = ast.literal_eval(files)
    root = kwargs.get('root', 'Download')

    type = kwargs.get('type', 'Assign to Designer')
    employee = kwargs.get('employee')
    if type == "Assign to QC":
        base_from_folder = root
        base_to_folder = kwargs.get('base_to_folder', get_user_default('qc_folder'))
    else:
        base_from_folder = "Download"
        base_to_folder = "Designer"
    if employee.startswith('['):
        employee = ast.literal_eval(employee)
        multiple_assign(employee, files, root, type, move=True, move_org_file=True)
    else:
        try:
            assign_to_single_emp(employee, files, root, type, base_from_folder, base_to_folder, move=True, move_org_file=True)
        except:
            frappe.msgprint(_("unable to assign '{}'".format(employee)))
            raise

    return 'Successfully Assign'


@frappe.whitelist()
def designer_action(**kwargs):
    """Done or send to Back file"""
    files = kwargs.get('files')
    employee = kwargs.get('employee')
    if not files or not employee:
        return
    files = ast.literal_eval(files)
    type = kwargs.get('type', 'Finished')
    from_root = kwargs.get('root_folder') + '/' + employee
    doctype = 'Designer Log' if from_root.startswith('Designer') else 'QC Log'
    to_root = kwargs.get('to_root')
    move_dir = kwargs.get('move_dir')
    for f_name in files:
        file = get_file(f_name)
        file.flags.ignore_file_validate = True
        job = frappe.get_doc('Sales Invoice', file.job_no) if file.job_no else None
        if type == "Back":
            if not move_dir:
                move_dir = job.download_backup_folder
            if move_dir:
                copy_file(file, from_root, move_dir, False, True, True)
                from_root = move_dir
            if not to_root:
                to_root = get_user_default('back_file_folder')
            copy_file(file, from_root, to_root, False, True, False)
        else:
            if not to_root and job and from_root.startswith('Designer'):
                to_root = job.output_folder
            if not move_dir and job and from_root.startswith('Designer'):
                move_dir = job.download_backup_folder
            if f_name:
                sql = """update `tab{doc}` left join tabFile on `tab{doc}`.file = tabFile.name 
                      set `tab{doc}`.status = '{status}',tabFile.folder = REPLACE(tabFile.folder, '{oldf}', '{newf}'),
                      tabFile.file_url = REPLACE(tabFile.file_url, '{oldf}', '{newf}'),
                       tabFile.module = @new_folder := CONCAT(@new_folder, ',', REPLACE(tabFile.folder, '{oldf}', '{newf}')),
                       tabFile.module = NULL ,
                       `tab{doc}`.status = '{status}'
                       where `tab{doc}`.employee= '{emp}' and `tabFile`.folder like '{folder}%' and status ='Assign'
                       """.format(emp=employee, folder=file.name, status=type, oldf=from_root, newf=to_root, doc=doctype)
                frappe.db.sql("set @new_folder = ''")
                frappe.db.sql(sql)
                values = frappe.db.sql("SELECT @new_folder; ")[0][0].split(',')
                unqic_val = []
                for key, val in enumerate(values):
                    if not any((s.startswith(val) and key != k and val != s) for k, s in enumerate(values)) and val not in unqic_val:
                        create_missing_folder(val, True, file.job_no)
                        unqic_val.append(val)

                del unqic_val
            if move_dir:
                from_root = file.name if file.is_folder else from_root
                move_file_from_location(move_dir, '', from_root,  'rsync --remove-source-files --force -r ', file.is_private, True)


@frappe.whitelist()
def move_folder(**kwargs):
    files = kwargs.get('files')
    files = ast.literal_eval(files)
    from_root = kwargs.get('from_root')
    to_root = kwargs.get('to_root')
    move_org_file = kwargs.get('move_org_file', False)
    if not from_root and not to_root:
        frappe.throw(_("Please from folder and to folder"))

    for f_name in files:
        file = get_file(f_name)
        file.flags.ignore_file_validate = True
        job = frappe.get_doc('Sales Invoice', file.job_no) if file.job_no else None

        if to_root == "Upload Backup" and job:
            to_root = job.upload_backup_folder

        to_dir = file.folder

        sql = """update `tabFile` set  tabFile.folder = REPLACE(tabFile.folder, '{oldf}', '{newf}'),
                              tabFile.file_url = REPLACE(tabFile.file_url, '{oldf}', '{newf}'),
                               tabFile.module = @new_folder := CONCAT(@new_folder, ',', folder),
                               tabFile.module = NULL 
                               where `tabFile`.folder like '{folder}%' and `tabFile`.folder not like '{newf}%' and is_folder != 1 """.format(folder=file.name, oldf=from_root, newf=to_root)
        frappe.db.sql("set @new_folder = ''")
        frappe.db.sql(sql)
        values = frappe.db.sql("SELECT @new_folder; ")[0][0].split(',')
        unqic_val = []
        for key, val in enumerate(values):
            if not any((s.startswith(val) and key != k and val != s) for k, s in
                       enumerate(values)) and val not in unqic_val:
                create_missing_folder(val, True, file.job_no)
                unqic_val.append(val)

        del unqic_val
        if move_org_file:
            from_dir = file.name if file.is_folder else from_root
            move_file_from_location(to_root, '', from_dir,  'rsync --remove-source-files --force -r ', file.is_private, True)


@frappe.whitelist()
def check_empty_folder_and_delete(filename):
    if frappe.db.exists('File', filename):
        file = get_file(filename)
        try:
            if file.check_folder_is_empty():
                frappe.delete_doc(file.doctype, file.name, force=True, ignore_permissions=True)
        except:
            pass

def update_design_log_status(employee, file, doc='Designer Log', status="Finished"):
    if file.is_folder:
        frappe.db.sql("""update `tabDesigner Log` left join tabFile on `tab{doc}`.file = tabFile.name set `tab{doc}`.status = '{status}'
        where `tabDesigner Log`.employee= '{emp}' and `tabFile`.folder like '{folder}%' and status ='Assign'""".format(emp=employee,
               folder=file.name, doc=doc, status=status))
    else:
        log = frappe.get_doc('Designer Log', {"file": file.name, "employee": employee})
        log.set('status', status)
        log.save()


def multiple_assign(employees, files, root, type, move=False, move_org_file=False):
    file_len = len(files)
    emp_len = len(employees)
    if emp_len >= file_len:
        for key, emp in enumerate(employees):
            if key == file_len:
                break
            try:
                assign_to(get_file(files[key]), root, type, emp, move=move, move_org_file=move_org_file)
            except:
                frappe.msgprint(_("unable to assign '{}'".format(emp)))
                raise
    else:
        counter = 0
        for key, file in enumerate(files):
            try:
                _file = get_file(file)
                assign_to(_file, root, type, employees[counter], move=move, move_org_file=move_org_file)
            except:
                frappe.msgprint(_("unable to assign '{}'".format(employees[counter])))
            counter += 1
            if counter == emp_len:
                counter = 0


def assign_to_single_emp(employee, files, root, type, base_from_folder=None, base_to_folder=None, move=False, move_org_file=False):
    for file in files:
        file = get_file(file)
        assign_to(file, root, type, employee, base_from_folder, base_to_folder, move=move, move_org_file=move_org_file)


def assign_to(file, root, type, employee, base_from_folder="Download", base_to_folder="Designer", move=False, move_org_file=False):
    if file.is_folder:
        files = frappe.get_all("File", {'folder': file.name}, 'name')
        for c_file in files:
            c_file = get_file(c_file.name)
            assign_to(c_file, root, type, employee, base_from_folder, base_to_folder, move, move_org_file)
    else:
        doc = None
        if type == "Assign to Designer":
            if not file.level:
                frappe.msgprint(_("Level not set for {}".format(file.file_name)))
                return
            doc = frappe.new_doc("Designer Log")
            doc.set('rate', frappe.db.get_value('Level', {"name": file.level}, 'rate'))
        elif type == "Assign to QC":
            doc = frappe.new_doc("QC Log")
        if doc:
            doc.set('employee', employee)
            doc.set('file', file.name)
            doc.set('level', file.level)
            doc.set('job_no', file.job_no)
            doc.set('status', 'Assign')
            doc.save(ignore_permissions=True)
            copy_file(file, base_from_folder, base_to_folder+'/'+str(employee), move=move, move_org_file=move_org_file)


def move_file(**kwargs):
    files = kwargs.get('files')
    if not files:
        return
    files = ast.literal_eval(files)
    root = kwargs.get('root')
    move_org_file = bool(kwargs.get('move_org_file', False))

    action = kwargs.get('action')
    employee = kwargs.get('employee')




def copy_file(file, base_from_folder, base_to_folder, new_entry=True, move=False, move_org_file=False):
    _file_url = file.file_url or '/files/' + file.folder or ''
    _file_folder = '/files/' + file.folder or ''
    new_dir = get_files_path(_file_folder.replace('/files/', '', 1), is_private=file.is_private).replace(base_from_folder, base_to_folder, 1)
    new_path = new_dir+'/' + file.file_name.split('/')[-1]
    if move:
        move_new_parent = new_dir.replace(get_files_path(is_private=file.is_private) + '/', '')
        create_missing_folder(move_new_parent, True, file.job_no)
        frappe.db.commit()
        # move_file([file], move_new_parent, file.folder)
        file.db_set('old_parent', file.folder, False)
        file.db_set('folder', move_new_parent, False)
        if move_org_file:
            move_file_from_location(new_dir, new_path, _file_url, 'rsync --remove-source-files --force -r ', file.is_private, True)
            file.db_set('file_url', new_path.replace(get_files_path(is_private=file.is_private), '/files'), False)
    else:
        move_file_from_location(new_dir, new_path, file.file_url, is_private=file.is_private)
        file.db_set('file_url', new_path.replace(get_files_path(is_private=file.is_private), '/files'), False)
        if new_entry:
            new_file = frappe.new_doc("File")
            new_file.set('level', file.level)
            new_file.set('job_no', file.job_no)
            new_file.set('file_url', new_path)
            new_file.set('folder', new_dir)
            new_file.save()


def move_file_from_location(new_dir, new_path, file_url, cmd='cp', is_private=False, delete_org_folder = False):
    file_url = get_files_path(file_url.replace('/files/', '', 1), is_private=is_private)
    if not new_dir.startswith(get_files_path(is_private=is_private)):
        new_dir = get_files_path(new_dir.replace('/files/', '', 1), is_private=is_private)
    if not os.path.exists(new_dir):
        os.makedirs(new_dir)
    if os.path.exists(file_url):
        import subprocess
        p = subprocess.Popen(['{} {} {}'.format(cmd, file_url.replace(" ", "\\ "), new_dir.replace(" ", "\\ "))], shell=True, stdout=subprocess.PIPE)
        p.wait()

        if p.returncode:
            frappe.msgprint(_("Sorry Unable to Assign Please contact with Admin"))
        elif delete_org_folder and not p.returncode:
            subprocess.Popen(['find {} -type d -empty -delete'.format(file_url.replace(" ", "\\ "))],
                                 shell=True, stdout=subprocess.PIPE)



def get_designer_folder():
    if frappe.db.exists("Folder Manage", "Designer"):
        return frappe.get_doc("Folder Manage", "Designer")
    else:
        doc = frappe.new_doc("Folder Manage")
        doc.set('title', "Designer")
        doc.set('folder_type', "Designer")
        doc.save()

        return doc


@frappe.whitelist()
def delete(**kwargs):
    """Delete file or Folder"""
    files = ast.literal_eval(kwargs.get('files'))
    for file in files:
        doc = get_file(file)
        if doc.is_folder:
            frappe.db.sql("""DELETE FROM tabFile WHERE folder LIKE '{0}%'""".format(file))
        doc.delete()
    return "Deleted"
@frappe.whitelist()
def rename():
    """Rename file or Folder"""
    # ToDo Now can only file rename File, Folder rename will work on next version
    pass

@frappe.whitelist()
def on_update_for_file_doctype(doc, method):
    """Create Folder on New Entry in File that type Folder"""
    if doc.is_folder and not doc.flags.get('ignore_folder_create', False):
        create_folder(get_files_path(doc.name, is_private=doc.is_private))
    elif not doc.thumbnail_url:
        doc.thumbnail_url = doc.make_thumbnail()


def create_folder(path, mode=0775, with_init=False):
    """Create a folder in the given path and add an `__init__.py` file (optional).

    :param path: Folder path.
    :param with_init: Create `__init__.py` in the new folder."""
    from frappe.utils import touch_file
    if not os.path.exists(path):
        os.makedirs(path, mode=mode)

        if with_init:
            touch_file(os.path.join(path, "__init__.py"))


@frappe.whitelist()
def before_insert_file(doc, method):
    if doc.folder and not doc.flags.get('ignore_folder_missing_check', False):
        from uploads import create_missing_folder
        create_missing_folder(doc.folder)


@frappe.whitelist()
def save_level(**kwargs):
    from json import loads
    if not kwargs.get('values'):
        frappe.throw('Value required')

    values = loads(kwargs.get('values'))
    for value in values:
        _file = get_file(value['name'])
        _file.set('level', value['val'])
        _file.save()
    return "Successfully Saves Level"
