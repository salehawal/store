"""
after_install.py — runs once when the app is installed on a site.

Seeds demo data using core ERPNext DocTypes:
  - Item groups (categories) for products
  - Items (products) with realistic names, prices, and images
  - Customers (demo buyers)

Rules:
  1. Hardcode the app name — never call frappe.get_hooks() during install context.
  2. Wrap every section in its own try/except via _run().
  3. Download a real image for every record with a visual field.
  4. Use core ERPNext DocTypes (Core-First Architecture).
"""

import frappe
import os
import urllib.request

APP_NAME = "store"
APP_PREFIX = "STR"


def after_install():
    print(f"\n=== Installing {APP_NAME} demo data ===")
    _run("Custom fields",     _create_custom_fields)
    _run("Item groups",       _create_item_groups)
    _run("Demo items",        _create_demo_items)
    _run("Item prices",       _create_item_prices)
    _run("Demo customers",    _create_demo_customers)
    _run("Demo transactions", _create_demo_transactions)
    frappe.db.commit()
    print(f"=== {APP_NAME} install complete ===\n")


def _run(label, fn):
    try:
        fn()
        print(f"  ✓ {label}")
    except Exception as e:
        frappe.log_error(f"{label}: {e}", f"{APP_NAME} install")
        print(f"  ⚠ {label} failed (non-fatal): {e}")


def _create_custom_fields():
    """Add app-specific custom fields on core DocTypes if needed."""
    fields = [
        # Example: featured flag for store items
        # {
        #     "dt": "Item",
        #     "fieldname": f"{APP_NAME}_featured",
        #     "label": "Featured in Store",
        #     "fieldtype": "Check",
        #     "insert_after": "item_name",
        # },
    ]
    for f in fields:
        if not frappe.db.exists("Custom Field", {"dt": f["dt"], "fieldname": f["fieldname"]}):
            frappe.get_doc({"doctype": "Custom Field", **f}).insert(ignore_permissions=True)


def get_demo_image(keyword, seed, width=800, height=600):
    """Download a demo image for a record. Falls back through 3 sources."""
    filename = f"{APP_NAME}_{seed}_{keyword.replace(' ', '_')}.jpg"
    site_files = frappe.utils.get_files_path()
    dest_path = os.path.join(site_files, filename)
    site_url = f"/files/{filename}"

    if os.path.exists(dest_path):
        return site_url

    sources = [
        f"https://loremflickr.com/{width}/{height}/{keyword.replace(' ', ',')}",
        f"https://picsum.photos/seed/{seed}/{width}/{height}",
        f"https://placehold.co/{width}x{height}/4f46e5/ffffff?text={keyword.replace(' ', '+')}",
    ]
    for url in sources:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                with open(dest_path, "wb") as f:
                    f.write(resp.read())
            if not frappe.db.exists("File", {"file_url": site_url}):
                frappe.get_doc({
                    "doctype": "File",
                    "file_name": filename,
                    "file_url": site_url,
                    "is_private": 0,
                }).insert(ignore_permissions=True)
            return site_url
        except Exception:
            continue

    frappe.log_error(f"All image sources failed for keyword '{keyword}'", "Demo Data")
    return ""


def _ensure_item_group(name, parent="All Item Groups"):
    """Create an Item Group if it doesn't exist and return its name."""
    if not frappe.db.exists("Item Group", name):
        frappe.get_doc({
            "doctype": "Item Group",
            "item_group_name": name,
            "parent_item_group": parent,
            "is_group": 0,
            "show_in_website": 1,
        }).insert(ignore_permissions=True)
    return name


def _create_item_groups():
    """Create store categories as Item Groups."""
    _ensure_item_group("Electronics")
    _ensure_item_group("Accessories")
    _ensure_item_group("Home & Living")
    _ensure_item_group("Food & Drink")
    _ensure_item_group("Fitness")


def _create_demo_items():
    """Create 10 realistic Items with downloaded images."""
    item_group = {
        "electronics": "Electronics",
        "accessories": "Accessories",
        "home": "Home & Living",
        "food": "Food & Drink",
        "fitness": "Fitness",
    }

    items = [
        {"code": f"{APP_PREFIX}-001", "name": "Wireless Headphones",
         "group": "electronics", "keyword": "headphones", "desc": "Premium Bluetooth headphones with noise cancellation and 30-hour battery life."},
        {"code": f"{APP_PREFIX}-002", "name": "Mechanical Keyboard",
         "group": "electronics", "keyword": "keyboard", "desc": "RGB mechanical keyboard with Cherry MX switches and aluminum frame."},
        {"code": f"{APP_PREFIX}-003", "name": "Desk Lamp",
         "group": "home", "keyword": "desk lamp", "desc": "LED desk lamp with adjustable brightness, color temperature, and USB charging port."},
        {"code": f"{APP_PREFIX}-004", "name": "Canvas Backpack",
         "group": "accessories", "keyword": "backpack", "desc": "Vintage canvas backpack with padded laptop compartment and 25L capacity."},
        {"code": f"{APP_PREFIX}-005", "name": "Yoga Mat",
         "group": "home", "keyword": "yoga mat", "desc": "Non-slip eco-friendly yoga mat, 6mm thick with carrying strap."},
        {"code": f"{APP_PREFIX}-006", "name": "Water Bottle",
         "group": "accessories", "keyword": "water bottle", "desc": "Double-wall insulated stainless steel water bottle, 750ml, keeps drinks cold 24h."},
        {"code": f"{APP_PREFIX}-007", "name": "Green Tea Collection",
         "group": "food", "keyword": "green tea", "desc": "Premium Japanese green tea sampler — 4 varieties, 20 bags each."},
        {"code": f"{APP_PREFIX}-008", "name": "Office Chair",
         "group": "home", "keyword": "office chair", "desc": "Ergonomic mesh office chair with lumbar support and adjustable armrests."},
        {"code": f"{APP_PREFIX}-009", "name": "Running Shoes",
         "group": "fitness", "keyword": "running shoes", "desc": "Lightweight mesh running shoes with responsive cushioning and breathable upper."},
        {"code": f"{APP_PREFIX}-010", "name": "French Press",
         "group": "food", "keyword": "french press coffee", "desc": "Stainless steel French press coffee maker, 1L capacity with 4-stage filtration."},
    ]

    for i, item in enumerate(items):
        if not frappe.db.exists("Item", item["code"]):
            img = get_demo_image(item["keyword"], seed=i + 10)
            frappe.get_doc({
                "doctype": "Item",
                "item_code": item["code"],
                "item_name": item["name"],
                "item_group": item_group[item["group"]],
                "description": item["desc"],
                "stock_uom": "Nos",
                "is_stock_item": 0,
                "is_sales_item": 1,
                "disabled": 0,
                "image": img,
            }).insert(ignore_permissions=True)


def _create_item_prices():
    """Set selling prices for all demo items."""
    prices = {
        f"{APP_PREFIX}-001": 89.99,
        f"{APP_PREFIX}-002": 129.99,
        f"{APP_PREFIX}-003": 49.99,
        f"{APP_PREFIX}-004": 59.99,
        f"{APP_PREFIX}-005": 34.99,
        f"{APP_PREFIX}-006": 24.99,
        f"{APP_PREFIX}-007": 18.99,
        f"{APP_PREFIX}-008": 299.99,
        f"{APP_PREFIX}-009": 119.99,
        f"{APP_PREFIX}-010": 39.99,
    }

    price_list = "Standard Selling"
    for code, rate in prices.items():
        if frappe.db.exists("Item", code):
            if not frappe.db.exists("Item Price", {"item_code": code, "price_list": price_list}):
                frappe.get_doc({
                    "doctype": "Item Price",
                    "item_code": code,
                    "price_list": price_list,
                    "price_list_rate": rate,
                    "selling": 1,
                }).insert(ignore_permissions=True)


def _create_demo_customers():
    """Create 5 demo customers."""
    cg = frappe.db.get_value("Customer Group", {"is_group": 0}, "name") or "Individual"
    customers = [
        {"name": "Alice Thornton", "email": "alice@example.com", "phone": "+1-555-0101"},
        {"name": "Ben Okafor", "email": "ben@example.com", "phone": "+1-555-0102"},
        {"name": "Carmen Silva", "email": "carmen@example.com", "phone": "+1-555-0103"},
        {"name": "David Chen", "email": "david@example.com", "phone": "+1-555-0104"},
        {"name": "Elena Petrova", "email": "elena@example.com", "phone": "+1-555-0105"},
    ]
    for c in customers:
        full_name = f"{APP_PREFIX} {c['name']}"
        if not frappe.db.exists("Customer", full_name):
            frappe.get_doc({
                "doctype": "Customer",
                "customer_name": full_name,
                "customer_type": "Individual",
                "customer_group": cg,
                "territory": "All Territories",
                "email_id": c["email"],
                "mobile_no": c["phone"],
            }).insert(ignore_permissions=True)


def _create_demo_transactions():
    """Create multiple sample Sales Orders with different customers and items."""
    company = _get_company()
    warehouse = _get_warehouse()

    orders = [
        {
            "customer": f"{APP_PREFIX} Alice Thornton",
            "items": [
                {"item_code": f"{APP_PREFIX}-001", "qty": 1, "rate": 89.99},
                {"item_code": f"{APP_PREFIX}-006", "qty": 2, "rate": 24.99},
            ],
        },
        {
            "customer": f"{APP_PREFIX} Ben Okafor",
            "items": [
                {"item_code": f"{APP_PREFIX}-002", "qty": 1, "rate": 129.99},
                {"item_code": f"{APP_PREFIX}-009", "qty": 1, "rate": 119.99},
                {"item_code": f"{APP_PREFIX}-005", "qty": 1, "rate": 34.99},
            ],
        },
        {
            "customer": f"{APP_PREFIX} Carmen Silva",
            "items": [
                {"item_code": f"{APP_PREFIX}-008", "qty": 1, "rate": 299.99},
                {"item_code": f"{APP_PREFIX}-003", "qty": 1, "rate": 49.99},
                {"item_code": f"{APP_PREFIX}-004", "qty": 1, "rate": 59.99},
                {"item_code": f"{APP_PREFIX}-010", "qty": 1, "rate": 39.99},
            ],
        },
    ]

    for order in orders:
        if not frappe.db.exists("Customer", order["customer"]):
            continue
        if frappe.db.exists("Sales Order", {"customer": order["customer"]}):
            continue
        _create_single_order(order["customer"], order["items"], company, warehouse)


def _create_single_order(customer, items, company, warehouse):
    """Create and submit a single Sales Order. Wrapped in try/except to handle known ERPNext v15 ORM cache issues."""
    try:
        ddate = frappe.utils.add_days(frappe.utils.today(), 7)
        order_items = []
        for item in items:
            order_items.append({
                "item_code": item["item_code"],
                "qty": item["qty"],
                "rate": item["rate"],
                "warehouse": warehouse,
                "delivery_date": ddate,
            })
        so = frappe.get_doc({
            "doctype": "Sales Order",
            "customer": customer,
            "company": company,
            "delivery_date": ddate,
            "order_type": "Sales",
            "items": order_items,
        })
        so.insert(ignore_permissions=True)
        so.submit()
        print(f"    Sales Order created for {customer}")
    except Exception as e:
        # Non-fatal — known ERPNext v15 tax_category ORM cache issue
        frappe.log_error(f"Demo SO for {customer}: {e}", f"{APP_NAME} install")


def _get_company():
    return (
        frappe.db.get_single_value("Global Defaults", "default_company")
        or frappe.db.get_value("Company", {}, "name")
    )


def _get_warehouse():
    return (
        frappe.db.get_value("Warehouse", {"is_group": 0, "disabled": 0}, "name")
        or frappe.db.get_value("Warehouse", {}, "name")
    )
