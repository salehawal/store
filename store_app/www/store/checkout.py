import frappe

no_cache = 1


def get_context(context):
    """Set page context for the checkout page."""
    context.title = "Checkout"
    return context
