# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe
import os
import zipfile
from frappe.utils import get_files_path, get_site_path
from frappe.utils import random_string
import ast

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
    file_name = '/tmp/' + random_string(16)+'/' + file_name
    path = get_files_path(*(file_name.split('/')),is_private=0)
    zipf = zipfile.ZipFile('images.zip', 'w')
    for file in files:
        doc = get_file(file)
        if doc.file_url:
            file_path = get_files_path(*(doc.file_url.replace('/files','').split('/')), is_private=doc.is_private)
            zipdir(file_path, zipf, get_files_path(is_private=doc.is_private).replace('/files', root, 1))
    zipf.close()
    path = zipf.filename
    os.path.abspath(path)
    frappe.msgprint(str(path))
    return path

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
def assign():
    """Assign file to Designer"""
    pass

@frappe.whitelist()
def delete():
    """Delete file or Folder"""
    pass

@frappe.whitelist()
def rename():
    """Rename file or Folder"""
    # ToDo Now can only file rename Folder renaime will work on next version
    pass