import frappe
import json
import os


def after_install():
    """Load demo fixtures from JSON files after app installation."""
    # Skip if demo data already exists
    if frappe.db.count("Store Product") > 0:
        print("Store: Demo data already exists - skipping fixture import.")
        return

    # Resolve fixtures directory
    fixtures_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "store", "fixtures")

    if not os.path.exists(fixtures_dir):
        print(f"Store: Fixtures directory not found at {fixtures_dir} - skipping demo data import.")
        return

    # Order matters: Products first, then Customers, then Orders (depends on both)
    for filename in ("store_product.json", "store_customer.json", "store_order.json"):
        filepath = os.path.join(fixtures_dir, filename)
        if not os.path.exists(filepath):
            continue

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
                print(f"Store: Failed to import {doctype} fixture: {e}")
