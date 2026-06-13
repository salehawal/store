import frappe

no_cache = 1


def get_context(context):
    """Set page context for the orders page."""
    context.title = "My Orders"
    return context
