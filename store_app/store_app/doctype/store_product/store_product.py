import frappe
from frappe.model.document import Document


class StoreProduct(Document):
    """DocType representing a product available for purchase in the store."""

    def validate(self):
        if self.stock_quantity < 0:
            self.stock_quantity = 0
        if self.price < 0:
            frappe.throw("Price cannot be negative")
        self.is_available = 1 if self.stock_quantity > 0 else 0
