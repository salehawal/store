import frappe
from frappe.model.document import Document


class StoreOrderItem(Document):
    """Child table DocType for individual line items within a Store Order."""

    def validate(self):
        if self.quantity and self.rate:
            self.amount = self.quantity * self.rate
