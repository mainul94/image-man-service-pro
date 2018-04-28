from __future__ import unicode_literals
import frappe
import os
import requests
import requests.exceptions
from frappe import _
from frappe.core.doctype.file.file import get_web_image, get_extension
from PIL import Image
from psd_tools import PSDImage
from rawkit.raw import Raw
from frappe.utils import get_files_path, nowtime
from frappe.utils.data import getdate, get_timestamp
from frappe.core.doctype.file.file import get_content_hash


def _thumbnail(self, set_as_thumbnail=True, width=300, height=300, suffix="small"):
    if self.file_url:
        if self.file_url.startswith("/files"):
            try:
                image, filename, extn = get_local_image(self.file_url)
            except IOError:
                return

        else:
            try:
                image, filename, extn = get_web_image(self.file_url)
            except (requests.exceptions.HTTPError, requests.exceptions.SSLError, IOError):
                return

        size = width, height
        image.thumbnail(size)
        nowDate = getdate()
        thumbnail_url = 'files/.thumbnails/' + str(nowDate.year) + '/' + str(nowDate.month) + '/{}_{}.{}'.format(int(get_timestamp(nowDate)), filename.split('/')[-1], extn)

        path = os.path.abspath(frappe.get_site_path("public", thumbnail_url.lstrip("/")))
        _dir = '/'.join(path.split("/")[:-1])
        if not os.path.exists(_dir):
            os.makedirs(_dir)
        try:
            image.save(path, 'JPEG')

            if set_as_thumbnail:
                self.db_set("thumbnail_url", thumbnail_url)

            self.db_set("thumbnail_url", thumbnail_url)
        except IOError:
            frappe.msgprint(_("Unable to write file format for {0}").format(path))
            return

        return thumbnail_url


def get_local_image(file_url):
    file_path = frappe.get_site_path("public", file_url.lstrip("/"))
    content = None

    try:
        filename, extn = file_url.rsplit(".", 1)
    except ValueError:
        # no extn
        with open(file_path, "r") as f:
            content = f.read()

        filename = file_url
        extn = None

    extn = get_extension(filename, extn, content)

    if extn == "psd":
        try:
            image = PSDImage.load(file_path).as_PIL()
            if image.mode in ('RGBA', 'LA'):
                background = Image.new(image.mode[:-1], image.size, 'white')
                background.paste(image, image.split()[-1])
                image = background
        except:
            frappe.msgprint(_("Unable to create thumbnail for {0}").format(file_url))
            raise
    else:
        if extn in ['raw', 'cr2']:
            file_path = get_generated_thumbnail_form_raw(file_path)
        try:
            image = Image.open(file_path)
        except IOError:
            frappe.msgprint(_("Unable to read file format for {0}").format(file_url))
            raise

    return image, filename, extn


def get_generated_thumbnail_form_raw(file_path):
    path = get_files_path(('tmp/' + str(nowtime()).replace(':', '').replace('.', '')+'_tmp.jpg'))
    try:
        with Raw(filename=file_path) as raw:
            raw.save_thumb(path)
    except:
        raise
    return path


def validate_file(self):
    """Validates existence of public file
    TODO: validate for private file
    """
    if (self.file_url or "").startswith("/files/"):
        if not self.file_name:
            self.file_name = self.file_url.split("/files/")[-1]
        print("**")
        if not os.path.exists(get_files_path(frappe.as_unicode(self.file_url.replace('/files/', '', 1).lstrip("/")))):
            frappe.throw(_("File {0} does not exist").format(self.file_url), IOError)


def generate_content_hash(self):
    if self.content_hash or not self.file_url:
        return

    if self.file_url.startswith("/files/"):
        try:
            with open(get_files_path(self.file_url.replace('/files/', '', 1).lstrip("/")), "r") as f:
                self.content_hash = get_content_hash(f.read())
        except IOError:
            frappe.msgprint(_("File {0} does not exist").format(self.file_url))
            raise
