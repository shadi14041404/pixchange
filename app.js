"use strict";

const APP_STORAGE_KEYS = {
  theme: "pixchange_theme",
  products: "pixchange_products",
  user: "pixchange_user"
};

const DEFAULT_PRODUCTS = [
  {
    id: "product-1",
    title: "آيفون 15 برو",
    price: 4.5,
    city: "مكة المكرمة",
    category: "electronics",
    description: "جهاز بحالة ممتازة مع كامل أغراضه.",
    featured: true,
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80",
    createdAt: Date.now() - 1000
  },
  {
    id: "product-2",
    title: "كامارو ZL1",
    price: 120,
    city: "جدة",
    category: "cars",
    description: "سيارة نظيفة وجاهزة للفحص.",
    featured: true,
    image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=80",
    createdAt: Date.now() - 2000
  },
  {
    id: "product-3",
    title: "كنبة منزلية",
    price: 2.25,
    city: "الرياض",
    category: "home",
    description: "كنبة نظيفة بحالة ممتازة.",
    featured: false,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80",
    createdAt: Date.now() - 3000
  },
  {
    id: "product-4",
    title: "ساعة ذكية",
    price: 1.1,
    city: "المدينة المنورة",
    category: "electronics",
    description: "ساعة ذكية جديدة بالكرتون.",
    featured: false,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
    createdAt: Date.now() - 4000
  }
];

const state = {
  products: [],
  deferredInstallPrompt: null
};

document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
  loadTheme();
  initializeProducts();
  bindEvents();
  updateYear();
  renderProducts();
  updateStatistics();
  finishLoading();
}

function initializeProducts() {
  const savedProducts = safeReadJSON(APP_STORAGE_KEYS.products, null);

  if (Array.isArray(savedProducts)) {
    state.products = savedProducts;
    return;
  }

  state.products = DEFAULT_PRODUCTS;
  saveProducts();
}

function saveProducts() {
  localStorage.setItem(
    APP_STORAGE_KEYS.products,
    JSON.stringify(state.products)
  );
}

function bindEvents() {
  bindClick("themeToggle", toggleTheme);
  bindClick("accountButton", openAccountModal);
  bindClick("mobileAccountButton", openAccountModal);
  bindClick("closeAccountModal", closeAccountModal);
  bindClick("temporaryLoginButton", handleTemporaryLogin);

  bindClick("addProductHeroButton", openAddProductModal);
  bindClick("emptyAddProductButton", openAddProductModal);
  bindClick("sellerAddProductButton", openAddProductModal);
  bindClick("footerAddProductButton", openAddProductModal);
  bindClick("mobileAddProductButton", openAddProductModal);
  bindClick("closeAddProductModal", closeAddProductModal);

  bindClick("notificationButton", () => {
    showToast("لا توجد إشعارات جديدة حاليًا.");
  });

  bindClick("mobileMessagesButton", () => {
    showToast("سيتم فتح الرسائل بعد تسجيل الدخول.");
  });

  bindClick("termsButton", () => {
    showToast("سيتم إضافة الشروط والأحكام في صفحة مستقلة.");
  });

  bindClick("reportProblemButton", () => {
    window.location.href =
      "mailto:support@saudipigcv.com?subject=بلاغ عن مشكلة في PiXchange";
  });

  bindClick("installAppButton", installApplication);

  const heroSearchForm = document.getElementById("heroSearchForm");

  if (heroSearchForm) {
    heroSearchForm.addEventListener("submit", handleSearch);
  }

  const quickProductForm = document.getElementById("quickProductForm");

  if (quickProductForm) {
    quickProductForm.addEventListener("submit", handleProductSubmission);
  }

  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.classList.add("hidden");
        unlockBodyScroll();
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;

    const installButton = document.getElementById("installAppButton");

    if (installButton) {
      installButton.classList.remove("hidden");
    }
  });
}

function bindClick(elementId, handler) {
  const element = document.getElementById(elementId);

  if (element) {
    element.addEventListener("click", handler);
  }
}

function renderProducts() {
  const featuredProducts = state.products
    .filter((product) => product.featured)
    .slice(0, 4);

  const latestProducts = [...state.products]
    .sort((first, second) => second.createdAt - first.createdAt)
    .slice(0, 8);

  renderProductCollection(
    "featuredProductsGrid",
    "featuredProductsSkeleton",
    "featuredEmptyState",
    featuredProducts
  );

  renderProductCollection(
    "latestProductsGrid",
    "latestProductsSkeleton",
    "latestEmptyState",
    latestProducts
  );
}

function renderProductCollection(
  gridId,
  skeletonId,
  emptyStateId,
  products
) {
  const grid = document.getElementById(gridId);
  const skeleton = document.getElementById(skeletonId);
  const emptyState = document.getElementById(emptyStateId);

  if (!grid) {
    return;
  }

  if (skeleton) {
    skeleton.classList.add("hidden");
  }

  grid.innerHTML = "";

  if (!products.length) {
    if (emptyState) {
      emptyState.classList.remove("hidden");
    }

    return;
  }

  if (emptyState) {
    emptyState.classList.add("hidden");
  }

  products.forEach((product) => {
    grid.appendChild(createProductCard(product));
  });
}

function createProductCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";

  article.innerHTML = `
    <div class="product-image">
      <img
        src="${escapeHTML(product.image)}"
        alt="${escapeHTML(product.title)}"
        loading="lazy"
      >
    </div>

    <div class="product-body">
      <h3 class="product-title">
        ${escapeHTML(product.title)}
      </h3>

      <div class="product-price">
        ${formatPi(product.price)}
      </div>

      <p class="product-location">
        📍 ${escapeHTML(product.city)}
      </p>

      <div class="product-footer">
        <button
          class="account-button product-details-button"
          type="button"
        >
          التفاصيل
        </button>

        <button
          class="icon-button favorite-button"
          type="button"
          aria-label="إضافة للمفضلة"
        >
          ♡
        </button>
      </div>
    </div>
  `;

  const detailsButton = article.querySelector(
    ".product-details-button"
  );

  const favoriteButton = article.querySelector(
    ".favorite-button"
  );

  detailsButton.addEventListener("click", () => {
    showProductDetails(product);
  });

  favoriteButton.addEventListener("click", () => {
    favoriteButton.textContent =
      favoriteButton.textContent.trim() === "♡" ? "♥" : "♡";

    showToast(
      favoriteButton.textContent === "♥"
        ? "تمت إضافة المنتج إلى المفضلة."
        : "تمت إزالة المنتج من المفضلة."
    );
  });

  return article;
}

function showProductDetails(product) {
  alert(
    `${product.title}\n\n` +
    `السعر: ${formatPi(product.price)}\n` +
    `المدينة: ${product.city}\n\n` +
    `${product.description}`
  );
}

function handleSearch(event) {
  event.preventDefault();

  const input = document.getElementById("heroSearchInput");
  const searchTerm = input?.value.trim().toLowerCase();

  if (!searchTerm) {
    showToast("اكتب اسم المنتج الذي تبحث عنه.");
    input?.focus();
    return;
  }

  const results = state.products.filter((product) => {
    return (
      product.title.toLowerCase().includes(searchTerm) ||
      product.city.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm)
    );
  });

  if (!results.length) {
    showToast("لم نجد منتجات مطابقة لبحثك.");
    return;
  }

  renderProductCollection(
    "latestProductsGrid",
    "latestProductsSkeleton",
    "latestEmptyState",
    results
  );

  document
    .getElementById("latestProductsGrid")
    ?.scrollIntoView({ behavior: "smooth" });

  showToast(`تم العثور على ${results.length} منتج.`);
}

function handleProductSubmission(event) {
  event.preventDefault();

  const title = getInputValue("productTitle");
  const price = Number(getInputValue("productPrice"));
  const category = getInputValue("productCategory");
  const city = getInputValue("productCity");
  const description = getInputValue("productDescription");

  if (
    !title ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !category ||
    !city ||
    !description
  ) {
    showToast("أكمل جميع بيانات المنتج بشكل صحيح.", "error");
    return;
  }

  const product = {
    id: `product-${Date.now()}`,
    title,
    price,
    category,
    city,
    description,
    featured: false,
    image:
      "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=900&q=80",
    createdAt: Date.now()
  };

  state.products.unshift(product);
  saveProducts();
  renderProducts();
  updateStatistics();

  event.currentTarget.reset();
  closeAddProductModal();

  showToast("تم نشر المنتج بنجاح.");
}

function updateStatistics() {
  setText("productsCount", state.products.length);
  setText("usersCount", getRegisteredUsersCount());
  setText("ordersCount", 0);
  setText("citiesCount", countUniqueCities());
}

function getRegisteredUsersCount() {
  const user = safeReadJSON(APP_STORAGE_KEYS.user, null);
  return user ? 1 : 0;
}

function countUniqueCities() {
  return new Set(
    state.products
      .map((product) => product.city.trim())
      .filter(Boolean)
  ).size;
}

function handleTemporaryLogin() {
  const user = {
    id: `user-${Date.now()}`,
    name: "مستخدم PiXchange",
    createdAt: Date.now()
  };

  localStorage.setItem(
    APP_STORAGE_KEYS.user,
    JSON.stringify(user)
  );

  setText("accountButtonText", "حسابي");
  closeAccountModal();
  updateStatistics();
  showToast("تم تسجيل الدخول.");
}

function openAccountModal() {
  const currentUser = safeReadJSON(
    APP_STORAGE_KEYS.user,
    null
  );

  if (currentUser) {
    showToast(`مرحبًا ${currentUser.name}`);
    return;
  }

  openModal("accountModal");
}

function closeAccountModal() {
  closeModal("accountModal");
}

function openAddProductModal() {
  openModal("addProductModal");
}

function closeAddProductModal() {
  closeModal("addProductModal");
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);

  if (!modal) {
    return;
  }

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);

  if (!modal) {
    return;
  }

  modal.classList.add("hidden");
  unlockBodyScroll();
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.classList.add("hidden");
  });

  unlockBodyScroll();
}

function unlockBodyScroll() {
  document.body.style.overflow = "";
}

function loadTheme() {
  const savedTheme =
    localStorage.getItem(APP_STORAGE_KEYS.theme) || "light";

  document.documentElement.dataset.theme = savedTheme;
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme =
    document.documentElement.dataset.theme || "light";

  const newTheme =
    currentTheme === "dark" ? "light" : "dark";

  document.documentElement.dataset.theme = newTheme;
  localStorage.setItem(APP_STORAGE_KEYS.theme, newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById("themeIcon");

  if (icon) {
    icon.textContent = theme === "dark" ? "☀" : "☾";
  }
}

async function installApplication() {
  if (!state.deferredInstallPrompt) {
    showToast(
      "استخدم خيار إضافة إلى الشاشة الرئيسية من قائمة المتصفح."
    );
    return;
  }

  state.deferredInstallPrompt.prompt();

  await state.deferredInstallPrompt.userChoice;

  state.deferredInstallPrompt = null;

  document
    .getElementById("installAppButton")
    ?.classList.add("hidden");
}

function finishLoading() {
  window.setTimeout(() => {
    document
      .getElementById("appLoader")
      ?.classList.add("hidden");
  }, 400);
}

function updateYear() {
  setText("currentYear", new Date().getFullYear());
}

function showToast(message, type = "success") {
  const container = document.getElementById(
    "toastContainer"
  );

  if (!container) {
    return;
  }

  const toast = document.createElement("div");

  toast.style.cssText = `
    background:${type === "error" ? "#e74c3c" : "#222"};
    color:#fff;
    padding:14px 18px;
    border-radius:12px;
    box-shadow:0 10px 30px rgba(0,0,0,.2);
    margin-top:10px;
    font-weight:700;
    max-width:330px;
  `;

  toast.textContent = message;
  container.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3000);
}

function formatPi(value) {
  const formatter = new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 2
  });

  return `${formatter.format(value)} Pi`;
}

function getInputValue(elementId) {
  return document.getElementById(elementId)?.value.trim() || "";
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = value;
  }
}

function safeReadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);

    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
