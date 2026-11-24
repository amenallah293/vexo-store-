
const API = window.VEXO_CONFIG.apiBase.replace(/\/+$/, "");
const grid = document.getElementById("products-grid");

// تنسيق الأسعار دون أصفار زائدة
const money = n => {
  const value = Number(n);

  if (!Number.isFinite(value)) return "0 دينار";

  return new Intl.NumberFormat("ar-TN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(value) + " دينار";
};

// حماية النصوص
const safe = s =>
  String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

// رابط صورة المنتج
function getImageUrl(product) {
  if (product.imageKey) {
    return API + "/images/" + encodeURIComponent(product.imageKey);
  }

  if (product.imageUrl) {
    return product.imageUrl;
  }

  return "";
}

// تحميل المنتجات
async function loadProducts() {
  try {
    const response = await fetch(API + "/api/products");

    if (!response.ok) {
      throw new Error("تعذر تحميل المنتجات");
    }

    const products = await response.json();

    document.getElementById("count").textContent =
      products.length + " منتج";

    if (!products.length) {
      grid.innerHTML =
        '<p class="muted">لا توجد منتجات حالياً. عُد قريباً!</p>';
      return;
    }

    grid.innerHTML = products.map(p => {
      const image = safe(getImageUrl(p));
      const description = String(p.description || "");

      return `
        <article class="product-card">
          <img
            src="${image}"
            alt="${safe(p.name)}"
            loading="lazy"
            onerror="this.onerror=null;this.alt='تعذر تحميل الصورة';"
          >

          <div class="product-content">
            <h3>${safe(p.name)}</h3>

            <p>
              ${safe(description).slice(0, 95)}
              ${description.length > 95 ? "…" : ""}
            </p>

            <strong class="price">${money(p.price)}</strong>

            <button class="btn gold" data-id="${safe(p.id)}">
              عرض التفاصيل
            </button>
          </div>
        </article>
      `;
    }).join("");

    grid.querySelectorAll("button[data-id]").forEach(button => {
      button.addEventListener("click", () => {
        const product = products.find(
          p => p.id === button.dataset.id
        );

        showProduct(product);
      });
    });

  } catch (error) {
    grid.innerHTML =
      '<p class="error">تعذر الاتصال بالمتجر. حاول تحديث الصفحة لاحقاً.</p>';
  }
}

let activeProduct = null;

// تفاصيل المنتج
function showProduct(product) {
  if (!product) return;

  activeProduct = product;

  document.getElementById("order-message").textContent = "";

  const modalImage = document.getElementById("modal-image");

  modalImage.onerror = function () {
    this.alt = "تعذر تحميل صورة المنتج";
  };

  modalImage.src = getImageUrl(product);
  modalImage.alt = product.name || "صورة المنتج";

  document.getElementById("modal-name").textContent =
    product.name || "";

  document.getElementById("modal-description").textContent =
    product.description || "";

  document.getElementById("modal-price").textContent =
    money(product.price);

  const number = (window.VEXO_CONFIG.whatsappNumber || "")
    .replace(/\D/g, "");

  const message = encodeURIComponent(
    `مرحباً، أريد طلب: ${product.name} بسعر ${money(product.price)}`
  );

  const whatsapp = document.getElementById("modal-whatsapp");

  whatsapp.href = number
    ? `https://wa.me/${number}?text=${message}`
    : "#";

  whatsapp.style.display = number ? "inline-flex" : "none";

  document.getElementById("modal").classList.remove("hidden");
}

// إرسال الطلب
document.getElementById("order-form").addEventListener("submit", async e => {
  e.preventDefault();

  if (!activeProduct) return;

  const button = document.getElementById("order-submit");
  const message = document.getElementById("order-message");

  button.disabled = true;
  message.textContent = "جارٍ إرسال الطلب...";

  try {
    const payload = {
      productId: activeProduct.id,
      customerName: document.getElementById("customer-name").value.trim(),
      phone: document.getElementById("customer-phone").value.trim(),
      address: document.getElementById("customer-address").value.trim(),
      quantity: Number(document.getElementById("order-quantity").value)
    };

    const response = await fetch(API + "/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "تعذر إرسال الطلب");
    }

    message.textContent =
      "تم استلام طلبك بنجاح. سنتواصل معك لتأكيده.";

    e.target.reset();

  } catch (error) {
    message.textContent = error.message;

  } finally {
    button.disabled = false;
  }
});

// إغلاق نافذة التفاصيل
document.getElementById("close-modal").onclick = () => {
  document.getElementById("modal").classList.add("hidden");
};

document.getElementById("modal").addEventListener("click", e => {
  if (e.target.id === "modal") {
    e.currentTarget.classList.add("hidden");
  }
});

// السنة الحالية
document.getElementById("year").textContent =
  new Date().getFullYear();

// تشغيل المتجر
loadProducts();
