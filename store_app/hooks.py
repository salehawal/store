from . import __version__ as app_version

app_name = "store_app"
app_title = "Store App"
app_publisher = "Store App Developer"
app_description = "ERPNext Store App — online ordering system for customers"
app_email = "dev@example.com"
app_license = "MIT"

# Apps
# ------------------------------
app_include_js = "/assets/store_app/js/store_app.js"
app_include_css = "/assets/store_app/css/store_app.css"

# Website Context
# ------------------------------
website_context = {
    "favicon": "/assets/store_app/images/favicon.ico",
}

# Fixtures
# ------------------------------
# fixtures = ["Custom Field", "Workflow"]

# DocType Class Overrides
# ------------------------------
# doctype_overrides = {}

# Scheduled Tasks
# ------------------------------
# scheduler_events = {
#     "daily": [
#         "store_app.tasks.daily"
#     ]
# }

# Routes (WWW)
# ------------------------------
# No additional route registration needed — Frappe auto-discovers www/ pages.
