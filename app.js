/* ══════════════════════════════════════════════════════════════════════════
   PEREGRINE INTERNSHIP APPLICATION - PERFECTLY ALIGNED WITH BACKEND v2.1
   ══════════════════════════════════════════════════════════════════════════ */

var SHEET_URL  = "https://script.google.com/macros/s/AKfycbx50x5W3ePu8jTZLdvjbBtEHWX8d6lVJStH02s4uetalpJ8x-AoWoX6_WBwfyVEoR-Npw/exec";
var RZP_KEY_ID = "rzp_live_Rw8XR99SIFnT9a";
var PAYMENT_AMOUNT_DEFAULT = 129900;
var PAYMENT_AMOUNT = PAYMENT_AMOUNT_DEFAULT;

/* ── CENTRE → TRACK CONFIG ───────────────────────────────────────────────
   To add a new centre: add a new key matching the <option value=""> exactly.
   To add/remove a track at a centre: add/remove it from that centre's object.
   To disable a track at a centre: simply omit it (it will show as unavailable).
   Course codes are per centre × track.
   ─────────────────────────────────────────────────────────────────────── */
var CENTRE_CODES = {
  "MES Kalladi College, Mannarkkad": {
    // "Digital Education": "INT204",
    "Arabic Studies":    "INT206",
    "Islamic History":   "INT207"
  }
  /*
  ,
  "Mampad College": {
    "Digital Education": "INT104",
    "Arabic Studies":    "INT106"
  }
  */
};

/** HTML for the sticky footer pay button (discount UI). */
function stickyPayButtonHTML() {
  return '<span class="btn-price-wrap"><i class="fas fa-lock" aria-hidden="true"></i> <span>Pay Now</span> <span class="btn-price-old" aria-hidden="true">&#x20b9;4,999</span> <span class="btn-price-new">&#x20b9;999</span></span>';
}

var selTrack = "", selTrackCode = "", selDuration = "";
var razorpayInstance = null;

document.addEventListener("DOMContentLoaded", function() {
  var chk = document.getElementById("pay-confirm-check");
  var previewBtn = document.getElementById("preview-pay-btn");
  if (chk && previewBtn) {
    chk.addEventListener("change", function() {
      previewBtn.disabled = !chk.checked;
      previewBtn.classList.toggle("is-ready", chk.checked);
    });
  }
  var payOverlay = document.getElementById("pay-preview-overlay");
  if (payOverlay) {
    payOverlay.addEventListener("click", function(e) {
      if (e.target === payOverlay) closePayPreview();
    });
  }
  document.addEventListener("keydown", function(e) {
    if (e.key !== "Escape") return;
    var o = document.getElementById("pay-preview-overlay");
    if (o && o.classList.contains("is-open")) closePayPreview();
  });
});

function closePayPreview() {
  var overlay = document.getElementById("pay-preview-overlay");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  var chk = document.getElementById("pay-confirm-check");
  var previewBtn = document.getElementById("preview-pay-btn");
  if (chk) chk.checked = false;
  if (previewBtn) {
    previewBtn.disabled = true;
    previewBtn.classList.remove("is-ready");
  }
}

function openPayPreview() {
  var name = document.getElementById("f-name").value.trim();
  var email = document.getElementById("f-email").value.trim();
  var summaryEl = document.getElementById("pay-preview-summary");
  var overlay = document.getElementById("pay-preview-overlay");
  if (!summaryEl || !overlay) return;

  summaryEl.innerHTML =
    `<div class="pv-row"><span>Applicant</span><strong>${escapeHtml(name)}</strong></div>` +
    `<div class="pv-row"><span>Email</span><strong>${escapeHtml(email)}</strong></div>` +
    `<div class="pv-row"><span>Track</span><strong>${escapeHtml(selTrackCode + " — " + selTrack)}</strong></div>` +
    `<div class="pv-row"><span>Centre</span><strong>${escapeHtml(document.getElementById("f-center").value)}</strong></div>` +
    `<div class="pv-row"><span>Duration</span><strong>${escapeHtml(selDuration)}</strong></div>` +
    
    // Fee section formatted as rows for better alignment
    `<div class="pay-preview-fee"><span>Programme fee</span><strong>` +
        `<span class="was">&#x20b9;4,999</span> ` + 
        `<span class="now">&#x20b9;999</span>` +
    `</strong></div>` +
    
    `<div class="pv-row"><span>Management fee</span><strong>&#x20b9;300</strong></div>`;
  var chk = document.getElementById("pay-confirm-check");
  var previewBtn = document.getElementById("preview-pay-btn");
  if (chk) chk.checked = false;
  if (previewBtn) {
    previewBtn.disabled = true;
    previewBtn.classList.remove("is-ready");
  }

  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
}

function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function onCentreChange(centreVal) {
  // Reset track selection whenever centre changes
  selTrack = "";
  selTrackCode = "";
  document.getElementById("f-track").value = "";
  document.getElementById("f-track-code").value = "";

  var hint = document.getElementById("track-hint");
  var trackOpts = document.querySelectorAll(".track-opt");

  if (!centreVal || !CENTRE_CODES[centreVal]) {
    // No valid centre selected — lock all tracks
    trackOpts.forEach(function(opt) {
      opt.classList.remove("active", "track-opt--unavailable");
      opt.classList.add("track-opt--locked");
      opt.querySelector(".track-code").textContent = "";
    });
    if (hint) { hint.style.display = "block"; hint.textContent = "Select a centre above to see available tracks."; }
    return;
  }

  if (hint) hint.style.display = "none";

  var available = CENTRE_CODES[centreVal];

  trackOpts.forEach(function(opt) {
    var trackName = opt.getAttribute("data-val");
    opt.classList.remove("active", "track-opt--locked");

    if (available[trackName]) {
      // Available at this centre
      opt.classList.remove("track-opt--unavailable");
      opt.querySelector(".track-code").textContent = available[trackName];
    } else {
      // Not offered at this centre
      opt.classList.add("track-opt--unavailable");
      opt.querySelector(".track-code").textContent = "Not available";
    }
  });
}

function pickTrack(el) {
  if (el.classList.contains("track-opt--locked") || el.classList.contains("track-opt--unavailable")) return;
  document.querySelectorAll(".track-opt").forEach(function(o) { o.classList.remove("active"); });
  el.classList.add("active");
  selTrack = el.getAttribute("data-val");
  var centre = document.getElementById("f-center").value;
  selTrackCode = (CENTRE_CODES[centre] && CENTRE_CODES[centre][selTrack]) || "";
  document.getElementById("f-track").value = selTrack;
  document.getElementById("f-track-code").value = selTrackCode;
  el.style.transform = "scale(0.98)";
  setTimeout(function() { el.style.transform = ""; }, 100);
}

function pickDur(el) {
  document.querySelectorAll(".dur-opt").forEach(function(o) { o.classList.remove("active"); });
  el.classList.add("active");
  selDuration = el.getAttribute("data-val");
  document.getElementById("f-duration").value = selDuration;
  el.style.transform = "scale(0.98)";
  setTimeout(function() { el.style.transform = ""; }, 100);
}

function validateForm() {
  var msgEl = document.getElementById("form-msg");
  var name = document.getElementById("f-name").value.trim();
  var email = document.getElementById("f-email").value.trim();
  var phone = document.getElementById("f-phone").value.trim();
  var college = document.getElementById("f-college").value.trim();
  var degree = document.getElementById("f-degree").value.trim();
  var sem = document.getElementById("f-semester").value;
  var center = document.getElementById("f-center").value;

  if (!name || !email || !phone || !college || !degree || !sem || !selTrack || !selDuration || !center) {
    showError(msgEl, "Please fill all required fields and select a track, centre, and duration.");
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError(msgEl, "Please enter a valid email address.");
    return false;
  }
  var phoneClean = phone.replace(/[\s\-\(\)]/g, "");
  if (!/^(\+91)?[6-9]\d{9}$/.test(phoneClean) && !/^\+[1-9]\d{7,14}$/.test(phoneClean)) {
    showError(msgEl, "Please enter a valid mobile number.");
    return false;
  }
  return true;
}

function showError(msgEl, message) {
  msgEl.className = "pg-msg pg-msg-err";
  msgEl.style.display = "block";
  msgEl.innerHTML = "<i class='fas fa-exclamation-circle'></i>&nbsp; " + message;
  msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
}

function submitForm() {
  var msgEl = document.getElementById("form-msg");
  if (!validateForm()) return;
  msgEl.style.display = "none";
  openPayPreview();
}

function executePayment() {
  var btn = document.getElementById("submit-btn");
  var msgEl = document.getElementById("form-msg");
  var chk = document.getElementById("pay-confirm-check");

  if (!validateForm()) {
    closePayPreview();
    return;
  }
  if (!chk || !chk.checked) {
    return;
  }

  closePayPreview();

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>&nbsp; Opening Secure Payment...';

  var name = document.getElementById("f-name").value.trim();
  var email = document.getElementById("f-email").value.trim();
  var phone = document.getElementById("f-phone").value.trim().replace(/[\s\-\(\)]/g, "");
  var college = document.getElementById("f-college").value.trim();
  var degree = document.getElementById("f-degree").value.trim();
  var sem = document.getElementById("f-semester").value;
  var center = document.getElementById("f-center").value;
  var link = document.getElementById("f-link").value.trim();
  var why = document.getElementById("f-why").value.trim();

  PAYMENT_AMOUNT = PAYMENT_AMOUNT_DEFAULT;
  if (email.toLowerCase() === "peregrine.ptc@gmail.com") {
    PAYMENT_AMOUNT = 100;
  }

  var appData = {
    organisation: college,
    sector: "Internship Applicant — " + selTrackCode + " " + selTrack,
    contact: name,
    email: email,
    phone: phone,
    service: selDuration + " | " + selTrackCode + " — " + selTrack,
    roles: "Degree:" + degree + " | Sem:" + sem + " | Centre:" + center +
      " | CourseCode:" + selTrackCode +
      (link ? " | Portfolio:" + link : "") +
      (why ? " | Why:" + why.slice(0, 200) : "")
  };

  try {
    openRazorpay(appData, btn, msgEl);
  } catch (error) {
    console.error("Razorpay error:", error);
    showError(msgEl, "Payment gateway error. Please try again or contact support.");
    btn.disabled = false;
    btn.innerHTML = stickyPayButtonHTML();
  }
}

function openRazorpay(appData, btn, msgEl) {
  var options = {
    "key": RZP_KEY_ID,
    "amount": PAYMENT_AMOUNT,
    "currency": "INR",
    "name": "Peregrine T&C",
    "description": "Professional Apprenticeship - " + selTrack,
    "image": "https://www.peregrinehub.com/favicon.ico",
    "handler": function(response) {
      btn.innerHTML = '<span class="spinner"></span>&nbsp; Confirming Enrollment...';
      handlePaymentSuccess(response.razorpay_payment_id, appData);
    },
    "prefill": {
      "name": appData.contact,
      "email": appData.email,
      "contact": appData.phone
    },
    "notes": {
      "name": appData.contact,
      "email": appData.email,
      "phone": appData.phone,
      "college": appData.organisation,
      "track": selTrack,
      "course_code": selTrackCode,
      "centre": document.getElementById("f-center").value
    },
    "theme": {
      "color": "#0d5e3a"
    },
    "modal": {
      "ondismiss": function() {
        btn.disabled = false;
        btn.innerHTML = stickyPayButtonHTML();
        showError(msgEl, "Payment was cancelled. Your application was not submitted.");
      },
      "escape": true,
      "backdropclose": false
    },
    "retry": {
      "enabled": true,
      "max_count": 3
    },
    "timeout": 900,
    "remember_customer": false
  };

  razorpayInstance = new Razorpay(options);
  
  razorpayInstance.on('payment.failed', function(response) {
    console.error("Payment failed:", response.error);
    btn.disabled = false;
    btn.innerHTML = stickyPayButtonHTML();
    
    var errorMsg = "Payment failed. ";
    if (response.error.description) {
      errorMsg += response.error.description;
    } else {
      errorMsg += "Please try again or contact support.";
    }
    showError(msgEl, errorMsg);
  });

  razorpayInstance.open();
}

function handlePaymentSuccess(paymentId, appData) {
  appData.service = "[INTERNSHIP-CONFIRMED] " + appData.service;
  appData.roles = appData.roles + " | PayID:" + paymentId;

  // 3. UPDATED: Using 'text/plain' and 'no-cors' to ensure Google doesn't block the data
  fetch(SHEET_URL, {
    method: "POST",
    mode: "no-cors", 
    headers: { "Content-Type": "text/plain;charset=utf-8" }, 
    body: JSON.stringify(appData)
  })
  .then(function() {
    showSuccessView();
  })
  .catch(function(error) {
    console.error("Sheet update error:", error);
    showSuccessView();
  });
}

function showSuccessView() {
  var formCard = document.getElementById("form-card");
  var successView = document.getElementById("success-view");
  var stickyFooter = document.getElementById("pg-sticky-footer");
  var deadlineBanner = document.getElementById("deadline-banner");

  if (formCard) formCard.style.display = "none";
  if (stickyFooter) stickyFooter.style.display = "none";
  if (deadlineBanner) deadlineBanner.style.display = "none";

  if (successView) {
    successView.style.display = "block";
    setTimeout(function() {
      successView.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }
}

(function() {
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function(e) { e.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(function(el) { io.observe(el); });
})();
