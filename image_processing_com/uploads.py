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
    # write the file
    with open(os.path.join(file_path.encode('utf-8'), fname.encode('utf-8')), 'w+') as f:
        f.write(content)

    path_list.append(fname)
    return {
        "file_url": get_files_path(*path_list, is_private=is_private).replace(get_files_path(is_private=is_private),
                                                                              '/files', 1),
        "folder": file_path,
        "job_no": job_no
    }


def create_missing_folder(folder_path):
    """Check for folder and create if not exists"""
    if not frappe.db.exists("File", {"name": folder_path}):
        split_folder = folder_path.split('/')
        parent_folder = '/'.join(split_folder[:-1])
        if parent_folder:
            from frappe.core.doctype.file.file import create_new_folder
            create_new_folder(str(split_folder[-1]), parent_folder)
        else:
            frappe.get_doc({
                "doctype": "File",
                "is_folder": 1,
                "is_home_folder": 1,
                "file_name": str(split_folder[-1])
            }).insert()
        #
        # doc = frappe.new_doc("File")
        # doc.set('name', folder_path)
        # doc.set('is_folder', 1)
        # doc.set('file_name', split_folder[-1])
        # doc.set('folder', '/'.join(split_folder[:-1]))
        # doc.flags.ignore_duplicate_entry_error = True
        # doc.flags.ignore_file_validate = True
        # doc.flags.ignore_folder_validate = True
        # if not doc.folder:
        #     doc.set('is_home_folder', 1)
        #     doc.save()
        #     frappe.throw("In If")
        # else:
        #     frappe.throw("In Else")
        #     doc.save()
        #     create_missing_folder(doc.folder)
