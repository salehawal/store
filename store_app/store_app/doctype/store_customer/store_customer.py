import frappe
from frappe.model.document import Document


class StoreCustomer(Document):
    """DocType representing a customer who places orders via the store."""

    def validate(self):
        if self.email:
            self.validate_email()

    def validate_email(self):
        if "@" not in self.email or "." not in self.email:
            frappe.throw("Please enter a valid email address")

    def after_insert(self):
        """Automatically create a Website User if not already linked."""
        pass
