from __future__ import unicode_literals
import frappe
from frappe.core.doctype.file.file import create_new_folder

def submit_invoice(doc, method):
    folders = [doc.download_folder, doc.qc_folder, doc.upload_folder, doc.upload_backup_folder,
               doc.download_backup_folder, doc.output_folder]
    for folder in folders:
        create_new_folder(doc.name, folder)
        create_new_folder(doc.customer_job_no, folder + '/' + doc.name)


def test_method(doc, method):
    frappe.msgprint(method)