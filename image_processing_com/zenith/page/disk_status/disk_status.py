import os
import frappe
import subprocess

from frappe.utils import get_files_path


@frappe.whitelist()
def disk_used():
    child = subprocess.Popen(['df', '-h'], stdout=subprocess.PIPE)
    output = child.communicate()[0].strip().split("\n")
    result = []
    folders = get_folders_mount_point()
    for x in output:
        splited_x = x.split()
        if not str(splited_x[0]).startswith('/dev/'):
            continue
        locations_of = [folder.name for folder in folders if folder.mount_on == ' '.join(splited_x[5:])]
        if not len(locations_of):
            continue
        result.append({
            'filesystem': splited_x[0],
            'size': splited_x[1],
            'used': splited_x[2],
            'avail': splited_x[3],
            'use_p': splited_x[4][:-1],
            'location_of': locations_of
        })
    return result


def get_folders_mount_point():
    folders = frappe.get_all('Folder Manage', fields=['name', 'mount_on'])

    for folder in folders:
        if not folder.mount_on:
            folder['mount_on'] = getmount(get_files_path(folder.name))
    return folders


def getmount(path):
    path = os.path.realpath(os.path.abspath(path))
    while path != os.path.sep:
        if os.path.ismount(path):
            return path
        path = os.path.abspath(os.path.join(path, os.pardir))
    return path
