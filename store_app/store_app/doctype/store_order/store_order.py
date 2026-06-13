import frappe
from frappe.model.document import Document
from frappe.utils import today


class StoreOrder(Document):
    """DocType representing a customer order placed through the online store."""

    def validate(self):
        self.calculate_totals()
        self.validate_stock()
        self.set_customer_details()

    def before_submit(self):
        self.status = "Confirmed"
        self.reduce_stock()

    def before_cancel(self):
        self.restore_stock()
        self.status = "Cancelled"

    def set_customer_details(self):
        """Fetch customer name and email from linked customer."""
        if self.customer:
            customer = frappe.get_doc("Store Customer", self.customer)
            self.customer_name = customer.customer_name
            self.customer_email = customer.email

    def calculate_totals(self):
        """Calculate total amount from order items."""
        total = 0
        for item in self.get("items", []):
            if item.quantity and item.rate:
                item.amount = item.quantity * item.rate
                total += item.amount
        self.total_amount = total

    def validate_stock(self):
        """Ensure sufficient stock is available for each item."""
        for item in self.get("items", []):
            product = frappe.get_doc("Store Product", item.product)
            if product.stock_quantity < item.quantity:
                frappe.throw(
                    f"Insufficient stock for {product.product_name}. "
                    f"Available: {product.stock_quantity}, Requested: {item.quantity}"
                )

    def reduce_stock(self):
        """Reduce product stock when order is confirmed."""
        for item in self.get("items", []):
            product = frappe.get_doc("Store Product", item.product)
            product.stock_quantity -= item.quantity
            product.save()

    def restore_stock(self):
        """Restore product stock when order is cancelled."""
        for item in self.get("items", []):
            product = frappe.get_doc("Store Product", item.product)
            product.stock_quantity += item.quantity
            product.save()

    def on_payment_received(self):
        """Mark order as confirmed when payment is received."""
        if self.status == "Draft":
            self.status = "Confirmed"
            self.reduce_stock()
            self.save()


@frappe.whitelist(allow_guest=True)
def place_order(items, customer_name, email, phone=None, address=None, notes=None):
    """API endpoint to place an order from the online store.

    Args:
        items: JSON string of list of dicts with 'product' and 'quantity'
        customer_name: Customer's full name
        email: Customer's email address
        phone: Optional phone number
        address: Optional shipping address
        notes: Optional order notes

    Returns:
        dict with 'name' (order ID), 'total_amount', and 'status'
    """
    import json

    if isinstance(items, str):
        items = json.loads(items)

    if not items:
        frappe.throw("At least one item is required to place an order")

    # Find or create customer
    customer = find_or_create_customer(customer_name, email, phone, address)

    # Create the order
    order = frappe.get_doc({"doctype": "Store Order", "customer": customer.name, "order_date": today(), "shipping_address": address, "notes": notes, "status": "Draft", "items": []})

    for item_data in items:
        product = frappe.get_doc("Store Product", item_data.get("product"))
        qty = int(item_data.get("quantity", 1))

        order.append(
            "items",
            {
                "product": product.name,
                "product_name": product.product_name,
                "quantity": qty,
                "rate": product.price,
                "amount": qty * product.price,
            },
        )

    order.insert(ignore_permissions=True)
    order.submit()

    return {"name": order.name, "total_amount": order.total_amount, "status": order.status}


@frappe.whitelist(allow_guest=True)
def get_products(category=None):
    """API endpoint to fetch available products."""
    filters = {"is_available": 1}
    if category:
        filters["category"] = category

    products = frappe.get_all(
        "Store Product",
        filters=filters,
        fields=["name", "product_name", "price", "description", "image", "stock_quantity", "category"],
        order_by="product_name asc",
    )
    return products


@frappe.whitelist(allow_guest=True)
def get_categories():
    """API endpoint to fetch distinct product categories."""
    categories = frappe.db.sql(
        "SELECT DISTINCT category FROM `tabStore Product` WHERE is_available = 1 AND category IS NOT NULL AND category != '' ORDER BY category",
        as_dict=True,
    )
    return [c["category"] for c in categories]


def find_or_create_customer(customer_name, email, phone=None, address=None):
    """Find existing customer by email or create a new one."""
    customers = frappe.get_all("Store Customer", filters={"email": email}, limit=1)
    if customers:
        customer = frappe.get_doc("Store Customer", customers[0])
        # Update details if provided
        if phone:
            customer.phone = phone
        if address:
            customer.address = address
        customer.save(ignore_permissions=True)
        return customer

    customer = frappe.get_doc(
        {
            "doctype": "Store Customer",
            "customer_name": customer_name,
            "email": email,
            "phone": phone or "",
            "address": address or "",
        }
    )
    customer.insert(ignore_permissions=True)
    return customer


@frappe.whitelist(allow_guest=True)
def get_order(order_name):
    """API endpoint to fetch a specific order by name."""
    order = frappe.get_doc("Store Order", order_name)
    order_data = {
        "name": order.name,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "order_date": str(order.order_date),
        "status": order.status,
        "total_amount": order.total_amount,
        "shipping_address": order.shipping_address,
        "notes": order.notes,
        "items": [
            {
                "product": item.product,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "rate": item.rate,
                "amount": item.amount,
            }
            for item in order.items
        ],
    }
    return order_data


@frappe.whitelist(allow_guest=True)
def get_customer_orders(email):
    """API endpoint to fetch all orders for a customer by email."""
    customers = frappe.get_all("Store Customer", filters={"email": email}, limit=1)
    if not customers:
        return []

    orders = frappe.get_all(
        "Store Order",
        filters={"customer": customers[0].name},
        fields=["name", "order_date", "status", "total_amount"],
        order_by="creation desc",
    )

    for order in orders:
        order.order_date = str(order.order_date)

    return orders
