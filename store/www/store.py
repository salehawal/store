import json
import frappe
from frappe import _


def seed_demo_data():
    """Seed demo products, customers, and orders if the database is empty.
    Also patches existing products that are missing images."""
    fixture_path = frappe.get_app_path("store", "store", "fixtures", "store_product.json")

    # Read fixture images to patch existing products that lack them
    try:
        with open(fixture_path) as f:
            fixture_products = json.load(f)
        image_map = {p["product_name"]: p["image"] for p in fixture_products if p.get("image")}

        for product_name, image in image_map.items():
            existing = frappe.db.get_value("Store Product", {"product_name": product_name}, "name")
            if existing:
                current_image = frappe.db.get_value("Store Product", existing, "image")
                if not current_image:
                    frappe.db.set_value("Store Product", existing, "image", image)
    except Exception as e:
        frappe.logger().error(f"Store: Failed to patch product images: {e}")

    if frappe.db.count("Store Product") > 0:
        return

    fixtures_dir = frappe.get_app_path("store", "store", "fixtures")

    # Order matters: Products first, then Customers, then Orders
    for filename in ("store_product.json", "store_customer.json", "store_order.json"):
        filepath = frappe.get_app_path("store", "store", "fixtures", filename)

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
    """Populate the store page context with store settings."""
    seed_demo_data()

    # Full-screen responsive layout
    context.full_width = True
    context.show_sidebar = 0
    context.title = "Store"

    # Store name and tagline for the template
    context.store_name = "Store"
    context.store_tagline = _("Browse our products and place an order online.")
    context.no_cache = 1

    return context
