/**
 * ERPNext Store — store.js
 * Vanilla JS SPA served at /store
 * Communicates with ERPNext via frappe.call()
 */
(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────
  const state = {
    products: [],
    cart: JSON.parse(localStorage.getItem("store_cart") || "[]"),
    drawerMode: null, // "cart" | "checkout" | "success"
    customerName: sessionStorage.getItem("store_customer_name") || "",
    customerEmail: sessionStorage.getItem("store_customer_email") || "",
    customerPhone: "",
    customerAddress: "",
    orderName: null,
    search: "",
    loading: false,
  };

  // ─────────────────────────────────────────────────────────────
  // CART HELPERS
  // ─────────────────────────────────────────────────────────────
  function saveCart() {
    localStorage.setItem("store_cart", JSON.stringify(state.cart));
  }

  function cartCount() {
    return state.cart.reduce((s, i) => s + i.qty, 0);
  }

  function cartTotal() {
    return state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  }

  function addToCart(product, qty) {
    qty = qty || 1;
    const existing = state.cart.find((i) => i.name === product.name);
    if (existing) {
      existing.qty += qty;
    } else {
      state.cart.push({
        name: product.name,
        product_name: product.product_name,
        price: product.price,
        image: product.image,
        qty,
      });
    }
    saveCart();
    renderCartCount();
    toast(`Added "${product.product_name}" to cart`);
  }

  function removeFromCart(name) {
    state.cart = state.cart.filter((i) => i.name !== name);
    saveCart();
    renderCartCount();
    if (state.drawerMode === "cart") renderDrawerContent();
  }

  function changeQty(name, delta) {
    const item = state.cart.find((i) => i.name === name);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart();
    renderCartCount();
    if (state.drawerMode === "cart") renderDrawerContent();
  }

  // ─────────────────────────────────────────────────────────────
  // FORMATTERS
  // ─────────────────────────────────────────────────────────────
  function formatPrice(price) {
    return "$" + Number(price).toFixed(2);
  }

  // ─────────────────────────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────────────────────────
  let toastTimer;

  function toast(msg) {
    let el = document.getElementById("store-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "store-toast";
      el.className = "store-toast";
      document.body.appendChild(el);
    }
    el.innerHTML = `<i class="ti ti-check" aria-hidden="true"></i> ${msg}`;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  function render() {
    const app = document.getElementById("store-app");
    app.innerHTML = `
      ${renderNav()}
      ${renderHero()}
      <div class="store-body">
        <main class="store-main">
          ${renderProductsSection()}
        </main>
      </div>
    `;
    bindNavEvents();
    bindProductEvents();
    renderCartCount();
  }

  function renderNav() {
    return `
      <nav class="store-nav" role="navigation">
        <div class="store-nav-inner">
          <span class="store-logo" id="nav-logo">Store</span>
          <div class="store-search-wrap">
            <i class="ti ti-search" aria-hidden="true"></i>
            <input class="store-search" id="search-input" type="search"
              placeholder="Search products\u2026" value="${esc(state.search)}" aria-label="Search products">
          </div>
          <div class="store-nav-actions">
            <button class="btn-cart" id="btn-cart" aria-label="Open cart">
              <i class="ti ti-shopping-cart" aria-hidden="true"></i>
              <span>Cart</span>
              <span class="cart-count" id="cart-count">${cartCount()}</span>
            </button>
          </div>
        </div>
      </nav>
    `;
  }

  function renderHero() {
    return `
      <div class="store-hero">
        <h1>Welcome to Our Store</h1>
        <p>Browse our products and place an order online.</p>
      </div>
    `;
  }

  function renderProductsSection() {
    if (state.loading) {
      return `<div class="store-loading"><div class="loading-spinner"></div><p>Loading products\u2026</p></div>`;
    }

    let products = state.products;
    if (state.search) {
      const q = state.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.product_name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (products.length === 0) {
      const label = state.search ? ` for &quot;${esc(state.search)}&quot;` : "";
      return `
        <div class="products-header">
          <h2>All Products</h2>
          <span class="products-count">0 products</span>
        </div>
        <div class="state-empty">
          <i class="ti ti-package-off" aria-hidden="true"></i>
          <p>No products found${label}.</p>
        </div>
      `;
    }

    const cards = products
      .map(
        (p) => `
        <article class="product-card" data-item="${esc(p.name)}" tabindex="0" role="button"
          aria-label="View ${esc(p.product_name)}">
          <div class="product-img">
            ${productImage(p)}
          </div>
          <div class="product-info">
            <p class="product-name">${esc(p.product_name)}</p>
            <p class="product-desc">${esc(p.description || "")}</p>
            <div class="product-footer">
              <span class="product-price">${formatPrice(p.price)}</span>
              <button class="btn-add" data-item="${esc(p.name)}" aria-label="Add ${esc(p.product_name)} to cart">
                <i class="ti ti-plus" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </article>
      `
      )
      .join("");

    return `
      <div class="products-header">
        <h2>All Products</h2>
        <span class="products-count">${products.length} product${products.length !== 1 ? "s" : ""}</span>
      </div>
      <div class="product-grid" role="list">${cards}</div>
    `;
  }

  function productImage(product) {
    if (product.image) {
      return `<img src="${esc(product.image)}" alt="${esc(product.product_name)}" loading="lazy">`;
    }
    return `<div class="product-img-placeholder"><i class="ti ti-photo-off" aria-hidden="true"></i></div>`;
  }

  function esc(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ─────────────────────────────────────────────────────────────
  // DRAWER RENDERING
  // ─────────────────────────────────────────────────────────────
  function renderDrawerContent() {
    const drawer = document.getElementById("store-drawer");
    const overlay = document.getElementById("store-overlay");
    if (!drawer) return;

    if (!state.drawerMode) {
      drawer.className = "store-drawer";
      drawer.innerHTML = "";
      if (overlay) overlay.className = "store-overlay";
      return;
    }

    drawer.className = "store-drawer open";
    if (overlay) overlay.className = "store-overlay open";

    switch (state.drawerMode) {
      case "cart":
        drawer.innerHTML = renderCartDrawer();
        break;
      case "checkout":
        drawer.innerHTML = renderCheckoutDrawer();
        break;
      case "success":
        drawer.innerHTML = renderSuccessDrawer();
        break;
    }
    bindDrawerEvents();
  }

  function renderCartDrawer() {
    const hasItems = state.cart.length > 0;
    return `
      <div class="drawer-header">
        <h3><i class="ti ti-shopping-cart" aria-hidden="true"></i> Your Cart</h3>
        <button class="btn-close" id="btn-close-drawer" aria-label="Close cart">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="drawer-body">
        ${hasItems ? renderCartItems() : renderCartEmpty()}
      </div>
      ${
        hasItems
          ? `
        <div class="drawer-footer">
          <div class="cart-summary">
            <div class="cart-summary-row cart-total">
              <span>Total</span>
              <span>${formatPrice(cartTotal())}</span>
            </div>
          </div>
          <button class="btn-primary" id="btn-checkout" style="width:100%;margin-top:12px;padding:14px;">
            Proceed to Checkout
          </button>
        </div>
      `
          : ""
      }
    `;
  }

  function renderCartEmpty() {
    return `
      <div class="cart-empty">
        <i class="ti ti-shopping-cart-off" aria-hidden="true"></i>
        <p>Your cart is empty.</p>
      </div>
    `;
  }

  function renderCartItems() {
    return state.cart
      .map(
        (item) => `
      <div class="cart-item" data-item="${esc(item.name)}">
        <div class="cart-item-img">
          ${
            item.image
              ? `<img src="${esc(item.image)}" alt="${esc(item.product_name)}">`
              : `<i class="ti ti-photo-off" style="font-size:24px;color:#d1d5db"></i>`
          }
        </div>
        <div class="cart-item-info">
          <p class="cart-item-name">${esc(item.product_name)}</p>
          <p class="cart-item-price">${formatPrice(item.price)} each</p>
          <div class="cart-item-controls">
            <button class="qty-btn" data-action="decrease" data-item="${esc(item.name)}" aria-label="Decrease quantity">\u2212</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" data-action="increase" data-item="${esc(item.name)}" aria-label="Increase quantity">+</button>
            <button class="btn-remove" data-action="remove" data-item="${esc(item.name)}" aria-label="Remove item">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </div>
        <div style="text-align:right;font-weight:700;font-size:14px;white-space:nowrap">
          ${formatPrice(item.price * item.qty)}
        </div>
      </div>
    `
      )
      .join("");
  }

  function renderCheckoutDrawer() {
    return `
      <div class="drawer-header">
        <h3>Checkout</h3>
        <button class="btn-close" id="btn-close-drawer" aria-label="Close">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="drawer-body">
        <form id="checkout-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="cust-name">Name *</label>
            <input class="form-input" id="cust-name" type="text" required
              placeholder="Your name" value="${esc(state.customerName)}">
          </div>
          <div class="form-group">
            <label class="form-label" for="cust-email">Email *</label>
            <input class="form-input" id="cust-email" type="email" required
              placeholder="your@email.com" value="${esc(state.customerEmail)}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="cust-phone">Phone</label>
              <input class="form-input" id="cust-phone" type="tel"
                placeholder="+1 234 567 8900" value="${esc(state.customerPhone)}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="cust-address">Address</label>
            <textarea class="form-input" id="cust-address" rows="2"
              placeholder="Street, city, zip">${esc(state.customerAddress)}</textarea>
          </div>
          <div id="checkout-error" class="form-error" style="display:none"></div>
          <button type="submit" class="btn-primary" style="width:100%;padding:14px;margin-top:8px" id="btn-place-order">
            <i class="ti ti-check" aria-hidden="true"></i> Place Order
          </button>
        </form>
      </div>
    `;
  }

  function renderSuccessDrawer() {
    return `
      <div class="drawer-header">
        <h3>Order Placed</h3>
        <button class="btn-close" id="btn-close-drawer" aria-label="Close">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="drawer-body">
        <div class="order-success">
          <i class="ti ti-circle-check success-icon" aria-hidden="true"></i>
          <h3>Thank you for your order!</h3>
          <p>Your order has been received and is being processed.</p>
          <div class="order-number">${state.orderName || ""}</div>
          <p>You will receive a confirmation email shortly.</p>
          <button class="btn-primary" id="btn-continue-shopping" style="margin-top:24px;padding:12px 24px">
            Continue Shopping
          </button>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT BINDING
  // ─────────────────────────────────────────────────────────────
  function bindNavEvents() {
    document.getElementById("nav-logo")?.addEventListener("click", () => {
      state.search = "";
      document.getElementById("search-input").value = "";
      renderProductsSectionIntoMain();
    });

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      let debounce;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          state.search = e.target.value;
          renderProductsSectionIntoMain();
        }, 300);
      });
    }

    document.getElementById("btn-cart")?.addEventListener("click", () => {
      state.drawerMode = "cart";
      renderDrawerContent();
    });
  }

  function bindProductEvents() {
    document.querySelectorAll(".product-card").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.closest(".btn-add")) return;
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") el.click();
      });
    });

    document.querySelectorAll(".btn-add").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const name = btn.dataset.item;
        const product = state.products.find((p) => p.name === name);
        if (product) addToCart(product, 1);
      });
    });
  }

  function bindDrawerEvents() {
    const drawer = document.getElementById("store-drawer");
    if (!drawer) return;

    // Bind drawer delegation once — guard with dataset flag
    if (!drawer.dataset.bound) {
      drawer.dataset.bound = "true";
      drawer.addEventListener("click", (e) => {
        const target = e.target.closest("[data-action], #btn-close-drawer, #btn-checkout, #btn-continue-shopping");
        if (!target) return;

        if (target.id === "btn-close-drawer" || target.closest("#btn-close-drawer")) {
          closeDrawer();
        } else if (target.id === "btn-checkout") {
          state.drawerMode = "checkout";
          renderDrawerContent();
        } else if (target.id === "btn-continue-shopping") {
          closeDrawer();
        } else if (target.dataset.action === "increase") {
          changeQty(target.dataset.item, 1);
        } else if (target.dataset.action === "decrease") {
          changeQty(target.dataset.item, -1);
        } else if (target.dataset.action === "remove") {
          removeFromCart(target.dataset.item);
        }
      });
    }

    document.getElementById("store-overlay")?.addEventListener("click", closeDrawer, { once: true });
    document.getElementById("checkout-form")?.addEventListener("submit", handlePlaceOrder);
  }

  // ─────────────────────────────────────────────────────────────
  // DRAWER MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  function closeDrawer() {
    state.drawerMode = null;
    renderDrawerContent();
  }

  // ─────────────────────────────────────────────────────────────
  // PLACE ORDER
  // ─────────────────────────────────────────────────────────────
  function showCheckoutError(msg) {
    const el = document.getElementById("checkout-error");
    if (el) {
      el.textContent = msg;
      el.style.display = "block";
    }
  }

  function setOrderButtonLoading(loading) {
    const btn = document.getElementById("btn-place-order");
    if (btn) {
      btn.disabled = loading;
      btn.innerHTML = loading
        ? '<i class="ti ti-loader" aria-hidden="true"></i> Placing order\u2026'
        : '<i class="ti ti-check" aria-hidden="true"></i> Place Order';
    }
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    const name = document.getElementById("cust-name")?.value?.trim();
    const email = document.getElementById("cust-email")?.value?.trim();
    const phone = document.getElementById("cust-phone")?.value?.trim();
    const address = document.getElementById("cust-address")?.value?.trim();

    if (!name || !email) {
      showCheckoutError("Please enter your name and email.");
      return;
    }
    if (state.cart.length === 0) {
      showCheckoutError("Your cart is empty.");
      return;
    }

    state.customerName = name;
    state.customerEmail = email;
    sessionStorage.setItem("store_customer_name", name);
    sessionStorage.setItem("store_customer_email", email);

    setOrderButtonLoading(true);

    try {
      const result = await new Promise((resolve, reject) => {
        frappe.call({
          method: "store.www.store.place_order",
          args: {
            customer_name: name,
            customer_email: email,
            phone: phone || "",
            address: address || "",
            items: state.cart,
          },
          callback: (r) => {
            if (r.message && r.message.status === "ok") resolve(r.message);
            else reject(new Error(r.message?.error || "Something went wrong."));
          },
          error: reject,
        });
      });

      state.orderName = result.order_name;
      state.cart = [];
      saveCart();
      state.drawerMode = "success";
      renderDrawerContent();
      renderCartCount();
    } catch (err) {
      showCheckoutError(err.message || "Something went wrong. Please try again.");
    } finally {
      setOrderButtonLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER CART COUNT
  // ─────────────────────────────────────────────────────────────
  function renderCartCount() {
    const el = document.getElementById("cart-count");
    if (el) el.textContent = cartCount();
  }

  // ─────────────────────────────────────────────────────────────
  // PARTIAL RE-RENDER: Main content only
  // ─────────────────────────────────────────────────────────────
  function renderProductsSectionIntoMain() {
    const main = document.querySelector(".store-main");
    if (main) {
      main.innerHTML = renderProductsSection();
      bindProductEvents();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────────────────────────
  function init() {
    const app = document.getElementById("store-app");
    if (!app) return;

    // If products were rendered server-side via Jinja, extract them
    const dataEl = document.getElementById("store-data");
    if (dataEl) {
      try {
        state.products = JSON.parse(dataEl.textContent);
      } catch (e) {
        state.products = [];
      }
      render();
      return;
    }

    // Otherwise show loading
    render();
  }

  // Wait for frappe to be ready
  if (typeof frappe !== "undefined") {
    frappe.ready(init);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      if (typeof frappe !== "undefined") frappe.ready(init);
      else init();
    });
  }
})();
