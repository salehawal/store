import frappe

no_cache = 1


def get_context(context):
    """Set page context for the cart page."""
    context.title = "Shopping Cart"
    return context
