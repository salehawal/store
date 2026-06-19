from . import __version__ as app_version

app_name = "store"
app_title = "Store"
app_publisher = "Store"
app_description = "ERPNext Store App — online ordering at /store"
app_icon = "octicon octicon-file-directory"
app_color = "blue"
app_email = "store@example.com"
app_license = "MIT"

# Desk (back-office) assets
app_include_js = "/assets/store/js/store.js"
app_include_css = "/assets/store/css/store.css"

# Web (www page) assets — required for frontend pages to load CSS/JS
web_include_js = "/assets/store/js/store.js"
web_include_css = "/assets/store/css/store.css"

# Disable Frappe's built-in fixture auto-scan — demo data is handled by after_install
fixtures = []

# after_install
after_install = "store.setup.after_install.after_install"
