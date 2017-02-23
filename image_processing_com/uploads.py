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

    # create directory (if not exists)
    frappe.create_folder(file_path)
    # write the file
    with open(os.path.join(file_path.encode('utf-8'), fname.encode('utf-8')), 'w+') as f:
        f.write(content)

    path_list.append(fname)
    return {
        "file_url": get_files_path(*path_list, is_private=is_private).replace(get_files_path(is_private=is_private),
                                                                              '/files', 1),
        "file_name": fname
    }
