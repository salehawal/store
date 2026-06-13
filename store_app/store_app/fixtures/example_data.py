import frappe
from frappe.utils import today, add_days, nowdate


def create_example_data():
    """Generate example products, customers, and orders to demonstrate the store app.

    Run via: bench --site <site-name> execute store_app.store_app.fixtures.example_data.create_example_data
    """
    # Skip if data already exists
    existing_products = frappe.get_all("Store Product", limit=1)
    if existing_products:
        print("Example data already exists. Skipping generation.")
        return

    print("Creating example store data...")

    # ---- Products ----
    products = [
        {
            "product_name": "Wireless Bluetooth Headphones",
            "category": "Electronics",
            "price": 79.99,
            "stock_quantity": 50,
            "description": "Premium wireless headphones with active noise cancellation, 30-hour battery life, and comfortable over-ear design. Features Bluetooth 5.0 for crystal-clear audio.",
            "is_available": 1,
        },
        {
            "product_name": "Organic Green Tea Collection",
            "category": "Food & Drink",
            "price": 24.99,
            "stock_quantity": 100,
            "description": "A curated collection of four premium organic green teas: Jasmine Green, Sencha, Matcha, and Genmaicha. 60 bags total.",
            "is_available": 1,
        },
        {
            "product_name": "Ergonomic Office Chair",
            "category": "Furniture",
            "price": 299.99,
            "stock_quantity": 15,
            "description": "Fully adjustable ergonomic mesh office chair with lumbar support, adjustable armrests, and breathable mesh back. Supports up to 300 lbs.",
            "is_available": 1,
        },
        {
            "product_name": "Stainless Steel Water Bottle",
            "category": "Accessories",
            "price": 34.99,
            "stock_quantity": 200,
            "description": "Double-wall vacuum insulated stainless steel water bottle. Keeps drinks cold 24hrs or hot 12hrs. 32oz capacity, BPA-free.",
            "is_available": 1,
        },
        {
            "product_name": "Smart LED Desk Lamp",
            "category": "Electronics",
            "price": 59.99,
            "stock_quantity": 35,
            "description": "Smart LED desk lamp with touch controls, adjustable color temperature (2700K-6500K), brightness levels, and built-in USB charging port.",
            "is_available": 1,
        },
        {
            "product_name": "Handcrafted Ceramic Mug Set",
            "category": "Home & Living",
            "price": 44.99,
            "stock_quantity": 30,
            "description": "Set of 4 handcrafted ceramic mugs. Microwave and dishwasher safe. Each mug holds 14oz. Artisan-made with unique glaze patterns.",
            "is_available": 1,
        },
        {
            "product_name": "Ultralight Running Shoes",
            "category": "Sports",
            "price": 129.99,
            "stock_quantity": 40,
            "description": "Lightweight performance running shoes with responsive cushioning, breathable mesh upper, and durable rubber outsole. Weighs only 8.5oz.",
            "is_available": 1,
        },
        {
            "product_name": "Professional Chef's Knife",
            "category": "Kitchen",
            "price": 89.99,
            "stock_quantity": 25,
            "description": "8-inch forged German stainless steel chef's knife with ergonomic handle. Rockwell hardness 58. Includes protective sheath.",
            "is_available": 1,
        },
        {
            "product_name": "Yoga Mat Premium",
            "category": "Sports",
            "price": 49.99,
            "stock_quantity": 60,
            "description": "Extra thick 6mm eco-friendly TPE yoga mat with alignment lines. Non-slip surface, lightweight and portable with carrying strap.",
            "is_available": 1,
        },
        {
            "product_name": "Leather Wallet - Minimalist",
            "category": "Accessories",
            "price": 39.99,
            "stock_quantity": 45,
            "description": "Slim minimalist RFID-blocking leather wallet. Holds up to 8 cards. Crafted from full-grain Italian leather. Available in brown and black.",
            "is_available": 1,
        },
        {
            "product_name": "Indoor Herb Garden Kit",
            "category": "Home & Living",
            "price": 32.99,
            "stock_quantity": 55,
            "description": "Complete indoor herb garden kit with self-watering planter, organic soil, seeds for 6 herbs (basil, cilantro, mint, rosemary, thyme, parsley), and growing guide.",
            "is_available": 1,
        },
        {
            "product_name": "Portable Bluetooth Speaker",
            "category": "Electronics",
            "price": 69.99,
            "stock_quantity": 40,
            "description": "Waterproof portable Bluetooth speaker with 360-degree sound, 20-hour battery life, and built-in microphone. IP67 rated.",
            "is_available": 1,
        },
    ]

    created_products = {}
    for p in products:
        doc = frappe.get_doc({
            "doctype": "Store Product",
            "product_name": p["product_name"],
            "category": p["category"],
            "price": p["price"],
            "stock_quantity": p["stock_quantity"],
            "description": p["description"],
            "is_available": p["is_available"],
        })
        doc.insert(ignore_permissions=True)
        created_products[p["product_name"]] = doc.name

    print(f"✓ Created {len(products)} products")

    # ---- Customers ----
    customers = [
        {
            "customer_name": "Alice Johnson",
            "email": "alice@example.com",
            "phone": "+1 (555) 123-4567",
            "address": "123 Maple Street, Springfield, IL 62701",
        },
        {
            "customer_name": "Bob Williams",
            "email": "bob@example.com",
            "phone": "+1 (555) 987-6543",
            "address": "456 Oak Avenue, Portland, OR 97201",
        },
        {
            "customer_name": "Carol Martinez",
            "email": "carol@example.com",
            "phone": "+1 (555) 456-7890",
            "address": "789 Pine Road, Austin, TX 73301",
        },
    ]

    created_customers = {}
    for c in customers:
        doc = frappe.get_doc({
            "doctype": "Store Customer",
            "customer_name": c["customer_name"],
            "email": c["email"],
            "phone": c["phone"],
            "address": c["address"],
        })
        doc.insert(ignore_permissions=True)
        created_customers[c["customer_name"]] = doc.name

    print(f"✓ Created {len(customers)} customers")

    # ---- Orders ----
    orders_data = [
        {
            "customer": "Alice Johnson",
            "days_ago": 2,
            "status": "Delivered",
            "items": [("Wireless Bluetooth Headphones", 1), ("Organic Green Tea Collection", 2)],
            "address": "123 Maple Street, Springfield, IL 62701",
        },
        {
            "customer": "Bob Williams",
            "days_ago": 1,
            "status": "Processing",
            "items": [("Ergonomic Office Chair", 1)],
            "address": "456 Oak Avenue, Portland, OR 97201",
        },
        {
            "customer": "Alice Johnson",
            "days_ago": 0,
            "status": "Confirmed",
            "items": [("Stainless Steel Water Bottle", 3), ("Yoga Mat Premium", 1)],
            "address": "123 Maple Street, Springfield, IL 62701",
        },
        {
            "customer": "Carol Martinez",
            "days_ago": 3,
            "status": "Shipped",
            "items": [
                ("Smart LED Desk Lamp", 1),
                ("Handcrafted Ceramic Mug Set", 1),
                ("Portable Bluetooth Speaker", 1),
            ],
            "address": "789 Pine Road, Austin, TX 73301",
        },
        {
            "customer": "Bob Williams",
            "days_ago": 5,
            "status": "Delivered",
            "items": [("Professional Chef's Knife", 1), ("Leather Wallet - Minimalist", 2)],
            "address": "456 Oak Avenue, Portland, OR 97201",
        },
    ]

    for o in orders_data:
        customer_name = created_customers[o["customer"]]
        order_date = add_days(today(), -o["days_ago"])

        order = frappe.get_doc({
            "doctype": "Store Order",
            "customer": customer_name,
            "order_date": order_date,
            "status": o["status"],
            "shipping_address": o.get("address", ""),
        })

        for product_name, qty in o["items"]:
            product = frappe.get_doc("Store Product", created_products[product_name])
            order.append("items", {
                "product": product.name,
                "product_name": product.product_name,
                "quantity": qty,
                "rate": product.price,
                "amount": qty * product.price,
            })

        order.insert(ignore_permissions=True)

        # Reduce stock for confirmed orders
        if o["status"] != "Draft":
            for item in order.items:
                product = frappe.get_doc("Store Product", item.product)
                product.stock_quantity -= item.quantity
                product.save()

    print(f"✓ Created {len(orders_data)} orders")
    print("Example data generation complete!")
    print("\nYou can now visit /store on your site to see the store in action.")
