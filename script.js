/**
 * script.js – Mangalam HDPE Pipes Product Page
 *
 * Covers:
 *  1. Sticky header – appears on scroll past hero, disappears on scroll up
 *  2. Image zoom on hover – lens on main image + background-based preview panel
 *  3. Image carousel – prev/next + thumbnail switching (defined AFTER zoom so
 *     notifyZoom() is already available)
 *  4. Applications carousel – drag / button scroll
 *  5. Manufacturing process tabs
 *  6. Process pane prev/next navigation
 *  7. Mobile hamburger menu
 *  8. Smooth scroll for in-page anchor links
 *  9. Brands ticker – pause on hover
 * 10. Catalogue email form validation
 * 11. Contact form validation
 */

"use strict";

/* ============================================================
   1. STICKY HEADER
   - Appears when user scrolls past the bottom of the hero fold
   - Hides when scrolling back up (direction-aware)
   ============================================================ */
(function initStickyHeader() {
  const stickyHeader = document.getElementById("stickyHeader");
  const mainNav = document.getElementById("mainNav");
  if (!stickyHeader || !mainNav) return;

  let lastScrollY = window.scrollY;
  let ticking = false;

  // threshold = nav height + full viewport height (bottom of first fold)
  let threshold = mainNav.offsetHeight + window.innerHeight;
  window.addEventListener("resize", () => {
    threshold = mainNav.offsetHeight + window.innerHeight;
  });

  function onScroll() {
    const currentY = window.scrollY;
    const scrollingUp = currentY < lastScrollY;

    if (currentY > threshold) {
      // Past the first fold – show only when scrolling UP
      if (scrollingUp) {
        stickyHeader.classList.add("is-visible");
        stickyHeader.removeAttribute("aria-hidden");
      } else {
        stickyHeader.classList.remove("is-visible");
        stickyHeader.setAttribute("aria-hidden", "true");
      }
    } else {
      stickyHeader.classList.remove("is-visible");
      stickyHeader.setAttribute("aria-hidden", "true");
    }

    lastScrollY = currentY;
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true },
  );
})();

/* ============================================================
   2. IMAGE ZOOM ON HOVER
   Defined BEFORE carousel so window.notifyZoom exists immediately.

   BEHAVIOUR:
   • Mouse enters gallery → lens appears, preview panel fades in
   • Mouse moves         → lens tracks cursor; preview shows zoomed region
   • Mouse leaves        → both hide
   • Carousel changes    → window.notifyZoom(src) updates preview src

   KEY FIX: background-position values can be negative or positive —
   we must NOT blindly prepend "-". We clamp them so the zoomed image
   never shows blank space at the edges of the preview panel.
   ============================================================ */
(function initZoom() {
  var galleryMain = document.getElementById("galleryMain");
  var mainImg = document.getElementById("mainImage");
  var zoomLens = document.getElementById("zoomLens");
  var zoomPreview = document.getElementById("zoomPreview");

  if (!galleryMain || !mainImg || !zoomLens || !zoomPreview) {
    console.warn("Zoom: element(s) missing");
    return;
  }

  var ZOOM = 1.5;
  var LENS_W = 80;
  var LENS_H = 80;

  zoomLens.style.width = LENS_W + "px";
  zoomLens.style.height = LENS_H + "px";

  var currentSrc = "";

  /* Called by carousel on every slide change */
  window.notifyZoom = function (src) {
    currentSrc = src;
  };

  /* Align preview panel top + height to match gallery__main */
  function alignPreview() {
    var galleryH = galleryMain.getBoundingClientRect().height;
    var previewH = Math.min(galleryH, 320);
    var offsetTop = galleryMain.offsetTop + galleryH / 2 - previewH / 2;
    zoomPreview.style.top = offsetTop + "px";
    zoomPreview.style.height = previewH + "px";
  }

  galleryMain.addEventListener("mouseenter", function () {
    currentSrc = mainImg.src;
    alignPreview();
    zoomLens.style.opacity = "1";
    zoomPreview.style.backgroundImage = 'url("' + currentSrc + '")';
    zoomPreview.classList.add("active");
    zoomPreview.removeAttribute("aria-hidden");
  });

  galleryMain.addEventListener("mouseleave", function () {
    zoomLens.style.opacity = "0";
    zoomPreview.classList.remove("active");
    zoomPreview.setAttribute("aria-hidden", "true");
  });

  galleryMain.addEventListener("mousemove", function (e) {
    var rect = galleryMain.getBoundingClientRect();
    var curX = e.clientX - rect.left;
    var curY = e.clientY - rect.top;

    /* Lens position — clamped inside the image */
    var lensLeft = Math.max(
      0,
      Math.min(curX - LENS_W / 2, rect.width - LENS_W),
    );
    var lensTop = Math.max(
      0,
      Math.min(curY - LENS_H / 2, rect.height - LENS_H),
    );
    zoomLens.style.left = lensLeft + "px";
    zoomLens.style.top = lensTop + "px";

    /* Preview background */
    var prevW = zoomPreview.offsetWidth || 380;
    var prevH = zoomPreview.offsetHeight || rect.height;
    var focusX = lensLeft + LENS_W / 2;
    var focusY = lensTop + LENS_H / 2;
    var bgW = rect.width * ZOOM;
    var bgH = rect.height * ZOOM;

    /* Offset so the focus point lands at the centre of the preview */
    var bgX = prevW / 2 - focusX * ZOOM;
    var bgY = prevH / 2 - focusY * ZOOM;

    /* Clamp — never show blank space at panel edges */
    bgX = Math.min(0, Math.max(bgX, prevW - bgW));
    bgY = Math.min(0, Math.max(bgY, prevH - bgH));

    zoomPreview.style.backgroundImage = 'url("' + currentSrc + '")';
    zoomPreview.style.backgroundSize = bgW + "px " + bgH + "px";
    zoomPreview.style.backgroundPosition = bgX + "px " + bgY + "px";
  });

  window.addEventListener("resize", function () {
    if (zoomPreview.classList.contains("active")) alignPreview();
  });
})();

/* ============================================================
   3. IMAGE CAROUSEL
   Handles:
   - Prev / next arrow navigation with fade transition
   - Thumbnail click → switch image
   - Active thumbnail highlight
   - Touch swipe support
   - Notifies zoom module on every slide change
   ============================================================ */
(function initCarousel() {
  const images = [
    "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=720&q=80",
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=720&q=80",
    "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=720&q=80",
    "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=720&q=80",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=720&q=80",
    "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=720&q=80",
  ];

  const mainImg = document.getElementById("mainImage");
  const thumbBtns = document.querySelectorAll(".gallery__thumb");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const galleryMain = document.getElementById("galleryMain");

  if (!mainImg || !thumbBtns.length) return;

  let currentIndex = 0;
  let transitioning = false; // prevent rapid double-clicks

  /**
   * switchToImage – fade-swap the main image and update thumbnails.
   * Also tells the zoom module which URL is now active.
   */
  function switchToImage(index) {
    if (transitioning) return;
    transitioning = true;

    currentIndex = (index + images.length) % images.length;
    const newSrc = images[currentIndex];

    // Fade out
    mainImg.style.transition = "opacity 0.2s ease";
    mainImg.style.opacity = "0";

    setTimeout(() => {
      mainImg.src = newSrc;
      mainImg.style.opacity = "1";
      transitioning = false;

      // Tell zoom module the new image URL
      if (typeof window.notifyZoom === "function") {
        window.notifyZoom(newSrc);
      }
    }, 220);

    // Update thumbnail highlight
    thumbBtns.forEach((btn, i) => {
      btn.classList.toggle("active", i === currentIndex);
      btn.setAttribute("aria-pressed", i === currentIndex ? "true" : "false");
    });
  }

  // Arrows
  if (prevBtn)
    prevBtn.addEventListener("click", () => switchToImage(currentIndex - 1));
  if (nextBtn)
    nextBtn.addEventListener("click", () => switchToImage(currentIndex + 1));

  // Thumbnails
  thumbBtns.forEach((btn, i) =>
    btn.addEventListener("click", () => switchToImage(i)),
  );

  // Keyboard – only when gallery is focused/active area
  document.addEventListener("keydown", (e) => {
    if (
      document.activeElement &&
      document.activeElement.closest("#productGallery")
    ) {
      if (e.key === "ArrowLeft") switchToImage(currentIndex - 1);
      if (e.key === "ArrowRight") switchToImage(currentIndex + 1);
    }
  });

  // Touch swipe
  if (galleryMain) {
    let touchStartX = 0;
    galleryMain.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
      },
      { passive: true },
    );
    galleryMain.addEventListener(
      "touchend",
      (e) => {
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40)
          switchToImage(currentIndex + (diff > 0 ? 1 : -1));
      },
      { passive: true },
    );
  }
})();

/* ============================================================
   4. APPLICATIONS CAROUSEL
   - Scrolls the card track left / right with buttons
   ============================================================ */
(function initAppCarousel() {
  const track = document.getElementById("appTrack");
  const prevBtn = document.getElementById("appPrev");
  const nextBtn = document.getElementById("appNext");

  if (!track) return;

  /** How many pixels to scroll per click (width of one card + gap) */
  function getScrollAmount() {
    const card = track.querySelector(".app-card");
    if (!card) return 300;
    return card.offsetWidth + 24; // 24px gap
  }

  if (prevBtn)
    prevBtn.addEventListener("click", () => {
      track.scrollBy({ left: -getScrollAmount(), behavior: "smooth" });
    });

  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      track.scrollBy({ left: getScrollAmount(), behavior: "smooth" });
    });

  // Enable overflow scroll so CSS snap / scroll works on mobile
  track.style.overflowX = "scroll";
  track.style.scrollSnapType = "x mandatory";
  track.querySelectorAll(".app-card").forEach((c) => {
    c.style.scrollSnapAlign = "start";
  });
})();

/* ============================================================
   5. MANUFACTURING PROCESS TABS
   - Click a tab to reveal the corresponding pane
   ============================================================ */
(function initProcessTabs() {
  const tabs = document.querySelectorAll(".process-tab");
  const panes = document.querySelectorAll(".process-pane");

  if (!tabs.length) return;

  function activateTab(tabEl) {
    const target = tabEl.dataset.tab;

    tabs.forEach((t) => {
      t.classList.toggle("active", t === tabEl);
      t.setAttribute("aria-selected", t === tabEl ? "true" : "false");
    });

    panes.forEach((p) => {
      p.classList.toggle("active", p.dataset.pane === target);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab));
  });
})();

/* ============================================================
   6. PROCESS PANE PREV / NEXT ARROWS
   - Navigate between process steps via arrows inside each pane
   ============================================================ */
(function initProcessPaneNav() {
  const tabOrder = [
    "raw",
    "extrusion",
    "cooling",
    "sizing",
    "qc",
    "marking",
    "cutting",
    "packaging",
  ];

  document.querySelectorAll(".process-nav").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Find the currently active tab
      const activeTab = document.querySelector(".process-tab.active");
      if (!activeTab) return;

      const currentPane = activeTab.dataset.tab;
      const currentIdx = tabOrder.indexOf(currentPane);
      let nextIdx;

      if (btn.classList.contains("process-nav--next")) {
        nextIdx = (currentIdx + 1) % tabOrder.length;
      } else {
        nextIdx = (currentIdx - 1 + tabOrder.length) % tabOrder.length;
      }

      // Simulate clicking the correct tab
      const nextTab = document.querySelector(
        `.process-tab[data-tab="${tabOrder[nextIdx]}"]`,
      );
      if (nextTab) nextTab.click();
    });
  });
})();

/* ============================================================
   7. MOBILE HAMBURGER MENU
   ============================================================ */
(function initMobileMenu() {
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.querySelector(".main-nav__links");
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    hamburger.classList.toggle("open", isOpen);
    hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  // Close menu on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".main-nav__inner")) {
      navLinks.classList.remove("open");
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    }
  });

  // Close on link click
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    });
  });
})();

/* ============================================================
   8. SMOOTH SCROLL FOR ANCHOR LINKS
   (Fallback for browsers without CSS scroll-behavior support)
   ============================================================ */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href").slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();

/* ============================================================
   9. BRANDS TICKER – pause on hover
   ============================================================ */
(function initTicker() {
  const inner = document.getElementById("tickerInner");
  if (!inner) return;

  inner.parentElement.addEventListener("mouseenter", () => {
    inner.style.animationPlayState = "paused";
  });
  inner.parentElement.addEventListener("mouseleave", () => {
    inner.style.animationPlayState = "running";
  });
})();

/* ============================================================
   10. CATALOGUE EMAIL FORM – basic validation feedback
   ============================================================ */
(function initCatalogueForm() {
  const form = document.querySelector(".catalogue-cta__form");
  if (!form) return;

  const input = form.querySelector('input[type="email"]');
  const btn = form.querySelector("button");

  if (!input || !btn) return;

  btn.addEventListener("click", () => {
    const val = input.value.trim();
    if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      input.style.borderColor = "#EF4444";
      input.focus();
      return;
    }
    input.style.borderColor = "";
    // Simulate success
    btn.textContent = "✓ Sent!";
    btn.disabled = true;
    input.value = "";
    setTimeout(() => {
      btn.textContent = "Request Catalogue";
      btn.disabled = false;
    }, 3000);
  });
})();

/* ============================================================
   11. CONTACT FORM – basic validation
   ============================================================ */
(function initContactForm() {
  const form = document.querySelector(".contact-section__form");
  if (!form) return;

  const submitBtn = form.querySelector(".btn");
  if (!submitBtn) return;

  submitBtn.addEventListener("click", () => {
    const inputs = form.querySelectorAll("input");
    let valid = true;

    inputs.forEach((input) => {
      if (!input.value.trim()) {
        input.style.borderColor = "#EF4444";
        valid = false;
      } else {
        input.style.borderColor = "";
      }
    });

    if (!valid) return;

    // Simulate submission
    submitBtn.textContent = "✓ Request Submitted!";
    submitBtn.disabled = true;
    inputs.forEach((i) => (i.value = ""));
    setTimeout(() => {
      submitBtn.textContent = "Request Custom Quote";
      submitBtn.disabled = false;
    }, 4000);
  });
})();
