from . import __version__ as app_version

app_name = "store"
app_title = "Store"
app_publisher = "Store"
app_description = "ERPNext Store App — online ordering at /store"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "store@example.com"
app_license = "MIT"

app_include_js = "/assets/store/js/store.js"
app_include_css = "/assets/store/css/store.css"

website_context = {}

# Web routes
website_route_rules = [
    {"from_route": "/store", "to_route": "store"}
]
