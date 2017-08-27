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
    if employee.startswith('['):
        employee = ast.literal_eval(employee)
        multiple_assign(employee, files, root, type)
    else:
        try:
            assign_to_single_emp(employee, files, root, type)
        except:
            frappe.msgprint(_("unable to assign '{}'".format(employee)))
            raise

    return 'Successfully Assign'


def multiple_assign(employees, files, root, type):
    file_len = len(files)
    emp_len = len(employees)
    if emp_len >= file_len:
        for key, emp in enumerate(employees):
            if key == file_len:
                break
            try:
                assign_to(get_file(files[key]), root, type, emp)
            except:
                frappe.msgprint(_("unable to assign '{}'".format(emp)))
                raise
    else:
        counter = 0
        for key, file in enumerate(files):
            try:
                _file = get_file(file)
                assign_to(_file, root, type, employees[counter])
            except:
                frappe.msgprint(_("unable to assign '{}'".format(employees[counter])))
            counter += 1
            if counter == emp_len:
                counter = 0


def assign_to_single_emp(employee, files, root, type):
    for file in files:
        file = get_file(file)
        assign_to(file, root, type, employee)


def assign_to(file, root, type, employee, base_from_folder="Download", base_to_folder="Designer"):
    if file.is_folder:
        files = frappe.get_all("File", {'folder': file.name}, 'name')
        for c_file in files:
            c_file = get_file(c_file.name)
            assign_to(c_file, root, type, employee)
    else:
        if type == "Assign to Designer":
            doc = frappe.new_doc("Designer Log")
            doc.set('employee', employee)
            doc.set('file', file.name)
            doc.set('level', file.level)
            doc.set('job_no', file.job_no)
            doc.set('rate', frappe.db.get_value('Level', {"name": file.level}, 'rate'))
            doc.set('status', 'Assign')
            doc.save()
            copy_file(file, base_from_folder, base_to_folder+'/'+str(employee), move=True)


def copy_file(file, base_from_folder, base_to_folder,new_entry=True, move=False):

    new_path = get_files_path(file.file_url, is_private=file.is_private).replace(base_from_folder, base_to_folder, 1)
    new_dir = '/'.join(new_path.split('/')[:-1])
    if move:
        new_dir = new_dir.replace('/files/', '', 1)
        from frappe.core.doctype.file.file import move_file
        from uploads import create_missing_folder
        create_missing_folder(new_dir, True)
        move_file([file], new_dir, file.folder)
    else:
        if not os.path.exists(new_dir):
            os.makedirs(new_dir)
        if not os.path.exists(new_path):
            import subprocess
            p = subprocess.Popen(['cp {} {}'.format(file.file_url, new_path)], shell=True, stdout=subprocess.PIPE)
            p.wait()

            if p.returncode:
                frappe.throw(_("Sorry Unable to Assign Please contact with Admin"))

        if new_entry:
            new_file = frappe.new_doc("File")
            new_file.set('level', file.level)
            new_file.set('job_no', file.job_no)
            new_file.set('file_url', new_path)
            new_file.set('folder', new_dir)
            new_file.save()


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
        frappe.create_folder(get_files_path(doc.name, is_private=doc.is_private))
    elif not doc.thumbnail_url:
        doc.thumbnail_url = doc.make_thumbnail()


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
