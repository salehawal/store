"""
store.api.store_api
~~~~~~~~~~~~~~~~~~~
All endpoints are called via frappe.call() from the browser.
Guest-accessible methods are decorated with allow_guest=True.

Uses core ERPNext DocTypes per Core-First Architecture:
  - Item (for products)  — NOT a custom Store Product
  - Customer (for customers) — NOT a custom Store Customer
  - Sales Order (for orders) — NOT a custom Store Order
  - Item Price (for pricing)
"""

import json
import frappe
from frappe import _


# ────────────────────────────────────────────────────────────────
# HELPERS
# ────────────────────────────────────────────────────────────────

def _get_company():
    return (
        frappe.db.get_single_value("Global Defaults", "default_company")
        or frappe.db.get_value("Company", {}, "name")
    )


def _get_warehouse(company=None):
    """Return a non-group, non-disabled warehouse for the given company."""
    if not company:
        company = _get_company()
    # 1. Preferred: non-group, non-disabled warehouse for the company
    warehouse = frappe.db.get_value("Warehouse", {
        "is_group": 0, "disabled": 0, "company": company
    }, "name")
    if not warehouse:
        # 2. Fallback: any warehouse for the company
        warehouse = frappe.db.get_value("Warehouse", {"company": company}, "name")
    if not warehouse:
        # 3. Last resort: any warehouse at all
        warehouse = frappe.db.get_value("Warehouse", {}, "name")
    return warehouse


def _ensure_customer_group():
    """Return a non-group Customer Group name."""
    return frappe.db.get_value("Customer Group", {"is_group": 0}, "name") or "Individual"


def _get_item_price(item_code, price_list="Standard Selling"):
    """Return the selling price for an item, or 0."""
    price = frappe.db.get_value(
        "Item Price",
        {"item_code": item_code, "price_list": price_list, "selling": 1},
        "price_list_rate",
    )
    return price or 0


# ────────────────────────────────────────────────────────────────
# CATALOGUE
# ────────────────────────────────────────────────────────────────

@frappe.whitelist(allow_guest=True)
def get_store_settings():
    """Return public store configuration."""
    currency = frappe.db.get_single_value("Global Defaults", "default_currency") or "USD"
    return {
        "store_name": "Store",
        "store_tagline": "Browse our products and place an order online.",
        "currency": currency,
        "require_login_to_order": 0,
    }


@frappe.whitelist(allow_guest=True)
def get_categories():
    """Return Item Groups that are not groups and have items."""
    groups = frappe.get_all(
        "Item Group",
        filters={"is_group": 0},
        fields=["name", "item_group_name as category_name"],
        order_by="item_group_name asc",
    )
    return groups


@frappe.whitelist(allow_guest=True)
def get_products(category=None, search=None, page=1, page_size=20):
    """
    Return published Items with their selling prices.
    Uses core Item DocType + Item Price.
    """
    page = int(page)
    page_size = int(page_size)
    filters = {"disabled": 0, "is_sales_item": 1}

    if category:
        # Get items in this item group or its children (including the group itself)
        filters["item_group"] = category

    if search:
        filters["item_name"] = ["like", f"%{search}%"]

    items = frappe.get_all(
        "Item",
        filters=filters,
        fields=["name", "item_name", "description", "image", "item_group", "stock_uom"],
        limit_start=(page - 1) * page_size,
        limit_page_length=page_size,
        order_by="modified desc",
    )

    products = []
    for item in items:
        price = _get_item_price(item.name)
        products.append({
            "name": item.name,
            "item_name": item.item_name,
            "item_group": item.item_group or "",
            "description": item.description or "",
            "image": item.image or "",
            "price": price,
            "currency": frappe.db.get_single_value("Global Defaults", "default_currency") or "USD",
            "stock_uom": item.stock_uom or "Nos",
        })

    total = frappe.db.count("Item", filters=filters)
    return {"items": products, "total": total, "page": page, "page_size": page_size}


@frappe.whitelist(allow_guest=True)
def get_product(item_code):
    """Return a single Item with full details."""
    item = frappe.get_doc("Item", item_code)
    price = _get_item_price(item_code)
    return {
        "name": item.name,
        "item_name": item.item_name,
        "item_group": item.item_group or "",
        "description": item.description or "",
        "image": item.image or "",
        "price": price,
        "currency": frappe.db.get_single_value("Global Defaults", "default_currency") or "USD",
        "stock_uom": item.stock_uom or "Nos",
    }


# ────────────────────────────────────────────────────────────────
# CHECKOUT (Guest only)
# ────────────────────────────────────────────────────────────────

@frappe.whitelist(allow_guest=True)
def place_order(first_name, last_name, email, phone, cart_items):
    """
    Guest checkout using core ERPNext DocTypes.
    1. Creates (or finds) a Customer.
    2. Creates a Sales Order with line items.
    """
    cart_items = json.loads(cart_items) if isinstance(cart_items, str) else cart_items

    if not cart_items:
        frappe.throw(_("Cart is empty."))

    customer_name = f"{first_name} {last_name}".strip()

    # ── 1. Create or fetch Customer ──
    existing = frappe.db.get_value("Customer", {"email_id": email}, "name")
    if existing:
        customer = existing
    else:
        cg = _ensure_customer_group()
        customer_doc = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": customer_name,
            "customer_type": "Individual",
            "customer_group": cg,
            "territory": "All Territories",
            "email_id": email,
            "mobile_no": phone or "",
        })
        customer_doc.insert(ignore_permissions=True)
        customer = customer_doc.name

    # ── 2. Build and insert Sales Order ──
    company = _get_company()
    warehouse = _get_warehouse(company)
    delivery_date = frappe.utils.add_days(frappe.utils.today(), 7)

    order_items = []
    total = 0.0
    for item in cart_items:
        rate = _get_item_price(item["item_code"])
        qty = float(item.get("qty", 1))
        amount = rate * qty
        total += amount
        order_items.append({
            "item_code": item["item_code"],
            "qty": qty,
            "rate": rate,
            "amount": amount,
            "warehouse": warehouse,
            "delivery_date": delivery_date,
        })

    order_doc = frappe.get_doc({
        "doctype": "Sales Order",
        "customer": customer,
        "company": company,
        "delivery_date": delivery_date,
        "order_type": "Sales",
        "items": order_items,
    })
    order_doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"order_name": order_doc.name, "customer": customer}
