def get_list(doctype, *args, **kwargs):
    """List database query via `frappe.model.db_query`. Will also check for permissions.

    :param doctype: DocType on which query is to be made.
    :param fields: List of fields or `*`.
    :param filters: List of filters (see example).
    :param order_by: Order By e.g. `modified desc`.
    :param limit_page_start: Start results at record #. Default 0.
    :param limit_page_length: No of records in the page. Default 20.

    Example usage:

        # simple dict filter
        frappe.get_list("ToDo", fields=["name", "description"], filters = {"owner":"test@example.com"})

        # filter as a list of lists
        frappe.get_list("ToDo", fields="*", filters = [["modified", ">", "2014-01-01"]])

        # filter as a list of dicts
        frappe.get_list("ToDo", fields="*", filters = {"description": ("like", "test%")})
    """
    from image_processing_com.utils.darabase import QueryBuilder
    return QueryBuilder(doctype).execute(None, *args, **kwargs)

