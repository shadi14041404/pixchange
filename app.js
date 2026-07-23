"use strict";

import {
  db,
  initializeFirebase,
  loginWithGoogle,
  logoutUser,
  watchAuthentication,
  getCurrentUser,
  getFirebaseErrorMessage
} from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  getCountFromServer
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const COLLECTIONS = {
  products: "products",
  users: "users",
  favorites: "favorites",
  orders: "orders"
};

const STORAGE_KEYS = {
  theme: "pixchange_theme",
  favorites: "pixchange_favorites"
};

const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1000&q=80";

const DEMO_PRODUCTS = [
  {
    id: "demo-1",
    title: "آيفون 15 برو",
    price: 4.5,
    city: "مكة المكرمة",
    category: "electronics",
    description: "جهاز بحالة ممتازة مع كامل أغراضه.",
    featured: true,
    image:
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1000&q=80",
    sellerName: "مستخدم PiXchange",
    sellerId: "demo",
    createdAt: new Date(Date.now() - 1000)
  },
  {
    id: "demo-2",
    title: "كامارو ZL1",
    price: 120,
    city: "جدة",
    category: "cars",
    description: "سيارة نظيفة وجاهزة للفحص والمعاينة.",
    featured: true,
    image:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1000&q=80",
    sellerName: "مستخدم PiXchange",
    sellerId: "demo",
    createdAt: new Date(Date.now() - 2000)
  },
  {
    id: "demo-3",
    title: "كنبة منزلية",
    price: 2.25,
    city: "الرياض",
    category: "home",
    description: "كنبة نظيفة بحالة ممتازة.",
    featured: false,
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=80",
    sellerName: "مستخدم PiXchange",
    sellerId: "demo",
    createdAt: new Date(Date.now() - 3000)
  },
  {
    id: "demo-4",
    title: "ساعة ذكية",
    price: 1.1,
    city: "المدينة المنورة",
    category: "electronics",
    description: "ساعة ذكية جديدة بالكرتون.",
    featured: false,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80",
    sellerName: "مستخدم PiXchange",
    sellerId: "demo",
    createdAt: new Date(Date.now() - 4000)
  }
];

const state = {
  products: [],
  currentUser: null,
  favorites: new Set(),
  deferredInstallPrompt: null,
  loadingProducts: false
};

document.addEventListener("DOMContentLoaded", initializeApplication);

async function initializeApplication() {
  loadTheme();
  loadLocalFavorites();
  bindEvents();
  updateYear();
  initializeInstallPrompt();

  const firebaseReady = await initializeFirebase();

  if (!firebaseReady) {
    showToast("تعذر تهيئة الاتصال بقاعدة البيانات.", "error");
  }

  watchAuthentication(handleAuthenticationChange);

  await loadProducts();
  await updateStatistics();

  finishLoading();
}

function bindEvents() {
  bindClick("themeToggle", toggleTheme);

  bindClick("accountButton", handleAccountButton);
  bindClick("mobileAccountButton", handleAccountButton);
  bindClick("temporaryLoginButton", handleGoogleLogin);
  bindClick("closeAccountModal", closeAccountModal);

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
    if (!state.currentUser) {
      showToast("سجل الدخول أولًا لعرض الرسائل.", "error");
      openAccountModal();
      return;
    }

    showToast("سيتم تفعيل المحادثات في المرحلة القادمة.");
  });

  bindClick("termsButton", () => {
    showToast("سيتم إضافة صفحة الشروط والأحكام قريبًا.");
  });

  bindClick("reportProblemButton", () => {
    window.location.href =
      "mailto:support@saudipigcv.com?subject=بلاغ عن مشكلة في PiXchange";
  });

  bindClick("installAppButton", installApplication);

  const searchForm = document.getElementById("heroSearchForm");

  if (searchForm) {
    searchForm.addEventListener("submit", handleSearch);
  }

  const productForm = document.getElementById("quickProductForm");

  if (productForm) {
    productForm.addEventListener("submit", handleProductSubmission);
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
}

function bindClick(elementId, handler) {
  const element = document.getElementById(elementId);

  if (element) {
    element.addEventListener("click", handler);
  }
}

async function handleAuthenticationChange(user) {
  state.currentUser = user || null;

  updateAccountInterface();

  if (user) {
    await saveUserRecord(user);
    await loadCloudFavorites();
  } else {
    loadLocalFavorites();
  }

  renderProducts();
  await updateStatistics();
}

async function handleGoogleLogin() {
  const loginButton = document.getElementById("temporaryLoginButton");

  setButtonLoading(loginButton, true, "جاري تسجيل الدخول...");

  const result = await loginWithGoogle();

  setButtonLoading(loginButton, false, "تسجيل الدخول باستخدام Google");

  if (result.success) {
    if (!result.redirecting) {
      closeAccountModal();
      showToast("تم تسجيل الدخول بنجاح.");
    }

    return;
  }

  showToast(
    getFirebaseErrorMessage(result.error),
    "error"
  );
}

async function handleLogout() {
  const result = await logoutUser();

  if (result.success) {
    closeAccountModal();
    showToast("تم تسجيل الخروج.");
    return;
  }

  showToast(
    getFirebaseErrorMessage(result.error),
    "error"
  );
}

function handleAccountButton() {
  if (!state.currentUser) {
    openAccountModal();
    return;
  }

  showSignedInAccountModal();
}

function showSignedInAccountModal() {
  const modal = document.getElementById("accountModal");
  const card = modal?.querySelector(".modal-card");

  if (!modal || !card) {
    return;
  }

  const user = state.currentUser;
  const photo = user.photoURL
    ? `<img
        src="${escapeHTML(user.photoURL)}"
        alt="${escapeHTML(user.displayName || "المستخدم")}"
        style="
          width:80px;
          height:80px;
          border-radius:50%;
          object-fit:cover;
          margin:0 auto 16px;
        "
      >`
    : `<div class="modal-icon">👤</div>`;

  card.innerHTML = `
    <button
      id="closeSignedAccountModal"
      class="modal-close"
      type="button"
      aria-label="إغلاق"
    >
      ×
    </button>

    ${photo}

    <h2>
      ${escapeHTML(user.displayName || "مستخدم PiXchange")}
    </h2>

    <p style="direction:ltr;text-align:center;margin:12px 0 24px;">
      ${escapeHTML(user.email || "")}
    </p>

    <button
      id="logoutButton"
      class="primary-button full-button"
      type="button"
    >
      تسجيل الخروج
    </button>
  `;

  bindClick("closeSignedAccountModal", closeAccountModal);
  bindClick("logoutButton", handleLogout);

  openModal("accountModal");
}

function updateAccountInterface() {
  const accountText = document.getElementById("accountButtonText");

  if (accountText) {
    accountText.textContent = state.currentUser
      ? state.currentUser.displayName?.split(" ")[0] || "حسابي"
      : "دخول";
  }
}

async function saveUserRecord(user) {
  if (!user?.uid) {
    return;
  }

  try {
    await setDoc(
      doc(db, COLLECTIONS.users, user.uid),
      {
        uid: user.uid,
        name: user.displayName || "مستخدم PiXchange",
        email: user.email || "",
        photoURL: user.photoURL || "",
        lastSeenAt: serverTimestamp()
      },
      {
        merge: true
      }
    );
  } catch (error) {
    console.error("User record error:", error);
  }
}

async function loadProducts() {
  if (state.loadingProducts) {
    return;
  }

  state.loadingProducts = true;
  showProductSkeletons();

  try {
    const productsQuery = query(
      collection(db, COLLECTIONS.products),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const snapshot = await getDocs(productsQuery);

    state.products = snapshot.docs.map((productDocument) => {
      const data = productDocument.data();

      return {
        id: productDocument.id,
        ...data,
        createdAt: convertFirestoreDate(data.createdAt)
      };
    });

    if (!state.products.length) {
      state.products = [...DEMO_PRODUCTS];
    }
  } catch (error) {
    console.error("Products loading error:", error);

    state.products = [...DEMO_PRODUCTS];

    showToast(
      "تعذر جلب المنتجات من قاعدة البيانات، تم عرض بيانات تجريبية.",
      "error"
    );
  } finally {
    state.loadingProducts = false;
    renderProducts();
  }
}

function renderProducts() {
  const featuredProducts = state.products
    .filter((product) => product.featured === true)
    .slice(0, 4);

  const latestProducts = [...state.products]
    .sort((firstProduct, secondProduct) => {
      return (
        getTimeValue(secondProduct.createdAt) -
        getTimeValue(firstProduct.createdAt)
      );
    })
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

  skeleton?.classList.add("hidden");
  grid.innerHTML = "";

  if (!products.length) {
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");

  products.forEach((product) => {
    grid.appendChild(createProductCard(product));
  });
}

function createProductCard(product) {
  const article = document.createElement("article");
  const isFavorite = state.favorites.has(product.id);

  article.className = "product-card";

  article.innerHTML = `
    <div class="product-image">
      <img
        src="${escapeHTML(product.image || DEFAULT_PRODUCT_IMAGE)}"
        alt="${escapeHTML(product.title || "منتج")}"
        loading="lazy"
        onerror="this.src='${DEFAULT_PRODUCT_IMAGE}'"
      >

      ${
        product.featured
          ? `<span
              style="
                position:absolute;
                top:14px;
                right:14px;
                background:#5d2d91;
                color:#fff;
                padding:7px 12px;
                border-radius:999px;
                font-size:13px;
                font-weight:700;
              "
            >
              مميز
            </span>`
          : ""
      }
    </div>

    <div class="product-body">
      <h3 class="product-title">
        ${escapeHTML(product.title || "منتج بدون اسم")}
      </h3>

      <div class="product-price">
        ${formatPi(product.price)}
      </div>

      <p class="product-location">
        📍 ${escapeHTML(product.city || "غير محدد")}
      </p>

      <p
        style="
          color:#777;
          font-size:14px;
          margin-bottom:16px;
        "
      >
        البائع:
        ${escapeHTML(product.sellerName || "مستخدم PiXchange")}
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
          aria-label="المفضلة"
          data-product-id="${escapeHTML(product.id)}"
        >
          ${isFavorite ? "♥" : "♡"}
        </button>
      </div>
    </div>
  `;

  article.style.position = "relative";

  article
    .querySelector(".product-details-button")
    ?.addEventListener("click", () => {
      showProductDetails(product);
    });

  article
    .querySelector(".favorite-button")
    ?.addEventListener("click", async (event) => {
      await toggleFavorite(
        product.id,
        event.currentTarget
      );
    });

  return article;
}

function showProductDetails(product) {
  const existingModal = document.getElementById(
    "productDetailsModal"
  );

  existingModal?.remove();

  const modal = document.createElement("div");

  modal.id = "productDetailsModal";
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-card product-modal-card">
      <button
        id="closeProductDetailsModal"
        class="modal-close"
        type="button"
        aria-label="إغلاق"
      >
        ×
      </button>

      <img
        src="${escapeHTML(product.image || DEFAULT_PRODUCT_IMAGE)}"
        alt="${escapeHTML(product.title || "منتج")}"
        style="
          width:100%;
          height:260px;
          object-fit:cover;
          border-radius:16px;
          margin-bottom:20px;
        "
        onerror="this.src='${DEFAULT_PRODUCT_IMAGE}'"
      >

      <h2>${escapeHTML(product.title || "منتج")}</h2>

      <div class="product-price" style="margin:12px 0;">
        ${formatPi(product.price)}
      </div>

      <p style="margin-bottom:10px;">
        📍 ${escapeHTML(product.city || "غير محدد")}
      </p>

      <p style="margin-bottom:10px;">
        👤 ${escapeHTML(product.sellerName || "مستخدم PiXchange")}
      </p>

      <p style="color:#666;line-height:1.9;margin:20px 0;">
        ${escapeHTML(product.description || "لا يوجد وصف.")}
      </p>

      <button
        id="contactSellerButton"
        class="primary-button full-button"
        type="button"
      >
        التواصل مع البائع
      </button>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  bindClick("closeProductDetailsModal", () => {
    modal.remove();
    unlockBodyScroll();
  });

  bindClick("contactSellerButton", () => {
    if (!state.currentUser) {
      modal.remove();
      unlockBodyScroll();
      showToast("سجل الدخول أولًا للتواصل مع البائع.", "error");
      openAccountModal();
      return;
    }

    if (product.sellerId === state.currentUser.uid) {
      showToast("هذا المنتج مضاف بواسطة حسابك.");
      return;
    }

    showToast("سيتم تفعيل المحادثات في المرحلة القادمة.");
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.remove();
      unlockBodyScroll();
    }
  });
}

async function handleProductSubmission(event) {
  event.preventDefault();

  if (!state.currentUser) {
    closeAddProductModal();
    showToast("يجب تسجيل الدخول قبل إضافة منتج.", "error");
    openAccountModal();
    return;
  }

  const submitButton = event.currentTarget.querySelector(
    'button[type="submit"]'
  );

  const title = getInputValue("productTitle");
  const price = Number(getInputValue("productPrice"));
  const category = getInputValue("productCategory");
  const city = getInputValue("productCity");
  const description = getInputValue("productDescription");
  const image =
    getInputValue("productImageUrl") || DEFAULT_PRODUCT_IMAGE;

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

  setButtonLoading(submitButton, true, "جاري نشر المنتج...");

  try {
    await addDoc(
      collection(db, COLLECTIONS.products),
      {
        title: title.slice(0, 80),
        price,
        category,
        city: city.slice(0, 50),
        description: description.slice(0, 1000),
        image,
        featured: false,
        status: "active",
        sellerId: state.currentUser.uid,
        sellerName:
          state.currentUser.displayName || "مستخدم PiXchange",
        sellerPhoto: state.currentUser.photoURL || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    );

    event.currentTarget.reset();
    closeAddProductModal();

    showToast("تم نشر المنتج بنجاح.");

    await loadProducts();
    await updateStatistics();
  } catch (error) {
    console.error("Product creation error:", error);

    showToast(
      getFirebaseErrorMessage(error),
      "error"
    );
  } finally {
    setButtonLoading(submitButton, false, "نشر المنتج");
  }
}

async function toggleFavorite(productId, button) {
  if (!productId) {
    return;
  }

  const alreadyFavorite = state.favorites.has(productId);

  if (alreadyFavorite) {
    state.favorites.delete(productId);
  } else {
    state.favorites.add(productId);
  }

  button.textContent = alreadyFavorite ? "♡" : "♥";

  saveLocalFavorites();

  if (!state.currentUser) {
    showToast(
      alreadyFavorite
        ? "تمت إزالة المنتج من المفضلة."
        : "تمت إضافة المنتج إلى المفضلة."
    );

    return;
  }

  const favoriteId = `${state.currentUser.uid}_${productId}`;
  const favoriteReference = doc(
    db,
    COLLECTIONS.favorites,
    favoriteId
  );

  try {
    if (alreadyFavorite) {
      await deleteDoc(favoriteReference);
    } else {
      await setDoc(favoriteReference, {
        userId: state.currentUser.uid,
        productId,
        createdAt: serverTimestamp()
      });
    }

    showToast(
      alreadyFavorite
        ? "تمت إزالة المنتج من المفضلة."
        : "تمت إضافة المنتج إلى المفضلة."
    );
  } catch (error) {
    console.error("Favorite error:", error);

    if (alreadyFavorite) {
      state.favorites.add(productId);
      button.textContent = "♥";
    } else {
      state.favorites.delete(productId);
      button.textContent = "♡";
    }

    saveLocalFavorites();

    showToast(
      getFirebaseErrorMessage(error),
      "error"
    );
  }
}

async function loadCloudFavorites() {
  if (!state.currentUser) {
    return;
  }

  try {
    const favoritesQuery = query(
      collection(db, COLLECTIONS.favorites),
      where("userId", "==", state.currentUser.uid)
    );

    const snapshot = await getDocs(favoritesQuery);

    state.favorites = new Set(
      snapshot.docs
        .map((favoriteDocument) => {
          return favoriteDocument.data().productId;
        })
        .filter(Boolean)
    );

    saveLocalFavorites();
  } catch (error) {
    console.error("Favorites loading error:", error);
    loadLocalFavorites();
  }
}

function loadLocalFavorites() {
  try {
    const storedFavorites = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.favorites) || "[]"
    );

    state.favorites = new Set(
      Array.isArray(storedFavorites)
        ? storedFavorites
        : []
    );
  } catch {
    state.favorites = new Set();
  }
}

function saveLocalFavorites() {
  localStorage.setItem(
    STORAGE_KEYS.favorites,
    JSON.stringify([...state.favorites])
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
    const searchableText = [
      product.title,
      product.city,
      product.description,
      product.category,
      product.sellerName
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(searchTerm);
  });

  renderProductCollection(
    "latestProductsGrid",
    "latestProductsSkeleton",
    "latestEmptyState",
    results
  );

  document
    .getElementById("latestProductsGrid")
    ?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  showToast(
    results.length
      ? `تم العثور على ${results.length} منتج.`
      : "لم نجد منتجات مطابقة لبحثك.",
    results.length ? "success" : "error"
  );
}

async function updateStatistics() {
  setText("productsCount", state.products.length);
  setText("citiesCount", countUniqueCities());

  try {
    const [usersSnapshot, ordersSnapshot] =
      await Promise.all([
        getCountFromServer(
          collection(db, COLLECTIONS.users)
        ),
        getCountFromServer(
          collection(db, COLLECTIONS.orders)
        )
      ]);

    setText(
      "usersCount",
      usersSnapshot.data().count
    );

    setText(
      "ordersCount",
      ordersSnapshot.data().count
    );
  } catch (error) {
    console.error("Statistics error:", error);

    setText("usersCount", state.currentUser ? 1 : 0);
    setText("ordersCount", 0);
  }
}

function countUniqueCities() {
  return new Set(
    state.products
      .map((product) => product.city?.trim())
      .filter(Boolean)
  ).size;
}

function openAddProductModal() {
  if (!getCurrentUser()) {
    showToast("سجل الدخول أولًا لإضافة منتج.", "error");
    openAccountModal();
    return;
  }

  openModal("addProductModal");
}

function closeAddProductModal() {
  closeModal("addProductModal");
}

function openAccountModal() {
  openModal("accountModal");
}

function closeAccountModal() {
  closeModal("accountModal");
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

  document.getElementById("productDetailsModal")?.remove();

  unlockBodyScroll();
}

function unlockBodyScroll() {
  document.body.style.overflow = "";
}

function loadTheme() {
  const savedTheme =
    localStorage.getItem(STORAGE_KEYS.theme) || "light";

  document.documentElement.dataset.theme = savedTheme;
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme =
    document.documentElement.dataset.theme || "light";

  const newTheme =
    currentTheme === "dark" ? "light" : "dark";

  document.documentElement.dataset.theme = newTheme;

  localStorage.setItem(
    STORAGE_KEYS.theme,
    newTheme
  );

  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById("themeIcon");

  if (icon) {
    icon.textContent = theme === "dark" ? "☀" : "☾";
  }
}

function initializeInstallPrompt() {
  window.addEventListener(
    "beforeinstallprompt",
    (event) => {
      event.preventDefault();

      state.deferredInstallPrompt = event;

      document
        .getElementById("installAppButton")
        ?.classList.remove("hidden");
    }
  );

  window.addEventListener("appinstalled", () => {
    state.deferredInstallPrompt = null;

    document
      .getElementById("installAppButton")
      ?.classList.add("hidden");

    showToast("تم تثبيت تطبيق PiXchange.");
  });
}

async function installApplication() {
  if (!state.deferredInstallPrompt) {
    showToast(
      "من قائمة المتصفح اختر إضافة إلى الشاشة الرئيسية."
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

function showProductSkeletons() {
  document
    .getElementById("featuredProductsSkeleton")
    ?.classList.remove("hidden");

  document
    .getElementById("latestProductsSkeleton")
    ?.classList.remove("hidden");
}

function finishLoading() {
  window.setTimeout(() => {
    document
      .getElementById("appLoader")
      ?.classList.add("hidden");
  }, 500);
}

function updateYear() {
  setText(
    "currentYear",
    new Date().getFullYear()
  );
}

function showToast(message, type = "success") {
  const container = document.getElementById(
    "toastContainer"
  );

  if (!container) {
    return;
  }

  const toast = document.createElement("div");

  toast.className = `toast-message toast-${type}`;

  toast.style.cssText = `
    background:${type === "error" ? "#c0392b" : "#222"};
    color:#fff;
    padding:14px 18px;
    border-radius:12px;
    box-shadow:0 10px 30px rgba(0,0,0,.22);
    margin-top:10px;
    font-weight:700;
    max-width:340px;
    line-height:1.7;
    animation:toastEntrance .25s ease;
  `;

  toast.textContent = message;
  container.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3500);
}

function setButtonLoading(
  button,
  loading,
  text
) {
  if (!button) {
    return;
  }

  button.disabled = loading;
  button.textContent = text;
  button.style.opacity = loading ? ".7" : "";
}

function formatPi(value) {
  const numericValue = Number(value);

  const formatter = new Intl.NumberFormat(
    "ar-SA",
    {
      maximumFractionDigits: 4
    }
  );

  return `${formatter.format(
    Number.isFinite(numericValue) ? numericValue : 0
  )} Pi`;
}

function convertFirestoreDate(value) {
  if (value?.toDate) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(0);
}

function getTimeValue(value) {
  const date = convertFirestoreDate(value);
  return date.getTime();
}

function getInputValue(elementId) {
  return (
    document.getElementById(elementId)?.value.trim() || ""
  );
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = value;
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
