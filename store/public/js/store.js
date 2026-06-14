/**
 * ERPNext Store — store.js
 * Vanilla JS SPA served at /store
 * Theme from erpnext-store, adapted for current app backend (store.api.*)
 */
(function () {
  "use strict";

  // ─────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────
  const state = {
    settings: {},
    categories: [],
    products: [],
    total: 0,
    page: 1,
    pageSize: 20,
    activeCategory: null,
    cart: JSON.parse(localStorage.getItem("store_cart") || "[]"),
    drawerMode: null, // "cart" | "auth" | "product" | "success"
    selectedProduct: null,
    selectedQty: 1,
    authTab: "register",
    loading: false,
    orderName: null,
  };

  // ─────────────────────────────────────────────────────────────────
  // FRAPPE CALL HELPER
  // ─────────────────────────────────────────────────────────────────
  function api(method, args = {}) {
    return new Promise((resolve, reject) => {
      frappe.call({
        method: `store.api.${method}`,
        args,
        callback: (r) => {
          if (r && r.message !== undefined) resolve(r.message);
          else reject(r);
        },
        error: reject,
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // CART HELPERS
  // ─────────────────────────────────────────────────────────────────
  function saveCart() {
    localStorage.setItem("store_cart", JSON.stringify(state.cart));
  }

  function cartTotal() {
    return state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  }

  function cartCount() {
    return state.cart.reduce((s, i) => s + i.qty, 0);
  }

  function addToCart(product, qty = 1) {
    const existing = state.cart.find((i) => i.item_code === product.name);
    if (existing) {
      existing.qty += qty;
    } else {
      state.cart.push({
        item_code: product.name,
        item_name: product.item_name,
        price: product.price,
        currency: product.currency,
        image: product.image,
        qty,
      });
    }
    saveCart();
    renderCartCount();
    toast(`Added "${product.item_name}" to cart`, "ti-shopping-cart");
  }

  function removeFromCart(itemCode) {
    state.cart = state.cart.filter((i) => i.item_code !== itemCode);
    saveCart();
    renderCartCount();
    renderCartItems();
  }

  function changeQty(itemCode, delta) {
    const item = state.cart.find((i) => i.item_code === itemCode);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart();
    renderCartCount();
    renderCartItems();
  }

  // ─────────────────────────────────────────────────────────────────
  // FORMATTERS
  // ─────────────────────────────────────────────────────────────────
  function formatPrice(price, currency) {
    const cur = currency || state.settings.currency || "USD";
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(price);
  }

  function esc(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ─────────────────────────────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────────────────────────────
  let toastTimer;
  function toast(msg, icon = "ti-check") {
    let el = document.getElementById("store-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "store-toast";
      el.className = "store-toast";
      document.body.appendChild(el);
    }
    el.innerHTML = `<i class="ti ${icon}" aria-hidden="true"></i> ${msg}`;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────
  function renderCartCount() {
    const el = document.getElementById("cart-count");
    if (el) el.textContent = cartCount();
  }

  function productImage(product) {
    if (product.image) {
      return `<img src="${esc(product.image)}" alt="${esc(product.item_name)}" loading="lazy">`;
    }
    return `<div class="product-img-placeholder"><i class="ti ti-photo-off" aria-hidden="true"></i></div>`;
  }

  // ─────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────
  function render() {
    const app = document.getElementById("store-app");
    app.innerHTML = `
      ${renderNav()}
      ${renderHero()}
      <div class="store-body">
        ${renderSidebar()}
        <main class="store-main">
          ${renderProductsSection()}
        </main>
      </div>
      ${renderOverlay()}
      ${renderDrawer()}
    `;
    bindNavEvents();
    bindSidebarEvents();
    bindProductEvents();
    bindDrawerEvents();
    renderCartCount();
  }

  function renderNav() {
    return `
      <nav class="store-nav" role="navigation">
        <div class="store-nav-inner">
          <span class="store-logo" id="nav-logo">${esc(state.settings.store_name || "Store")}</span>
          <div class="store-nav-actions">
            <button class="btn-nav-link" id="btn-login" aria-label="Login">
              <i class="ti ti-user" aria-hidden="true"></i>
              Login
            </button>
            <button class="btn-cart" id="btn-cart" aria-label="Open cart">
              <i class="ti ti-shopping-cart" aria-hidden="true"></i>
              Cart
              <span class="cart-count" id="cart-count">${cartCount()}</span>
            </button>
          </div>
        </div>
      </nav>
    `;
  }

  function renderHero() {
    if (state.activeCategory) return "";
    return `
      <div class="store-hero">
        <h1>${esc(state.settings.store_name || "Welcome to Our Store")}</h1>
        ${state.settings.store_tagline ? `<p>${esc(state.settings.store_tagline)}</p>` : ""}
      </div>
    `;
  }

  function renderSidebar() {
    const items = state.categories.map((cat) => `
      <li class="category-item ${state.activeCategory === cat.name ? "active" : ""}"
          data-category="${esc(cat.name)}" role="button" tabindex="0"
          aria-pressed="${state.activeCategory === cat.name}">
        <i class="ti ${cat.icon || "ti-tag"}" aria-hidden="true"></i>
        ${esc(cat.category_name)}
      </li>
    `).join("");

    return `
      <aside class="store-sidebar">
        <p class="sidebar-title">Categories</p>
        <ul class="category-list" role="list">
          <li class="category-item ${!state.activeCategory ? "active" : ""}"
              data-category="" role="button" tabindex="0">
            <i class="ti ti-layout-grid" aria-hidden="true"></i>
            All Products
          </li>
          ${items}
        </ul>
      </aside>
    `;
  }

  function renderProductsSection() {
    const catLabel = state.activeCategory
      ? (state.categories.find((c) => c.name === state.activeCategory)?.category_name || state.activeCategory)
      : "All Products";

    if (state.loading) {
      return `<div class="store-loading"><div class="loading-spinner"></div><p>Loading products\u2026</p></div>`;
    }

    if (state.products.length === 0) {
      return `
        <div class="products-header">
          <h2>${esc(catLabel)}</h2>
        </div>
        <div class="state-empty">
          <i class="ti ti-package-off" aria-hidden="true"></i>
          <p>No products found.</p>
        </div>
      `;
    }

    const cards = state.products.map((p) => `
      <article class="product-card" data-item="${esc(p.name)}" tabindex="0" role="button"
               aria-label="View ${esc(p.item_name)}">
        <div class="product-img">${productImage(p)}</div>
        <div class="product-info">
          <p class="product-name">${esc(p.item_name)}</p>
          <p class="product-group">${esc(p.item_group || "")}</p>
          <div class="product-footer">
            <span class="product-price">${formatPrice(p.price, p.currency)}</span>
            <button class="btn-add" data-item="${esc(p.name)}" aria-label="Add ${esc(p.item_name)} to cart">
              <i class="ti ti-plus" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </article>
    `).join("");

    const totalPages = Math.ceil(state.total / state.pageSize);
    const pagination = totalPages > 1 ? renderPagination(totalPages) : "";

    return `
      <div class="products-header">
        <h2>${esc(catLabel)}</h2>
        <span class="products-count">${state.total} product${state.total !== 1 ? "s" : ""}</span>
      </div>
      <div class="product-grid" role="list">${cards}</div>
      ${pagination}
    `;
  }

  function renderPagination(totalPages) {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(`
        <button class="page-btn ${i === state.page ? "active" : ""}"
                data-page="${i}" ${i === state.page ? "aria-current='page'" : ""}>
          ${i}
        </button>
      `);
    }
    return `
      <nav class="pagination" aria-label="Pagination">
        <button class="page-btn" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>
          <i class="ti ti-chevron-left" aria-hidden="true"></i>
        </button>
        ${pages.join("")}
        <button class="page-btn" data-page="${state.page + 1}" ${state.page === totalPages ? "disabled" : ""}>
          <i class="ti ti-chevron-right" aria-hidden="true"></i>
        </button>
      </nav>
    `;
  }

  // ─────────────────────────────────────────────────────────────────
  // DRAWER
  // ─────────────────────────────────────────────────────────────────
  function renderOverlay() {
    return `<div class="store-overlay ${state.drawerMode ? "open" : ""}" id="store-overlay"></div>`;
  }

  function renderDrawer() {
    if (!state.drawerMode) {
      return `<div class="store-drawer" id="store-drawer"></div>`;
    }
    const content = {
      cart: renderCartDrawer,
      auth: renderAuthDrawer,
      product: renderProductDrawer,
      success: renderSuccessDrawer,
    }[state.drawerMode];

    return `
      <div class="store-drawer open" id="store-drawer" role="dialog" aria-modal="true">
        ${content ? content() : ""}
      </div>
    `;
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
      <div class="drawer-body" id="cart-items-wrap">
        ${hasItems ? renderCartItems() : renderCartEmpty()}
      </div>
      ${hasItems ? `
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
      ` : ""}
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
    return state.cart.map((item) => `
      <div class="cart-item" data-item="${esc(item.item_code)}">
        <div class="cart-item-img">
          ${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.item_name)}">` : `<i class="ti ti-photo-off" style="font-size:24px;color:#d1d5db"></i>`}
        </div>
        <div class="cart-item-info">
          <p class="cart-item-name">${esc(item.item_name)}</p>
          <p class="cart-item-price">${formatPrice(item.price, item.currency)} each</p>
          <div class="cart-item-controls">
            <button class="qty-btn" data-action="decrease" data-item="${esc(item.item_code)}" aria-label="Decrease quantity">\u2212</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" data-action="increase" data-item="${esc(item.item_code)}" aria-label="Increase quantity">+</button>
            <button class="btn-remove" data-action="remove" data-item="${esc(item.item_code)}" aria-label="Remove item">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </div>
        <div style="text-align:right;font-weight:700;font-size:14px;white-space:nowrap">
          ${formatPrice(item.price * item.qty, item.currency)}
        </div>
      </div>
    `).join("");
  }

  function renderAuthDrawer() {
    return `
      <div class="drawer-header">
        <h3>Checkout</h3>
        <button class="btn-close" id="btn-close-drawer" aria-label="Close">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="drawer-body">
        ${renderCheckoutForm()}
      </div>
    `;
  }

  function renderCheckoutForm() {
    return `
      <form id="checkout-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="reg-first">First name</label>
            <input class="form-input" id="reg-first" name="first_name" type="text" required placeholder="Jane">
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-last">Last name</label>
            <input class="form-input" id="reg-last" name="last_name" type="text" required placeholder="Smith">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-email">Email</label>
          <input class="form-input" id="reg-email" name="email" type="email" required placeholder="jane@example.com">
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-phone">Phone</label>
          <input class="form-input" id="reg-phone" name="phone" type="tel" placeholder="+1 555 000 0000">
        </div>
        <div id="auth-error" class="form-error" style="display:none"></div>
        <button type="submit" class="btn-primary" style="width:100%;padding:14px;margin-top:8px" id="btn-submit-auth">
          Place Order
        </button>
        <p class="form-hint" style="text-align:center;margin-top:12px">
          Your order will be placed immediately. No account required.
        </p>
      </form>
    `;
  }

  function renderProductDrawer() {
    const p = state.selectedProduct;
    if (!p) return "";
    return `
      <div class="drawer-header">
        <h3 style="font-size:15px">${esc(p.item_name)}</h3>
        <button class="btn-close" id="btn-close-drawer" aria-label="Close">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="drawer-body">
        ${p.image
          ? `<div class="product-detail-img"><img src="${esc(p.image)}" alt="${esc(p.item_name)}"></div>`
          : `<div class="product-detail-img-ph"><i class="ti ti-photo-off" aria-hidden="true"></i></div>`}
        <p class="product-detail-name">${esc(p.item_name)}</p>
        <p class="product-detail-group">${esc(p.item_group || "")}</p>
        <p class="product-detail-price">${formatPrice(p.price, p.currency)}</p>
        ${p.description ? `<p class="product-detail-desc">${esc(p.description)}</p>` : ""}
        <div class="qty-selector">
          <label for="detail-qty">Quantity</label>
          <input class="qty-input" id="detail-qty" type="number" min="1" value="${state.selectedQty}">
        </div>
        <button class="btn-primary" id="btn-add-to-cart-detail" style="width:100%;padding:14px">
          <i class="ti ti-shopping-cart-plus" aria-hidden="true"></i>
          Add to Cart \u2014 ${formatPrice(p.price * state.selectedQty, p.currency)}
        </button>
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

  // ────────────────────────────────────────────────────────────────
  // EVENT BINDING
  // ─────────────────────────────────────────────────────────────────
  function checkLoginStatus() {
    if (typeof frappe !== "undefined" && frappe.session && frappe.session.user && frappe.session.user !== "Guest") {
      const btn = document.getElementById("btn-login");
      if (btn) {
        btn.innerHTML = `<i class="ti ti-user-check" aria-hidden="true"></i> ${esc(frappe.session.full_name || frappe.session.user)}`;
      }
    }
  }

  function bindNavEvents() {
    document.getElementById("nav-logo")?.addEventListener("click", () => {
      state.activeCategory = null;
      state.page = 1;
      loadProducts();
    });

    document.getElementById("btn-cart")?.addEventListener("click", openCart);
    document.getElementById("btn-login")?.addEventListener("click", () => {
      if (frappe.session && frappe.session.user && frappe.session.user !== "Guest") {
        window.location.href = "/logout";
      } else {
        window.location.href = "/login?redirect-to=/store";
      }
    });
  }

  function bindSidebarEvents() {
    document.querySelectorAll(".category-item").forEach((el) => {
      el.addEventListener("click", () => {
        state.activeCategory = el.dataset.category || null;
        state.page = 1;
        loadProducts();
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") el.click();
      });
    });

    // Show login button as user name if already logged in
    checkLoginStatus();
  }

  function bindProductEvents() {
    document.querySelectorAll(".product-card").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.closest(".btn-add")) return;
        openProductDetail(el.dataset.item);
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") openProductDetail(el.dataset.item);
      });
    });

    document.querySelectorAll(".btn-add").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const itemCode = btn.dataset.item;
        const product = state.products.find((p) => p.name === itemCode);
        if (product) addToCart(product, 1);
      });
    });

    document.querySelectorAll(".page-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = parseInt(btn.dataset.page);
        if (!isNaN(p) && p !== state.page) {
          state.page = p;
          loadProducts();
        }
      });
    });
  }

  function bindDrawerEvents() {
    document.getElementById("store-overlay")?.addEventListener("click", closeDrawer);
    document.getElementById("btn-close-drawer")?.addEventListener("click", closeDrawer);

    document.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = btn.dataset.item;
        if (btn.dataset.action === "increase") changeQty(code, 1);
        else changeQty(code, -1);
      });
    });

    document.querySelectorAll("[data-action='remove']").forEach((btn) => {
      btn.addEventListener("click", () => removeFromCart(btn.dataset.item));
    });

    document.getElementById("btn-checkout")?.addEventListener("click", () => {
      state.drawerMode = "auth";
      state.authTab = "register";
      updateDrawer();
    });

    document.getElementById("checkout-form")?.addEventListener("submit", handlePlaceOrder);

    document.getElementById("detail-qty")?.addEventListener("input", (e) => {
      state.selectedQty = Math.max(1, parseInt(e.target.value) || 1);
      const btn = document.getElementById("btn-add-to-cart-detail");
      if (btn && state.selectedProduct) {
        btn.innerHTML = `<i class="ti ti-shopping-cart-plus" aria-hidden="true"></i> Add to Cart \u2014 ${formatPrice(state.selectedProduct.price * state.selectedQty, state.selectedProduct.currency)}`;
      }
    });

    document.getElementById("btn-add-to-cart-detail")?.addEventListener("click", () => {
      if (state.selectedProduct) {
        addToCart(state.selectedProduct, state.selectedQty);
        closeDrawer();
      }
    });

    document.getElementById("btn-continue-shopping")?.addEventListener("click", closeDrawer);
  }

  // ─────────────────────────────────────────────────────────────────
  // DRAWER STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────
  function openCart() {
    state.drawerMode = "cart";
    updateDrawer();
  }

  function closeDrawer() {
    state.drawerMode = null;
    updateDrawer();
  }

  function updateDrawer() {
    const overlay = document.getElementById("store-overlay");
    const drawer = document.getElementById("store-drawer");
    if (overlay) {
      overlay.className = `store-overlay ${state.drawerMode ? "open" : ""}`;
    }
    if (drawer) {
      if (state.drawerMode) {
        const content = {
          cart: renderCartDrawer,
          auth: renderAuthDrawer,
          product: renderProductDrawer,
          success: renderSuccessDrawer,
        }[state.drawerMode];
        drawer.innerHTML = content ? content() : "";
        drawer.className = "store-drawer open";
      } else {
        drawer.innerHTML = "";
        drawer.className = "store-drawer";
      }
      bindDrawerEvents();
    }
  }

  async function openProductDetail(itemCode) {
    state.selectedQty = 1;
    let product = state.products.find((p) => p.name === itemCode);
    if (!product) {
      try {
        product = await api("get_product", { item_code: itemCode });
      } catch (e) {
        toast("Could not load product details.", "ti-alert-circle");
        return;
      }
    }
    state.selectedProduct = product;
    state.drawerMode = "product";
    updateDrawer();
  }

  // ─────────────────────────────────────────────────────────────────
  // CHECKOUT HANDLER
  // ─────────────────────────────────────────────────────────────────
  function showAuthError(msg) {
    const el = document.getElementById("auth-error");
    if (el) { el.textContent = msg; el.style.display = "block"; }
  }

  function setSubmitLoading(loading) {
    const btn = document.getElementById("btn-submit-auth");
    if (btn) {
      btn.disabled = loading;
      btn.textContent = loading ? "Placing order\u2026" : "Place Order";
    }
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    const first_name = document.getElementById("reg-first")?.value?.trim();
    const last_name = document.getElementById("reg-last")?.value?.trim();
    const email = document.getElementById("reg-email")?.value?.trim();
    const phone = document.getElementById("reg-phone")?.value?.trim();

    if (!first_name || !last_name || !email) {
      showAuthError("Please fill in name and email.");
      return;
    }

    setSubmitLoading(true);
    try {
      const result = await api("register_and_place_order", {
        first_name,
        last_name,
        email,
        phone: phone || "",
        password: "", // not used by backend
        cart_items: JSON.stringify(state.cart.map((i) => ({ item_code: i.item_code, qty: i.qty }))),
      });
      state.orderName = result.order_name;
      state.cart = [];
      saveCart();
      state.drawerMode = "success";
      updateDrawer();
    } catch (err) {
      showAuthError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────────────
  async function loadProducts() {
    state.loading = true;
    renderMainContent();

    try {
      const result = await api("get_products", {
        category: state.activeCategory || "",
        search: "",
        page: state.page,
        page_size: state.pageSize,
      });
      state.products = result.items;
      state.total = result.total;
    } catch (e) {
      state.products = [];
      state.total = 0;
    } finally {
      state.loading = false;
      renderMainContent();
    }
  }

  function renderMainContent() {
    const main = document.querySelector(".store-main");
    if (main) {
      main.innerHTML = renderProductsSection();
      bindProductEvents();
    }
    document.querySelectorAll(".category-item").forEach((el) => {
      const cat = el.dataset.category;
      el.classList.toggle("active", cat === (state.activeCategory || ""));
    });
    const hero = document.querySelector(".store-hero");
    if (hero && state.activeCategory) hero.style.display = "none";
    else if (hero) hero.style.display = "";
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER CART COUNT
  // ─────────────────────────────────────────────────────────────────
  function renderCartCount() {
    const el = document.getElementById("cart-count");
    if (el) el.textContent = cartCount();
  }

  // ─────────────────────────────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────────────────────────────
  async function init() {
    try {
      const [settings, categories, productsResult] = await Promise.all([
        api("get_store_settings"),
        api("get_categories"),
        api("get_products", { page: 1, page_size: 20 }),
      ]);

      state.settings = settings;
      state.categories = categories;
      state.products = productsResult.items;
      state.total = productsResult.total;
    } catch (e) {
      console.error("Store init failed:", e);
    }

    render();
  }

  if (typeof frappe !== "undefined") {
    frappe.ready(init);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      if (typeof frappe !== "undefined") frappe.ready(init);
      else init();
    });
  }
})();
