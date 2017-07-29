# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from . import __version__ as app_version

app_name = "image_processing_com"
app_title = "Image Processing Com"
app_publisher = "Mianul Islam"
app_description = "For all Image Manipulation Service Provider."
app_icon = "octicon file-media"
app_color = "royal"
app_email = "mainulkhan94@gmail.com"
app_license = "MIT"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/css/image_processing.min.css"
app_include_js = "/assets/js/image_process.min.js"

# include js, css files in header of web template
# web_include_css = "/assets/image_processing_com/css/image_processing_com.css"
# web_include_js = "/assets/image_processing_com/js/image_processing_com.js"

# Home Pages
# ----------

doctype_js = {
	"Sales Invoice": "public/js/sales_invoice_form.js"
}

#fixtures = ["Custom Field","Custom Script"]

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Website user home page (by function)
# get_website_user_home_page = "image_processing_com.utils.get_home_page"

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "image_processing_com.install.before_install"
# after_install = "image_processing_com.install.after_install"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "image_processing_com.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	"File": {
		"on_update": "image_processing_com.z_file_manager.on_update_for_file_doctype",
		"before_insert": "image_processing_com.z_file_manager.before_insert_file",
		# "on_cancel": "method",
		# "on_trash": "method"
	},
    "Sales Invoice": {
        "on_submit": "image_processing_com.utils.sales_invoice.submit_invoice",
        # "before_insert": "image_processing_com.utils.sales_invoice.test_method",
        # "validate": "image_processing_com.utils.sales_invoice.test_method"
    }
}

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"image_processing_com.tasks.all"
# 	],
# 	"daily": [
# 		"image_processing_com.tasks.daily"
# 	],
# 	"hourly": [
# 		"image_processing_com.tasks.hourly"
# 	],
# 	"weekly": [
# 		"image_processing_com.tasks.weekly"
# 	]
# 	"monthly": [
# 		"image_processing_com.tasks.monthly"
# 	]
# }

# Testing
# -------

# before_tests = "image_processing_com.install.before_tests"

# Overriding Whitelisted Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.utils.file_manager.write_file": "image_processing_com.uploads.new_upload"
# }

write_file = "image_processing_com.uploads.write_file"