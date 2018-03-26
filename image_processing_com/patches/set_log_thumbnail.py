import frappe


def execute():
    for doc in ['Designer Log', 'QC Log']:
        docs = frappe.get_all(doc, {"thumbnail": ''})
        for d in docs:
            if d.get('name'):
                try:
                    ndoc = frappe.get_doc(doc, d.name)
                    ndoc.save()
                except:
                    pass
