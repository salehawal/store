// ============================================
// Store App - Global JavaScript
// ============================================

(function() {
    'use strict';

    /**
     * Store Cart Manager
     * Handles cart operations using localStorage
     */
    window.StoreCart = {
        getCart: function() {
            try {
                return JSON.parse(localStorage.getItem('store_cart')) || [];
            } catch (e) {
                return [];
            }
        },

        saveCart: function(cart) {
            localStorage.setItem('store_cart', JSON.stringify(cart));
            this.updateCount();
        },

        addItem: function(product, name, price, quantity) {
            quantity = quantity || 1;
            const cart = this.getCart();
            const existing = cart.find(function(item) {
                return item.product === product;
            });

            if (existing) {
                existing.quantity += quantity;
            } else {
                cart.push({
                    product: product,
                    name: name,
                    price: parseFloat(price),
                    quantity: quantity
                });
            }

            this.saveCart(cart);
            this.showToast(name + ' added to cart');
            return cart;
        },

        removeItem: function(index) {
            const cart = this.getCart();
            if (index >= 0 && index < cart.length) {
                cart.splice(index, 1);
                this.saveCart(cart);
            }
            return cart;
        },

        updateQuantity: function(index, delta) {
            const cart = this.getCart();
            if (index >= 0 && index < cart.length) {
                cart[index].quantity += delta;
                if (cart[index].quantity <= 0) {
                    cart.splice(index, 1);
                }
                this.saveCart(cart);
            }
            return cart;
        },

        clearCart: function() {
            localStorage.removeItem('store_cart');
            this.updateCount();
        },

        getCount: function() {
            const cart = this.getCart();
            return cart.reduce(function(sum, item) {
                return sum + item.quantity;
            }, 0);
        },

        getTotal: function() {
            const cart = this.getCart();
            return cart.reduce(function(sum, item) {
                return sum + (item.price * item.quantity);
            }, 0);
        },

        updateCount: function() {
            const count = this.getCount();
            var els = document.querySelectorAll('.cart-count, [data-cart-count]');
            els.forEach(function(el) {
                el.textContent = count;
            });
        },

        showToast: function(message) {
            var existing = document.querySelector('.store-toast');
            if (existing) existing.remove();

            var toast = document.createElement('div');
            toast.className = 'store-toast';
            toast.textContent = message;
            document.body.appendChild(toast);

            requestAnimationFrame(function() {
                toast.classList.add('show');
            });

            setTimeout(function() {
                toast.classList.remove('show');
                setTimeout(function() { toast.remove(); }, 300);
            }, 2500);
        }
    };

    /**
     * API Helper
     */
    window.StoreAPI = {
        placeOrder: function(items, customerData) {
            return frappe.call({
                method: 'store_app.store_app.doctype.store_order.store_order.place_order',
                args: {
                    items: JSON.stringify(items),
                    customer_name: customerData.customer_name,
                    email: customerData.email,
                    phone: customerData.phone || null,
                    address: customerData.address || null,
                    notes: customerData.notes || null,
                }
            });
        },

        getProducts: function(category) {
            return frappe.call({
                method: 'store_app.store_app.doctype.store_order.store_order.get_products',
                args: { category: category || null }
            });
        },

        getCategories: function() {
            return frappe.call({
                method: 'store_app.store_app.doctype.store_order.store_order.get_categories'
            });
        },

        getOrder: function(orderName) {
            return frappe.call({
                method: 'store_app.store_app.doctype.store_order.store_order.get_order',
                args: { order_name: orderName }
            });
        },

        getCustomerOrders: function(email) {
            return frappe.call({
                method: 'store_app.store_app.doctype.store_order.store_order.get_customer_orders',
                args: { email: email }
            });
        }
    };

    /**
     * Initialize cart count on page load
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.StoreCart.updateCount();
        });
    } else {
        window.StoreCart.updateCount();
    }

})();
