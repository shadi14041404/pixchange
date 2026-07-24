"use strict";

const STORE_KEY = "pixchange_products_v01";
const THEME_KEY = "pixchange_theme";
const LOGIN_KEY = "pixchange_demo_user";
const fallbackImage = "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=900&q=80";
const demoProducts = [
  {id:"demo-1",title:"آيفون 15 برو",price:4.5,city:"مكة المكرمة",category:"electronics",description:"جهاز بحالة ممتازة مع كامل أغراضه.",featured:true,image:"https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80",createdAt:Date.now()-1000},
  {id:"demo-2",title:"كامارو ZL1",price:120,city:"جدة",category:"cars",description:"سيارة نظيفة وجاهزة للفحص والمعاينة.",featured:true,image:"https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=80",createdAt:Date.now()-2000},
  {id:"demo-3",title:"كنبة منزلية",price:2.25,city:"الرياض",category:"home",description:"كنبة نظيفة بحالة ممتازة.",featured:false,image:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80",createdAt:Date.now()-3000},
  {id:"demo-4",title:"ساعة ذكية",price:1.1,city:"المدينة المنورة",category:"electronics",description:"ساعة ذكية جديدة بالكرتون.",featured:false,image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",createdAt:Date.now()-4000}
];
let products=[];let currentFilter="";

document.addEventListener("DOMContentLoaded",()=>{
  try{loadTheme();products=loadProducts();bindEvents();render();updateAccount();document.getElementById("currentYear").textContent=new Date().getFullYear();}
  catch(error){console.error(error);showToast("حدث خطأ أثناء تشغيل الموقع.","error");}
  finally{setTimeout(()=>document.getElementById("appLoader")?.classList.add("hide"),350);}
});

function loadProducts(){try{const saved=JSON.parse(localStorage.getItem(STORE_KEY)||"null");return Array.isArray(saved)&&saved.length?saved:demoProducts;}catch{return demoProducts;}}
function saveProducts(){localStorage.setItem(STORE_KEY,JSON.stringify(products));}
function bindEvents(){
  byId("themeToggle").addEventListener("click",toggleTheme);
  byId("heroSearchForm").addEventListener("submit",e=>{e.preventDefault();currentFilter=byId("heroSearchInput").value.trim();render();byId("latest").scrollIntoView({behavior:"smooth"});});
  byId("clearSearch").addEventListener("click",()=>{currentFilter="";byId("heroSearchInput").value="";render();});
  ["addProductHeroButton","emptyAddProductButton","sellerAddProductButton","mobileAddProductButton"].forEach(id=>byId(id)?.addEventListener("click",()=>openModal("addProductModal")));
  ["accountButton","mobileAccountButton"].forEach(id=>byId(id)?.addEventListener("click",()=>openModal("accountModal")));
  document.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",()=>closeModal(btn.dataset.close)));
  document.querySelectorAll(".modal").forEach(modal=>modal.addEventListener("click",e=>{if(e.target===modal)closeModal(modal.id);}));
  document.querySelectorAll("[data-category]").forEach(btn=>btn.addEventListener("click",()=>{currentFilter=btn.dataset.category;render();byId("latest").scrollIntoView({behavior:"smooth"});}));
  byId("productForm").addEventListener("submit",addProduct);
  byId("demoLoginButton").addEventListener("click",toggleDemoLogin);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".modal:not(.hidden)").forEach(m=>closeModal(m.id));});
}
function addProduct(e){e.preventDefault();const item={id:`local-${Date.now()}`,title:value("productTitle"),price:Number(value("productPrice")),city:value("productCity"),category:value("productCategory"),image:value("productImage")||fallbackImage,description:value("productDescription"),featured:byId("productFeatured").checked,createdAt:Date.now()};products.unshift(item);saveProducts();e.target.reset();closeModal("addProductModal");currentFilter="";render();showToast("تم نشر المنتج بنجاح في النسخة التجريبية.");byId("latest").scrollIntoView({behavior:"smooth"});}
function render(){const q=currentFilter.toLowerCase();const filtered=products.filter(p=>!q||[p.title,p.city,p.description,p.category].join(" ").toLowerCase().includes(q));const featured=products.filter(p=>p.featured).slice(0,4);renderGrid("featuredProductsGrid",featured,"featuredEmptyState");renderGrid("latestProductsGrid",filtered,"latestEmptyState");byId("clearSearch").classList.toggle("hidden",!currentFilter);byId("productsCount").textContent=products.length;byId("citiesCount").textContent=new Set(products.map(p=>p.city)).size;}
function renderGrid(gridId,list,emptyId){const grid=byId(gridId),empty=byId(emptyId);grid.innerHTML="";empty.classList.toggle("hidden",list.length>0);list.forEach(p=>grid.insertAdjacentHTML("beforeend",card(p)));grid.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>deleteProduct(btn.dataset.delete)));}
function card(p){return `<article class="product-card"><div class="product-image"><img src="${safeUrl(p.image)}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.src='${fallbackImage}'">${p.featured?'<span class="featured-badge">مميز</span>':''}</div><div class="product-body"><div class="product-meta"><span>${categoryName(p.category)}</span><span>📍 ${escapeHtml(p.city)}</span></div><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.description)}</p><div class="price">${formatPi(p.price)}</div><div class="product-actions"><button onclick="navigator.clipboard?.writeText('${escapeJs(p.title)} - ${p.price} Pi');this.textContent='تم النسخ'">مشاركة</button>${String(p.id).startsWith("local-")?`<button data-delete="${p.id}">حذف</button>`:"<button onclick=\"alert('ميزة التواصل ستُضاف في المرحلة القادمة')\">تواصل</button>"}</div></div></article>`;}
function deleteProduct(id){if(!confirm("حذف هذا الإعلان؟"))return;products=products.filter(p=>p.id!==id);saveProducts();render();showToast("تم حذف الإعلان.");}
function toggleTheme(){const next=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=next;localStorage.setItem(THEME_KEY,next);byId("themeToggle").textContent=next==="dark"?"☀":"☾";}
function loadTheme(){const theme=localStorage.getItem(THEME_KEY)||"light";document.documentElement.dataset.theme=theme;byId("themeToggle").textContent=theme==="dark"?"☀":"☾";}
function toggleDemoLogin(){const logged=localStorage.getItem(LOGIN_KEY)==="1";if(logged){localStorage.removeItem(LOGIN_KEY);showToast("تم تسجيل الخروج.");}else{localStorage.setItem(LOGIN_KEY,"1");showToast("تم الدخول التجريبي بنجاح.");}updateAccount();closeModal("accountModal");}
function updateAccount(){const logged=localStorage.getItem(LOGIN_KEY)==="1";byId("accountButtonText").textContent=logged?"شادي":"دخول";byId("demoLoginButton").textContent=logged?"تسجيل الخروج":"دخول تجريبي";}
function openModal(id){byId(id).classList.remove("hidden");document.body.classList.add("modal-open");}
function closeModal(id){byId(id).classList.add("hidden");if(!document.querySelector(".modal:not(.hidden)"))document.body.classList.remove("modal-open");}
function showToast(message,type="success"){const t=document.createElement("div");t.className=`toast ${type}`;t.textContent=message;byId("toastContainer").appendChild(t);setTimeout(()=>t.remove(),3200);}
function categoryName(v){return({electronics:"إلكترونيات",cars:"سيارات",home:"المنزل",fashion:"أزياء",services:"خدمات",other:"أخرى"})[v]||"أخرى";}
function formatPi(n){return `${new Intl.NumberFormat("ar-SA",{maximumFractionDigits:4}).format(Number(n)||0)} Pi`;}
function value(id){return byId(id).value.trim();}function byId(id){return document.getElementById(id);}function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);}function escapeJs(v){return String(v??"").replace(/[\\']/g,"\\$&");}function safeUrl(v){try{const u=new URL(v);return ["http:","https:"].includes(u.protocol)?escapeHtml(u.href):fallbackImage;}catch{return fallbackImage;}}
