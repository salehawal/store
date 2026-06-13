import frappe
import json
import os


def after_install():
    """Load demo fixtures from JSON files after app installation."""
    fixtures_dir = frappe.get_app_path("store", "fixtures")

    if not os.path.exists(fixtures_dir):
        print("Store: Fixtures directory not found - skipping demo data import.")
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
