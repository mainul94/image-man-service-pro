from __future__ import unicode_literals

from frappe.model.db_query import DatabaseQuery
import frappe, json
from six import string_types


class QueryBuilder(DatabaseQuery):
    def __init__(self, doctype):
        super(QueryBuilder, self).__init__(doctype)
        self.join_on = {}

    def execute(self, query=None, fields=None, filters=None, or_filters=None,
		docstatus=None, group_by=None, order_by=None, limit_start=False,
		limit_page_length=None, as_list=False, with_childnames=False, debug=False,
		ignore_permissions=False, user=None, with_comment_count=False,
		join='left join', distinct=False, start=None, page_length=None, limit=None,
		ignore_ifnull=False, save_user_settings=False, save_user_settings_fields=False,
		update=None, add_total_row=None, user_settings=None, join_on=None):
        if join_on:
            if isinstance(join_on, string_types):
                try:
                    join_on = json.loads(join_on)
                except ValueError:
                    frappe.msgprint("join_on must dictionary format")
                    join_on = {}
                except Exception as e:
                    frappe.msgprint("Unable to parse join_on. Due to {}".format(e))
                    join_on = {}
            self.join_on = join_on
        return super(QueryBuilder, self).execute(query, fields, filters, or_filters, docstatus, group_by, order_by,
                                          limit_start, limit_page_length, as_list, with_childnames, debug,
                                          ignore_permissions, user, with_comment_count, join, distinct, start,
                                          page_length, limit, ignore_ifnull, save_user_settings,
                                          save_user_settings_fields, update, add_total_row, user_settings)

    def prepare_args(self):
        args = super(QueryBuilder, self).prepare_args()
        if args.get('tables'):
            args.tables = self.tables[0]
            for child in self.tables[1:]:
                child_name = self.join_on.get(child, 'parent')
                main_name = self.join_on.get(self.tables[0], 'name')
                args.tables += " {join} {child} on ({child}.{child_name} = {main}.{main_name})".format(join=self.join,
                                               child=child, main=self.tables[0], child_name=child_name, main_name=main_name)
        return args