# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import frappe
from frappe.utils import get_site_path
import os
from frappe.core.doctype.file.file import create_new_folder
from frappe.utils import get_files_path


@frappe.whitelist()
def new_upload(**args):
    # path_list = frappe.form_dict.folder.split('/')
    # folder = '/'.join(path_list[:-1])
    # file_name = path_list[-1]
    # frappe.throw(str(frappe.form_dict))
    # if not frappe.db.exists('File', folder+(folder and '/' or '')+file_name):
    #     create_new_folder(file_name, folder)
    # frappe.form_dict.file_url = folder+(folder and '/' or '')+file_name
    # frappe.throw(str(frappe.form_dict))
    try:
        ret = frappe.utils.file_manager.upload()
    except frappe.DuplicateEntryError:
        # ignore pass
        ret = None
        frappe.db.rollback()

    return ret


def write_file(fname, content, content_type=None, is_private=0):
    """write file to disk with a random name (to compare)"""
    path_list=[]
    job_no = ""
    if frappe.form_dict.get('folder'):
        path_list = frappe.form_dict.folder.split('/')
        file_path = get_files_path(*path_list, is_private=is_private)
        job_no = frappe.form_dict.get('jon_no')
        if not job_no:
            if frappe.db.exists("Folder Manage", path_list[0]):
                first_folder = frappe.get_doc("Folder Manage", path_list[0])
                if first_folder.folder_type == "Designer":
                    job_no = path_list[2]
                else:
                    job_no = path_list[1]
        # create directory (if not exists)
        frappe.create_folder(file_path)
    else:
        file_path = get_files_path(is_private=is_private)
    # write the file
    frappe.msgprint(str(os.path.join(file_path.encode('utf-8'), fname.encode('utf-8'))))
    if not os.path.exists(os.path.join(file_path.encode('utf-8'), fname.encode('utf-8'))):
        with open(os.path.join(file_path.encode('utf-8'), fname.encode('utf-8')), 'w+') as f:
            f.write(content)

    path_list.append(fname)
    return {
        "file_url": get_files_path(*path_list, is_private=is_private).replace(get_files_path(is_private=is_private),
                                                                              '/files', 1),
        "folder": file_path,
        "job_no": job_no
    }


def create_missing_folder(folder_path, ignore_folder_create=False):
    """Check for folder and create if not exists"""
    if not frappe.db.exists("File", {"name": folder_path}):
        split_folder = folder_path.split('/')
        for x in range(len(split_folder)):
            if x == 0:
                continue
            else:
                file_name = split_folder[x]
                folder = '/'.join(split_folder[:x])
                if not frappe.db.exists("File", {"name": folder + '/' + file_name}):
                    if folder and file_name != folder:
                        new_folder = frappe.new_doc("File")
                        new_folder.file_name = file_name
                        new_folder.is_folder = 1
                        new_folder.folder = folder
                        new_folder.flags.ignore_folder_create = ignore_folder_create
                        new_folder.flags.ignore_folder_missing_check = True
                        new_folder.insert()
