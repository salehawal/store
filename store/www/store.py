import json
import frappe
from frappe import _


def seed_demo_data():
    """Seed demo products, customers, and orders if the database is empty."""
    if frappe.db.count("Store Product") > 0:
        return

    # Note: inner store/ package adds an extra level: store/store/store/fixtures/
    fixtures_dir = frappe.get_app_path("store", "store", "store", "fixtures")

    # Order matters: Products first, then Customers, then Orders
    for filename in ("store_product.json", "store_customer.json", "store_order.json"):
        filepath = frappe.get_app_path("store", "store", "store", "fixtures", filename)

        with open(filepath) as f:
            records = json.load(f)

        for record in records:
            doctype = record.get("doctype")
            if not doctype:
                continue
            try:
                doc = frappe.get_doc(record)
                doc.insert(ignore_permissions=True, ignore_if_duplicate=True)
            except Exception as e:
                frappe.logger().error(f"Store: Failed to import {doctype} fixture: {e}")


def get_context(context):
    """Populate the store page context with products."""
    seed_demo_data()

    context.products = frappe.get_all(
        "Store Product",
        fields=["name", "product_name", "description", "price", "image", "stock_quantity"],
        filters={"is_available": 1},
        order_by="creation desc",
    )
    return context


@frappe.whitelist(allow_guest=True)
def place_order(customer_name, customer_email, items, phone=None, address=None):
    """Create a Store Order and Store Customer (or find existing) from the web form."""
    try:
        items = json.loads(items) if isinstance(items, str) else items

        if not customer_name or not customer_email:
            return {"status": "error", "error": _("Customer name and email are required.")}
        if not items or len(items) == 0:
            return {"status": "error", "error": _("Cart is empty.")}

        # Find or create the customer
        existing = frappe.db.get_value("Store Customer", {"email": customer_email}, "name")
        if existing:
            customer = existing
        else:
            customer_doc = frappe.get_doc({
                "doctype": "Store Customer",
                "customer_name": customer_name,
                "email": customer_email,
                "phone": phone or "",
                "address": address or "",
            })
            customer_doc.insert()
            customer = customer_doc.name

        # Build order items
        order_items = []
        total = 0.0
        for item in items:
            product_name = item.get("name") or item.get("product_name")
            qty = item.get("qty", 1)
            rate = frappe.db.get_value("Store Product", product_name, "price") or item.get("price", 0)
            amount = rate * qty
            total += amount
            order_items.append({
                "product": product_name,
                "quantity": qty,
                "rate": rate,
                "amount": amount,
            })

        # Create the order
        order_doc = frappe.get_doc({
            "doctype": "Store Order",
            "customer": customer,
            "order_date": frappe.utils.today(),
            "status": "Confirmed",
            "total_amount": total,
            "items": order_items,
        })
        order_doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {"status": "ok", "order_name": order_doc.name}

    except Exception as e:
        frappe.log_error(f"Store order creation failed: {e}", "Store")
        return {"status": "error", "error": str(e)}
