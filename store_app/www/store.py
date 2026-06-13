import frappe

no_cache = 1


def get_context(context):
    """Provide product data and categories to the store template."""
    context.title = "Store"

    # Fetch all available products
    products = frappe.get_all(
        "Store Product",
        filters={"is_available": 1},
        fields=["name", "product_name", "price", "description", "image", "stock_quantity", "category"],
        order_by="product_name asc",
    )

    # Fetch distinct categories
    categories = frappe.db.sql(
        "SELECT DISTINCT category FROM `tabStore Product` WHERE is_available = 1 AND category IS NOT NULL AND category != '' ORDER BY category",
        pluck="category",
    )

    context.products = products
    context.categories = categories
    return context
