from __future__ import unicode_literals
import frappe
import os
from frappe.utils import get_files_path
from frappe.core.doctype.file.file import create_new_folder

def submit_invoice(doc, method):
    folders = [doc.download_folder]
    for folder in folders:
        if not frappe.db.exists("File", folder+'/'+doc.name):
            create_new_folder(doc.name, folder)
            file = frappe.get_doc('File', folder+'/'+doc.name)
            file.db_set('job_no', doc.name, False)
        if not frappe.db.exists("File", folder + '/' + doc.name + '/' + doc.customer_job_no):
            create_new_folder(doc.customer_job_no, folder + '/' + doc.name)
            file = frappe.get_doc('File',  folder + '/' + doc.name + '/' + doc.customer_job_no)
            file.db_set('job_no', doc.name, False)


def test_method(doc, method):
    frappe.msgprint(method)


@frappe.whitelist()
def sync_folder(invoice, folder):
    download_path = frappe.get_value("Folder Manage", folder, 'path')

    local_folder = get_files_path(*(download_path, invoice))
    file_url_start_with = local_folder.replace(get_files_path(), '/files')
    exists_files = frappe.get_all("File", ['file_url', 'thumbnail_url'],
                                  {"file_url": ("like", file_url_start_with + '%')})
    files, thumbnails = [], []
    for _file in exists_files:
        files.append(_file.get('file_url'))
        files.append(_file.get('thumbnail_url'))
    _sync(local_folder, files, thumbnails, invoice)


def _sync(folder, exists_files, thumbnails, invoice_no):
    if os.path.exists(folder) and os.path.isdir(folder):
        for root, dirs, files in os.walk(folder):
            parent_folder = root.replace(get_files_path() + '/', '')
            if not frappe.db.exists("File", parent_folder):
                create_new_folder(parent_folder.split('/')[-1], '/'.join(parent_folder.split('/')[:-1]))
            for _file in files:
                file_url = os.path.join(root.replace(get_files_path(), '/files'), _file)
                if file_url in exists_files or file_url in thumbnails:
                    continue
                doc = frappe.new_doc("File")
                doc.set('folder', parent_folder)
                doc.set('file_url', file_url)
                doc.set('file_name', file_url.replace('/files/', ''))
                doc.set('job_no', invoice_no)
                doc.insert()
