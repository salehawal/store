"""
store.api
~~~~~~~~~
All endpoints are called via frappe.call() from the browser.
Guest-accessible methods are decorated with allow_guest=True.

These bridge the new target-repo storefront JS with the current
Store Product / Store Customer / Store Order doctypes.
"""

import json
import frappe
from frappe import _


# ──────────────────────────────────────────────────────────────────
# CATALOGUE
# ──────────────────────────────────────────────────────────────────

@frappe.whitelist(allow_guest=True)
def get_store_settings():
    """Return public store configuration."""
    return {
        "store_name": "Store",
        "store_tagline": "Browse our products and place an order online.",
        "currency": "USD",
        "require_login_to_order": 0,
    }


@frappe.whitelist(allow_guest=True)
def get_categories():
    """Return all active store categories (currently none — reserved for future)."""
    return []


@frappe.whitelist(allow_guest=True)
def get_products(category=None, search=None, page=1, page_size=20):
    """
    Return published Store Product records.
    category is unused (reserved for future category support).
    """
    page = int(page)
    page_size = int(page_size)
    filters = {"is_available": 1}

    if search:
        filters["product_name"] = ["like", f"%{search}%"]

    products = frappe.get_all(
        "Store Product",
        filters=filters,
        fields=["name", "product_name", "description", "price", "image", "stock_quantity"],
        limit_start=(page - 1) * page_size,
        limit_page_length=page_size,
        order_by="creation desc",
    )

    items = [
        {
            "name": p.name,
            "item_name": p.product_name,
            "item_group": "",
            "description": p.description or "",
            "image": p.image or "",
            "price": p.price or 0,
            "currency": "USD",
        }
        for p in products
    ]

    total = frappe.db.count("Store Product", filters=filters)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@frappe.whitelist(allow_guest=True)
def get_product(item_code):
    """Return a single Store Product with full details."""
    p = frappe.get_doc("Store Product", item_code)
    return {
        "name": p.name,
        "item_name": p.product_name,
        "item_group": "",
        "description": p.description or "",
        "image": p.image or "",
        "price": p.price or 0,
        "currency": "USD",
        "stock_uom": "Nos",
    }


# ──────────────────────────────────────────────────────────────────
# CHECKOUT (Guest only – no user registration/login)
# ──────────────────────────────────────────────────────────────────

@frappe.whitelist(allow_guest=True)
def register_and_place_order(first_name, last_name, email, phone, password, cart_items):
    """
    Guest checkout.
    1. Creates (or finds) a Store Customer.
    2. Places a Store Order.
    The `password` field is accepted for API compatibility but not used.
    """
    cart_items = json.loads(cart_items) if isinstance(cart_items, str) else cart_items

    if not cart_items:
        frappe.throw(_("Cart is empty."))

    customer_name = f"{first_name} {last_name}".strip()

    # ── 1. Create or fetch Store Customer ──
    existing = frappe.db.get_value("Store Customer", {"email": email}, "name")
    if existing:
        customer = existing
    else:
        customer_doc = frappe.get_doc({
            "doctype": "Store Customer",
            "customer_name": customer_name,
            "email": email,
            "phone": phone or "",
        })
        customer_doc.insert(ignore_permissions=True)
        customer = customer_doc.name

    # ── 2. Build and insert Store Order ──
    order_items = []
    total = 0.0
    for item in cart_items:
        rate = frappe.db.get_value("Store Product", item["item_code"], "price") or 0
        qty = item.get("qty", 1)
        amount = rate * qty
        total += amount
        order_items.append({
            "product": item["item_code"],
            "quantity": qty,
            "rate": rate,
            "amount": amount,
        })

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

    return {"order_name": order_doc.name, "customer": customer}


@frappe.whitelist(allow_guest=True)
def login_and_place_order(email, password, cart_items):
    """Returning customer checkout — falls through to guest checkout."""
    # Delegate to guest checkout
    return register_and_place_order(
        first_name="",
        last_name=email.partition("@")[0] if email else "Customer",
        email=email,
        phone="",
        password=password,
        cart_items=cart_items,
    )
