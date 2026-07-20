import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  push,
  set,
  remove,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCSkPBgDqVMqEJYOvcfI56_e5fSwWkzsyQ",
  authDomain: "marketing-4b1f1.firebaseapp.com",
  databaseURL: "https://marketing-4b1f1-default-rtdb.firebaseio.com",
  projectId: "marketing-4b1f1",
  storageBucket: "marketing-4b1f1.firebasestorage.app",
  messagingSenderId: "709830987533",
  appId: "1:709830987533:web:26bcc7b09d8aa959ec2a44",
};

// Demo admin password (shown on login screen)
const ADMIN_PASSWORD = "Admin@12345";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const loginView = document.getElementById("loginView");
const adminView = document.getElementById("adminView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const settingsForm = document.getElementById("settingsForm");
const productForm = document.getElementById("productForm");
const settingsMsg = document.getElementById("settingsMsg");
const productMsg = document.getElementById("productMsg");
const adminProductList = document.getElementById("adminProductList");

const titleInput = document.getElementById("titleInput");
const taglineInput = document.getElementById("taglineInput");
const heroInput = document.getElementById("heroInput");

function isLoggedIn() {
  return sessionStorage.getItem("nova_admin") === "1";
}

function showAdmin(show) {
  loginView.hidden = show;
  adminView.hidden = !show;
}

if (isLoggedIn()) showAdmin(true);

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const password = document.getElementById("password").value;
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem("nova_admin", "1");
    loginError.hidden = true;
    showAdmin(true);
  } else {
    loginError.hidden = false;
    loginError.textContent = "Wrong password";
  }
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("nova_admin");
  showAdmin(false);
});

onValue(ref(db, "settings"), (snap) => {
  const data = snap.val() || {};
  titleInput.value = data.title || "";
  taglineInput.value = data.tagline || "";
  heroInput.value = data.heroText || "";
});

settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isLoggedIn()) return;
  await update(ref(db, "settings"), {
    title: titleInput.value.trim(),
    tagline: taglineInput.value.trim(),
    heroText: heroInput.value.trim(),
  });
  settingsMsg.hidden = false;
  setTimeout(() => (settingsMsg.hidden = true), 2000);
});

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isLoggedIn()) return;
  const productRef = push(ref(db, "products"));
  await set(productRef, {
    name: document.getElementById("productName").value.trim(),
    price: Number(document.getElementById("productPrice").value || 0),
    description: document.getElementById("productDesc").value.trim(),
    imageUrl: document.getElementById("productImage").value.trim(),
    createdAt: Date.now(),
  });
  productForm.reset();
  productMsg.hidden = false;
  setTimeout(() => (productMsg.hidden = true), 2000);
});

onValue(ref(db, "products"), (snap) => {
  const data = snap.val() || {};
  const items = Object.entries(data)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  adminProductList.innerHTML = "";
  if (!items.length) {
    adminProductList.innerHTML = `<p class="hint">No products yet.</p>`;
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "item";
    const img = item.imageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=80";
    row.innerHTML = `
      <img src="${escapeAttr(img)}" alt="" />
      <div>
        <h3>${escapeHtml(item.name || "Untitled")}</h3>
        <p>$${Number(item.price || 0).toFixed(2)} · ${escapeHtml(item.description || "")}</p>
      </div>
      <button type="button" class="danger" data-id="${escapeAttr(item.id)}">Delete</button>
    `;
    row.querySelector("button").addEventListener("click", async () => {
      if (!isLoggedIn()) return;
      if (confirm("Delete this product?")) {
        await remove(ref(db, `products/${item.id}`));
      }
    });
    adminProductList.appendChild(row);
  }
});

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("'", "&#39;");
}
