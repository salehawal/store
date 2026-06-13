frappe.ready(function () {
    // Shopping cart in session storage
    let cart = JSON.parse(sessionStorage.getItem("store_cart") || "[]");
    let isCheckoutMode = false;

    function saveCart() {
        sessionStorage.setItem("store_cart", JSON.stringify(cart));
        updateCartBadge();
    }

    function updateCartBadge() {
        const count = cart.reduce((sum, item) => sum + item.qty, 0);
        const badge = document.getElementById("cart-badge");
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? "inline-flex" : "none";
        }
        const totalEl = document.getElementById("cart-total-items");
        if (totalEl) totalEl.textContent = count;
    }

    // Add to cart
    document.querySelectorAll(".btn-add-cart").forEach((btn) => {
        btn.addEventListener("click", function () {
            const product = JSON.parse(this.dataset.product);
            const existing = cart.find((i) => i.name === product.name);
            if (existing) {
                existing.qty += 1;
            } else {
                cart.push({ name: product.name, product_name: product.product_name, price: product.price, qty: 1 });
            }
            saveCart();
            frappe.msgprint({ title: __("Added to Cart"), message: __("{0} added to cart", [product.product_name]), indicator: "green" });
            renderCart();
            updateCheckoutUI();
        });
    });

    // Toggle checkout mode
    function enterCheckoutMode() {
        isCheckoutMode = true;
        updateCheckoutUI();
    }

    function exitCheckoutMode() {
        isCheckoutMode = false;
        updateCheckoutUI();
    }

    function updateCheckoutUI() {
        const checkoutSection = document.getElementById("checkout-section");
        const proceedBtn = document.getElementById("btn-proceed-checkout");
        if (!checkoutSection || !proceedBtn) return;

        const hasItems = cart.length > 0;

        if (!hasItems) {
            checkoutSection.style.display = "none";
            proceedBtn.style.display = "none";
            return;
        }

        if (isCheckoutMode) {
            checkoutSection.style.display = "block";
            proceedBtn.style.display = "none";
            // Pre-fill customer info from session
            const nameEl = document.getElementById("customer_name");
            const emailEl = document.getElementById("customer_email");
            if (nameEl && emailEl) {
                nameEl.value = sessionStorage.getItem("store_customer_name") || "";
                emailEl.value = sessionStorage.getItem("store_customer_email") || "";
            }
        } else {
            checkoutSection.style.display = "none";
            proceedBtn.style.display = "block";
        }
    }

    // Render cart sidebar
    function renderCart() {
        const container = document.getElementById("cart-items");
        if (!container) return;

        if (cart.length === 0) {
            container.innerHTML = '<p class="text-muted text-center my-4">' + __("Your cart is empty") + "</p>";
            document.getElementById("cart-total-amount").textContent = "$0.00";
            document.getElementById("btn-place-order")?.setAttribute("disabled", "disabled");
            document.getElementById("btn-proceed-checkout").style.display = "none";
            document.getElementById("checkout-section").style.display = "none";
            isCheckoutMode = false;
            return;
        }

        let html = "";
        let total = 0;
        cart.forEach((item, idx) => {
            const amt = item.price * item.qty;
            total += amt;
            html += `
                <div class="cart-item d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                    <div class="flex-grow-1">
                        <strong>${item.product_name}</strong>
                        <div class="text-muted small">$${item.price.toFixed(2)} × ${item.qty}</div>
                    </div>
                    <div class="text-end me-2">$${amt.toFixed(2)}</div>
                    <button class="btn btn-sm btn-outline-danger btn-remove-cart" data-index="${idx}">&times;</button>
                </div>
            `;
        });
        container.innerHTML = html;
        document.getElementById("cart-total-amount").textContent = `$${total.toFixed(2)}`;

        // Enable/disable place order button based on checkout state
        if (isCheckoutMode) {
            document.getElementById("btn-place-order")?.removeAttribute("disabled");
        } else {
            document.getElementById("btn-place-order")?.setAttribute("disabled", "disabled");
        }

        document.querySelectorAll(".btn-remove-cart").forEach((btn) => {
            btn.addEventListener("click", function () {
                const idx = parseInt(this.dataset.index);
                cart.splice(idx, 1);
                saveCart();
                renderCart();
                updateCheckoutUI();
            });
        });
    }

    // Proceed to Checkout
    const proceedBtn = document.getElementById("btn-proceed-checkout");
    if (proceedBtn) {
        proceedBtn.addEventListener("click", enterCheckoutMode);
    }

    // Back to Cart
    const backBtn = document.getElementById("btn-back-to-cart");
    if (backBtn) {
        backBtn.addEventListener("click", exitCheckoutMode);
    }

    // Place order
    const placeOrderBtn = document.getElementById("btn-place-order");
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener("click", function () {
            const customerName = document.getElementById("customer_name")?.value?.trim();
            const customerEmail = document.getElementById("customer_email")?.value?.trim();
            const phone = document.getElementById("customer_phone")?.value?.trim();
            const address = document.getElementById("customer_address")?.value?.trim();

            if (!customerName || !customerEmail) {
                frappe.msgprint({ title: __("Missing Info"), message: __("Please enter your name and email."), indicator: "orange" });
                return;
            }
            if (cart.length === 0) {
                frappe.msgprint({ title: __("Empty Cart"), message: __("Add items to your cart first."), indicator: "orange" });
                return;
            }

            // Save customer info
            sessionStorage.setItem("store_customer_name", customerName);
            sessionStorage.setItem("store_customer_email", customerEmail);

            frappe.call({
                method: "store.www.store.place_order",
                args: {
                    customer_name: customerName,
                    customer_email: customerEmail,
                    phone: phone,
                    address: address,
                    items: cart,
                },
                callback: function (r) {
                    if (r.message && r.message.status === "ok") {
                        frappe.msgprint({
                            title: __("Order Placed!"),
                            message: __("Your order <strong>{0}</strong> has been placed successfully.", [r.message.order_name]),
                            indicator: "green",
                        });
                        cart = [];
                        isCheckoutMode = false;
                        saveCart();
                        renderCart();
                        updateCheckoutUI();
                    } else {
                        frappe.msgprint({ title: __("Error"), message: r.message?.error || __("Something went wrong."), indicator: "red" });
                    }
                },
            });
        });
    }

    renderCart();
    updateCartBadge();
    updateCheckoutUI();
});
