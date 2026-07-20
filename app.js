(function () {
  "use strict";

  const firebaseConfig = {
    apiKey: "AIzaSyCSkPBgDqVMqEJYOvcfI56_e5fSwWkzsyQ",
    authDomain: "marketing-4b1f1.firebaseapp.com",
    databaseURL: "https://marketing-4b1f1-default-rtdb.firebaseio.com",
    projectId: "marketing-4b1f1",
    storageBucket: "marketing-4b1f1.firebasestorage.app",
    messagingSenderId: "709830987533",
    appId: "1:709830987533:web:26bcc7b09d8aa959ec2a44",
  };

  // Fallback password if RTDB admin node unavailable
  const FALLBACK_PASSWORD = "Admin@12345";

  const loginView = document.getElementById("loginView");
  const adminView = document.getElementById("adminView");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const settingsForm = document.getElementById("settingsForm");
  const productForm = document.getElementById("productForm");
  const settingsMsg = document.getElementById("settingsMsg");
  const productMsg = document.getElementById("productMsg");
  const adminProductList = document.getElementById("adminProductList");
  const conversationList = document.getElementById("conversationList");
  const msgBadge = document.getElementById("msgBadge");
  const threadEmpty = document.getElementById("threadEmpty");
  const threadActive = document.getElementById("threadActive");
  const threadMessages = document.getElementById("threadMessages");
  const threadName = document.getElementById("threadName");
  const threadEmail = document.getElementById("threadEmail");
  const adminReplyForm = document.getElementById("adminReplyForm");
  const closeConvoBtn = document.getElementById("closeConvoBtn");
  const pageTitle = document.getElementById("pageTitle");
  const pageSub = document.getElementById("pageSub");

  const titleInput = document.getElementById("titleInput");
  const taglineInput = document.getElementById("taglineInput");
  const heroInput = document.getElementById("heroInput");

  let db = null;
  let adminPassword = FALLBACK_PASSWORD;
  let activeConvoId = null;
  let repliesHandler = null;
  let dashboardReady = false;

  const tabMeta = {
    content: {
      title: "Content",
      sub: "Update what customers see on the storefront",
    },
    products: {
      title: "Products",
      sub: "Manage catalog items shown on the storefront",
    },
    messages: {
      title: "Messages",
      sub: "Reply to customer conversations",
    },
  };

  function isLoggedIn() {
    return sessionStorage.getItem("nova_admin") === "1";
  }

  function showAdmin(show) {
    loginView.hidden = show;
    adminView.hidden = !show;
    if (show && db && !dashboardReady) {
      initDashboard();
    }
  }

  // ---- Login works immediately (does not depend on Firebase load for UI) ----
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    loginError.hidden = true;
    const password = document.getElementById("password").value;
    if (password === adminPassword || password === FALLBACK_PASSWORD) {
      sessionStorage.setItem("nova_admin", "1");
      document.getElementById("password").value = "";
      showAdmin(true);
    } else {
      loginError.hidden = false;
      loginError.textContent = "Incorrect password";
    }
  });

  logoutBtn.addEventListener("click", function () {
    sessionStorage.removeItem("nova_admin");
    showAdmin(false);
  });

  // Tabs
  document.querySelectorAll(".nav-item").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const tab = btn.getAttribute("data-tab");
      document.querySelectorAll(".nav-item").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      document.querySelectorAll(".tab").forEach(function (panel) {
        panel.hidden = panel.id !== "tab-" + tab;
      });
      pageTitle.textContent = tabMeta[tab].title;
      pageSub.textContent = tabMeta[tab].sub;
    });
  });

  // Init Firebase
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();

    db.ref("admin/password").once("value").then(function (snap) {
      const val = snap.val();
      if (val && typeof val === "string") {
        adminPassword = val;
      }
    }).catch(function () {
      // keep fallback
    });

    if (isLoggedIn()) {
      showAdmin(true);
    }
  } catch (err) {
    console.error("Firebase init failed", err);
    loginError.hidden = false;
    loginError.textContent = "Connection issue. You can still try signing in.";
    if (isLoggedIn()) showAdmin(true);
  }

  function requireAuth() {
    return isLoggedIn();
  }

  function initDashboard() {
    if (!db || dashboardReady) return;
    dashboardReady = true;

    db.ref("settings").on("value", function (snap) {
      const data = snap.val() || {};
      titleInput.value = data.title || "";
      taglineInput.value = data.tagline || "";
      heroInput.value = data.heroText || "";
    });

    settingsForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!requireAuth()) return;
      try {
        await db.ref("settings").update({
          title: titleInput.value.trim(),
          tagline: taglineInput.value.trim(),
          heroText: heroInput.value.trim(),
        });
        settingsMsg.hidden = false;
        setTimeout(function () {
          settingsMsg.hidden = true;
        }, 1800);
      } catch (err) {
        alert("Could not save settings. Check connection.");
      }
    });

    productForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!requireAuth()) return;
      try {
        await db.ref("products").push({
          name: document.getElementById("productName").value.trim(),
          price: Number(document.getElementById("productPrice").value || 0),
          description: document.getElementById("productDesc").value.trim(),
          imageUrl: document.getElementById("productImage").value.trim(),
          createdAt: Date.now(),
        });
        productForm.reset();
        productMsg.hidden = false;
        setTimeout(function () {
          productMsg.hidden = true;
        }, 1800);
      } catch (err) {
        alert("Could not add product.");
      }
    });

    db.ref("products").on("value", function (snap) {
      const data = snap.val() || {};
      const items = Object.entries(data)
        .map(function (entry) {
          return Object.assign({ id: entry[0] }, entry[1]);
        })
        .sort(function (a, b) {
          return (b.createdAt || 0) - (a.createdAt || 0);
        });

      adminProductList.innerHTML = "";
      if (!items.length) {
        adminProductList.innerHTML = '<p class="login-sub">No products yet.</p>';
        return;
      }

      items.forEach(function (item) {
        const row = document.createElement("div");
        row.className = "product-item";
        const img =
          item.imageUrl ||
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=80";
        row.innerHTML =
          '<img src="' + escapeAttr(img) + '" alt="" />' +
          "<div><h3>" +
          escapeHtml(item.name || "Untitled") +
          "</h3><p>$" +
          Number(item.price || 0).toFixed(2) +
          " · " +
          escapeHtml(item.description || "") +
          "</p></div>";
        const del = document.createElement("button");
        del.type = "button";
        del.className = "btn-danger";
        del.textContent = "Delete";
        del.addEventListener("click", async function () {
          if (!requireAuth()) return;
          if (confirm("Delete this product?")) {
            await db.ref("products/" + item.id).remove();
          }
        });
        row.appendChild(del);
        adminProductList.appendChild(row);
      });
    });

    // Messages inbox
    db.ref("messages").on("value", function (snap) {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(function (entry) {
          return Object.assign({ id: entry[0] }, entry[1]);
        })
        .sort(function (a, b) {
          return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
        });

      const openCount = list.filter(function (c) {
        return c.status !== "closed";
      }).length;

      if (openCount > 0) {
        msgBadge.hidden = false;
        msgBadge.textContent = String(openCount);
      } else {
        msgBadge.hidden = true;
      }

      conversationList.innerHTML = "";
      if (!list.length) {
        conversationList.innerHTML = '<p class="login-sub">No messages yet.</p>';
        return;
      }

      list.forEach(function (c) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "convo-item" + (c.id === activeConvoId ? " active" : "");
        btn.innerHTML =
          "<div><h3>" +
          escapeHtml(c.name || "Customer") +
          (c.status === "closed" ? " · Closed" : "") +
          "</h3><p>" +
          escapeHtml(c.preview || c.email || "") +
          "</p></div>" +
          (c.status !== "closed" ? '<span class="dot"></span>' : "");
        btn.addEventListener("click", function () {
          openConversation(c);
        });
        conversationList.appendChild(btn);
      });
    });

    adminReplyForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!requireAuth() || !activeConvoId) return;
      const input = document.getElementById("adminReplyInput");
      const text = input.value.trim();
      if (!text) return;
      const now = Date.now();
      await db.ref("messages/" + activeConvoId + "/replies").push({
        from: "admin",
        text: text,
        createdAt: now,
      });
      await db.ref("messages/" + activeConvoId).update({
        preview: text.slice(0, 120),
        updatedAt: now,
        status: "open",
      });
      input.value = "";
    });

    closeConvoBtn.addEventListener("click", async function () {
      if (!requireAuth() || !activeConvoId) return;
      await db.ref("messages/" + activeConvoId).update({
        status: "closed",
        updatedAt: Date.now(),
      });
    });
  }

  function openConversation(convo) {
    if (repliesHandler && activeConvoId) {
      db.ref("messages/" + activeConvoId + "/replies").off("value", repliesHandler);
      repliesHandler = null;
    }

    activeConvoId = convo.id;
    threadEmpty.hidden = true;
    threadActive.hidden = false;
    threadName.textContent = convo.name || "Customer";
    threadEmail.textContent = convo.email || "";

    document.querySelectorAll(".convo-item").forEach(function (el) {
      el.classList.remove("active");
    });

    const path = "messages/" + activeConvoId + "/replies";
    repliesHandler = function (snap) {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(function (entry) {
          return Object.assign({ id: entry[0] }, entry[1]);
        })
        .sort(function (a, b) {
          return (a.createdAt || 0) - (b.createdAt || 0);
        });

      threadMessages.innerHTML = "";
      list.forEach(function (m) {
        const el = document.createElement("div");
        el.className = "bubble " + (m.from === "admin" ? "admin" : "user");
        el.innerHTML =
          escapeHtml(m.text || "") +
          '<span class="meta">' +
          (m.from === "admin" ? "You" : "Customer") +
          " · " +
          formatTime(m.createdAt) +
          "</span>";
        threadMessages.appendChild(el);
      });
      threadMessages.scrollTop = threadMessages.scrollHeight;
    };
    db.ref(path).on("value", repliesHandler);
  }

  function formatTime(ts) {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return "";
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }
})();
