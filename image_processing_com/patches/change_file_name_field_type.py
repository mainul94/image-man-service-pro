import frappe


def execute():
    frappe.db.sql_ddl("""ALTER TABLE tabFile MODIFY COLUMN file_name longtext""")
    frappe.db.sql_ddl("""ALTER TABLE tabFile MODIFY COLUMN folder longtext""")
    frappe.db.sql_ddl("""ALTER TABLE tabFile MODIFY COLUMN old_parent longtext""")
