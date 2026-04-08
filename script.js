/**
 * script.js – Mangalam HDPE Pipes Product Page
 *
 * Covers:
 *  1. Sticky header – appears on scroll past hero, disappears on scroll up
 *  2. Image carousel – prev/next + thumbnail switching
 *  3. Zoom-on-hover – lens + floating preview panel
 *  4. Applications carousel – drag / button scroll
 *  5. Manufacturing process tabs
 *  6. Process pane prev/next navigation
 *  7. Mobile hamburger menu
 *  8. Smooth scroll for in-page anchor links
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

  /**
   * threshold = height of the main nav + viewport height (first fold)
   * We recalculate on resize so it stays accurate.
   */
  let threshold = mainNav.offsetHeight + window.innerHeight;

  window.addEventListener("resize", () => {
    threshold = mainNav.offsetHeight + window.innerHeight;
  });

  function onScroll() {
    const currentY = window.scrollY;
    const scrollingUp = currentY < lastScrollY;

    if (currentY > threshold) {
      // Past the fold – show header only when scrolling UP
      if (scrollingUp) {
        stickyHeader.classList.add("is-visible");
        stickyHeader.removeAttribute("aria-hidden");
      } else {
        stickyHeader.classList.remove("is-visible");
        stickyHeader.setAttribute("aria-hidden", "true");
      }
    } else {
      // Still in the first fold – always hide sticky header
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
   2. IMAGE CAROUSEL
   Handles:
   - Prev / next arrow navigation
   - Thumbnail click → switch image
   - Active thumbnail highlight
   ============================================================ */
(function initCarousel() {
  /** All carousel image sources – full-size and thumb are same URL
      with different Unsplash size params.  */
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

  if (!mainImg || !thumbBtns.length) return;

  let currentIndex = 0;

  /**
   * switchToImage – update the main image + active thumb state
   * @param {number} index - target image index
   */
  function switchToImage(index) {
    // Clamp index with wrap-around
    currentIndex = (index + images.length) % images.length;

    // Fade out → swap src → fade in
    mainImg.style.opacity = "0";
    mainImg.style.transition = "opacity 0.25s ease";

    setTimeout(() => {
      mainImg.src = images[currentIndex];
      mainImg.style.opacity = "1";
    }, 200);

    // Update active thumbnail
    thumbBtns.forEach((btn, i) => {
      btn.classList.toggle("active", i === currentIndex);
      btn.setAttribute("aria-pressed", i === currentIndex ? "true" : "false");
    });

    // Keep zoom preview in sync
    updateZoomPreviewSrc(images[currentIndex]);
  }

  // Arrow buttons
  prevBtn.addEventListener("click", () => switchToImage(currentIndex - 1));
  nextBtn.addEventListener("click", () => switchToImage(currentIndex + 1));

  // Keyboard arrow support on gallery
  document.addEventListener("keydown", (e) => {
    if (document.activeElement.closest("#productGallery")) {
      if (e.key === "ArrowLeft") switchToImage(currentIndex - 1);
      if (e.key === "ArrowRight") switchToImage(currentIndex + 1);
    }
  });

  // Thumbnail clicks
  thumbBtns.forEach((btn, i) => {
    btn.addEventListener("click", () => switchToImage(i));
  });

  // Touch swipe support on main image
  let touchStartX = 0;
  const galleryMain = document.getElementById("galleryMain");

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
      if (Math.abs(diff) > 40) {
        switchToImage(currentIndex + (diff > 0 ? 1 : -1));
      }
    },
    { passive: true },
  );

  // Expose update function for zoom module
  window._carouselGetCurrentSrc = () => images[currentIndex];
})();

/* ============================================================
   3. IMAGE ZOOM ON HOVER
   - A "lens" rectangle follows the cursor over the main image
   - A floating preview panel shows the zoomed area
   ============================================================ */
(function initZoom() {
  const galleryMain = document.getElementById("galleryMain");
  const mainImg = document.getElementById("mainImage");
  const zoomLens = document.getElementById("zoomLens");
  const zoomPreview = document.getElementById("zoomPreview");
  const zoomPreviewImg = document.getElementById("zoomPreviewImg");

  if (!galleryMain || !zoomLens || !zoomPreview || !zoomPreviewImg) return;

  /** Zoom magnification factor */
  const ZOOM = 3;
  const LENS_W = 140;
  const LENS_H = 140;

  // Set the preview image once and update on slide change
  function setPreviewSrc(src) {
    zoomPreviewImg.src = src;
  }

  // Called by carousel when image changes
  window.updateZoomPreviewSrc = setPreviewSrc;

  // Initialise with first image
  setPreviewSrc(mainImg.src);
  mainImg.addEventListener("load", () => setPreviewSrc(mainImg.src));

  /**
   * onMouseMove – calculate lens position and update the zoomed image offset
   */
  function onMouseMove(e) {
    const rect = galleryMain.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    // Clamp lens so it stays fully within the image
    const lensX = Math.max(LENS_W / 2, Math.min(relX, rect.width - LENS_W / 2));
    const lensY = Math.max(
      LENS_H / 2,
      Math.min(relY, rect.height - LENS_H / 2),
    );

    // Position lens (centred on cursor)
    zoomLens.style.left = lensX + "px";
    zoomLens.style.top = lensY + "px";

    // Calculate the background offset for the preview panel
    // Preview panel is 320 × 320; magnified image is (rect.width*ZOOM) × (rect.height*ZOOM)
    const previewW = 320;
    const previewH = 320;

    // Fraction of image the cursor is at
    const fracX = (lensX - LENS_W / 2) / (rect.width - LENS_W);
    const fracY = (lensY - LENS_H / 2) / (rect.height - LENS_H);

    const imgNaturalW = mainImg.naturalWidth || rect.width;
    const imgNaturalH = mainImg.naturalHeight || rect.height;

    // Scale to fill the preview at ZOOM level
    const scaledW = imgNaturalW * ZOOM * (previewW / (LENS_W * ZOOM));
    const scaledH = imgNaturalH * ZOOM * (previewH / (LENS_H * ZOOM));

    // Offset so the correct region fills the preview box
    const offsetX = -(fracX * (scaledW - previewW));
    const offsetY = -(fracY * (scaledH - previewH));

    // Apply to preview image via transform
    zoomPreviewImg.style.width = scaledW + "px";
    zoomPreviewImg.style.height = scaledH + "px";
    zoomPreviewImg.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  }

  // Show / hide
  galleryMain.addEventListener("mouseenter", () => {
    zoomPreview.classList.add("active");
    zoomPreview.removeAttribute("aria-hidden");
  });

  galleryMain.addEventListener("mouseleave", () => {
    zoomPreview.classList.remove("active");
    zoomPreview.setAttribute("aria-hidden", "true");
  });

  galleryMain.addEventListener("mousemove", onMouseMove);
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
