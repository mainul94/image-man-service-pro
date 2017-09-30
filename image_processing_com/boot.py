from __future__ import unicode_literals
import frappe
import os

from frappe.integrations.doctype.dropbox_settings.dropbox_settings import (get_dropbox_settings, generate_oauth2_access_token_from_oauth1_token,
                                                                           set_dropbox_access_token, dropbox, new_backup, upload_file_to_dropbox, get_backups_path)


def boot_session(bootinfo):
    bootinfo.employee = frappe.db.get_value("Employee", {"user_id": bootinfo.user.name}, '*')


def _backup_to_dropbox():
    if not frappe.db:
        frappe.connect()

    # upload database
    dropbox_settings = get_dropbox_settings()

    if not dropbox_settings['access_token']:
        access_token = generate_oauth2_access_token_from_oauth1_token(dropbox_settings)

        if not access_token.get('oauth2_token'):
            return 'Failed backup upload', 'No Access Token exists! Please generate the access token for Dropbox.'

        dropbox_settings['access_token'] = access_token['oauth2_token']
        set_dropbox_access_token(access_token['oauth2_token'])

    dropbox_client = dropbox.Dropbox(dropbox_settings['access_token'])
    backup = new_backup(ignore_files=True)
    filename = os.path.join(get_backups_path(), os.path.basename(backup.backup_path_db))
    upload_file_to_dropbox(filename, "/database", dropbox_client)

    frappe.db.close()

    # upload files to files folder
    return [], list(set([]))
