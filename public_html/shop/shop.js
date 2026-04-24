/* ==========================================================
   ILS SHOP — Core JavaScript
   Navbar · Quote List · Filters · Search · Language · Render
   ========================================================== */
 
(function () {
  'use strict';
 
  /* ----------------------------------------
     STATE
     ---------------------------------------- */
  let currentLang   = localStorage.getItem('ils-lang') || 'en';
  let currentCat    = 'all';   // 'all' | 'laboratory' | 'chemistry'
  let currentBrand  = 'all';
  let currentSubcat = 'all';
  let currentLetter = 'all';
  let searchQuery   = '';
  let quoteList     = JSON.parse(localStorage.getItem('ils-quote') || '[]');
 
  /* ----------------------------------------
     NAVBAR SCROLL
     ---------------------------------------- */
  const navbar = document.getElementById('navbar');
  function checkNavbar() {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', checkNavbar, { passive: true });
  checkNavbar();
 
  /* ----------------------------------------
     MOBILE MENU
     ---------------------------------------- */
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');
 
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
 
    if (mobileClose) {
      mobileClose.addEventListener('click', function () {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
 
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }
 
  /* ----------------------------------------
     LANGUAGE SWITCHER
     ---------------------------------------- */
  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('ils-lang', lang);
 
    document.querySelectorAll('[data-en]').forEach(function (el) {
      var text = lang === 'fr' ? el.dataset.fr : el.dataset.en;
      if (!text) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });
 
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
 
    // Re-render products with new language
    renderProducts();
    updateFilterChips();
    updateSubcatChips();
  }
 
  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLanguage(btn.dataset.lang);
    });
  });
 
  /* ----------------------------------------
     QUOTE LIST (localStorage)
     ---------------------------------------- */
  function saveQuote() {
    localStorage.setItem('ils-quote', JSON.stringify(quoteList));
    updateQuoteCount();
  }
 
  function updateQuoteCount() {
    document.querySelectorAll('.quote-count').forEach(function (el) {
      el.textContent  = quoteList.length;
      el.dataset.count = quoteList.length;
    });
  }
 
  function isInQuote(id) {
    return quoteList.some(function (item) { return item.id === id; });
  }
 
  function addToQuote(product) {
    if (isInQuote(product.id)) {
      removeFromQuote(product.id);
      return false;
    }
    quoteList.push({ id: product.id, brand: product.brand, name: product.name, ref: product.ref });
    saveQuote();
    showToast(product);
 
    // Animate count badge
    document.querySelectorAll('.quote-count').forEach(function (el) {
      el.classList.add('bump');
      setTimeout(function () { el.classList.remove('bump'); }, 300);
    });
 
    return true;
  }
 
  function removeFromQuote(id) {
    quoteList = quoteList.filter(function (item) { return item.id !== id; });
    saveQuote();
  }
 
  /* ----------------------------------------
     TOAST NOTIFICATION
     ---------------------------------------- */
  var toastEl = null;
  var toastTimer = null;
 
  function showToast(product) {
    if (!toastEl) return;
    var titleEl = toastEl.querySelector('.toast-title');
    var subEl   = toastEl.querySelector('.toast-sub');
 
    titleEl.textContent = product.name;
    subEl.textContent   = currentLang === 'fr'
      ? 'Ajouté à votre liste de devis'
      : 'Added to your quote list';
 
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 3500);
  }
 
  /* ----------------------------------------
     SEARCH
     ---------------------------------------- */
  var searchInput = document.getElementById('searchInput');
  var searchClear = document.getElementById('searchClear');
 
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      searchQuery = searchInput.value.trim().toLowerCase();
      searchClear.classList.toggle('visible', searchQuery.length > 0);
      renderProducts();
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', function () {
      searchInput.value = '';
      searchQuery = '';
      searchClear.classList.remove('visible');
      searchInput.focus();
      renderProducts();
    });
  }
 
  /* ----------------------------------------
     FILTER CHIPS
     ---------------------------------------- */
  function updateFilterChips() {
    // Update brand chips visibility based on category
    var brands = getVisibleBrands();
    document.querySelectorAll('.brand-chip').forEach(function (chip) {
      var brand = chip.dataset.brand;
      if (brand === 'all') return;
      chip.style.display = brands.has(brand) ? '' : 'none';
    });
  }
 
  function getVisibleBrands() {
    var set = new Set();
    ILS_PRODUCTS.forEach(function (p) {
      if (currentCat === 'all' || p.category === currentCat) {
        set.add(p.brandSlug);
      }
    });
    return set;
  }
 
  /* ----------------------------------------
     SUBCATEGORY FILTER (dynamic)
     ---------------------------------------- */
  function updateSubcatChips() {
    var group = document.getElementById('subcatGroup');
    if (!group) return;
 
    // Only show when a specific category is selected
    if (currentCat === 'all') {
      group.style.display = 'none';
      currentSubcat = 'all';
      return;
    }
 
    // Gather subcategories available for current cat + brand
    var subcats = [];
    var seen = {};
    ILS_PRODUCTS.forEach(function (p) {
      var matchCat   = p.category  === currentCat;
      var matchBrand = currentBrand === 'all' || p.brandSlug === currentBrand;
      if (matchCat && matchBrand && p.subcategory && !seen[p.subcategory]) {
        seen[p.subcategory] = true;
        subcats.push(p.subcategory);
      }
    });
 
    if (subcats.length <= 1) {
      group.style.display = 'none';
      currentSubcat = 'all';
      return;
    }
 
    var lang = currentLang;
    var allLabel = lang === 'fr' ? 'Tous types' : 'All types';
    var html = '<span class="filter-label" data-en="Type" data-fr="Type">' + (lang === 'fr' ? 'Type' : 'Type') + '</span>';
    html += '<button class="filter-chip subcat-chip' + (currentSubcat === 'all' ? ' active' : '') + '" data-subcat="all">' + allLabel + '</button>';
 
    subcats.forEach(function (sub) {
      var label = SUBCATEGORY_LABELS[sub] ? SUBCATEGORY_LABELS[sub][lang] : sub;
      html += '<button class="filter-chip subcat-chip' + (currentSubcat === sub ? ' active' : '') + '" data-subcat="' + sub + '">' + label + '</button>';
    });
 
    group.innerHTML = html;
    group.style.display = '';
 
    // Bind subcat clicks
    group.querySelectorAll('.subcat-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        group.querySelectorAll('.subcat-chip').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        currentSubcat = chip.dataset.subcat;
        renderProducts();
      });
    });
  }
 
  document.querySelectorAll('.cat-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.cat-chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      currentCat    = chip.dataset.cat;
      currentBrand  = 'all';
      currentSubcat = 'all';
      document.querySelectorAll('.brand-chip').forEach(function (c) { c.classList.remove('active'); });
      var allBrand = document.querySelector('.brand-chip[data-brand="all"]');
      if (allBrand) allBrand.classList.add('active');
      updateFilterChips();
      updateSubcatChips();
      renderProducts();
    });
  });
 
  document.querySelectorAll('.brand-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.brand-chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      currentBrand  = chip.dataset.brand;
      currentSubcat = 'all';
      updateSubcatChips();
      renderProducts();
    });
  });
 
  /* ----------------------------------------
     FILTER PRODUCTS
     ---------------------------------------- */
  function filterProducts() {
    return ILS_PRODUCTS.filter(function (p) {
      var matchCat    = currentCat    === 'all' || p.category   === currentCat;
      var matchBrand  = currentBrand  === 'all' || p.brandSlug  === currentBrand;
      var matchSubcat = currentSubcat === 'all' || p.subcategory === currentSubcat;
      var matchSearch = !searchQuery || (
        (p.nameEn  || '').toLowerCase().includes(searchQuery) ||
        (p.nameFr  || '').toLowerCase().includes(searchQuery) ||
        (p.ref     || '').toLowerCase().includes(searchQuery) ||
        (p.brand   || '').toLowerCase().includes(searchQuery) ||
        (p.description   || '').toLowerCase().includes(searchQuery) ||
        (p.descriptionFr || '').toLowerCase().includes(searchQuery) ||
        (p.subcategory   || '').toLowerCase().includes(searchQuery)
      );
      var pName = (currentLang === 'fr' && p.nameFr ? p.nameFr : p.nameEn) || '';
      var matchLetter = currentLetter === 'all' || pName.charAt(0).toUpperCase() === currentLetter;
      return matchCat && matchBrand && matchSubcat && matchSearch && matchLetter;
    });
  }

  /* ----------------------------------------
     RENDER PRODUCTS
     ---------------------------------------- */
  function buildProductCard(product) {
    var lang     = currentLang;
    var name     = lang === 'fr' && product.nameFr ? product.nameFr : product.nameEn;
    var desc     = lang === 'fr' && product.descriptionFr ? product.descriptionFr : product.description;
    var specs    = lang === 'fr' && product.specsFr ? product.specsFr : product.specs;
    var inQuote  = isInQuote(product.id);
 
    var addLabel = inQuote
      ? (lang === 'fr' ? 'Dans le devis' : 'In Quote List')
      : (lang === 'fr' ? 'Ajouter au devis' : 'Add to Quote');
 
    var specsHtml = specs.map(function (s) {
      return '<span class="spec-tag">' + escHtml(s) + '</span>';
    }).join('');
 
    var pdfHtml = product.pdf
      ? '<a href="' + escHtml(product.pdf) + '" class="product-pdf-badge" target="_blank" rel="noopener" title="Datasheet PDF">PDF</a>'
      : '';
 
    /* Placeholder image — navy bg + brand name in gold */
    var imgHtml = product.image
      ? '<img src="' + escHtml(product.image) + '" alt="' + escHtml(name) + '" loading="lazy">'
      : buildPlaceholder(product.brand);
 
    var productUrl = 'product.html?id=' + escHtml(product.id);
    return '<div class="product-card fade-up" data-id="' + escHtml(product.id) + '">' +
      '<a href="' + productUrl + '" class="product-img-link" aria-label="' + escHtml(name) + '">' +
        '<div class="product-img">' +
          '<span class="product-brand-badge">' + escHtml(product.brand) + '</span>' +
          pdfHtml +
          imgHtml +
        '</div>' +
      '</a>' +
      '<div class="product-body">' +
        '<div class="product-ref">' + escHtml(product.ref) + '</div>' +
        '<div class="product-name">' + escHtml(name) + '</div>' +
        '<div class="product-specs">' + specsHtml + '</div>' +
        '<div class="product-desc">' + escHtml(desc) + '</div>' +
      '</div>' +
      '<div class="product-actions">' +
        '<button class="add-to-quote-btn' + (inQuote ? ' added' : '') + '" data-id="' + escHtml(product.id) + '">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>' +
          addLabel +
        '</button>' +
        '<a href="product.html?id=' + escHtml(product.id) + '" class="detail-link-btn" title="' + (lang === 'fr' ? 'Voir le détail' : 'View details') + '">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' +
        '</a>' +
      '</div>' +
    '</div>';
  }
 
  function buildPlaceholder(brand) {
    return '<div class="product-img-brand">' + escHtml(brand) + '</div>' +
      '<div class="product-img-icon">' +
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C9A55C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"><path d="M3 3h18v4H3zm0 4v14h18V7"/><path d="M8 11h8M8 15h5"/></svg>' +
      '</div>';
  }
 
  function renderProducts() {
    var container   = document.getElementById('productsContainer');
    var countEl     = document.getElementById('resultCount');
    var emptyState  = document.getElementById('emptyState');
    if (!container) return;
 
    var filtered    = filterProducts();
    var lang        = currentLang;
 
    // Group by category then by subcategory only if showing 'all'
    if (filtered.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.add('visible');
      if (countEl) countEl.innerHTML = '0 ' + (lang === 'fr' ? 'résultats' : 'results');
      return;
    }
 
    if (emptyState) emptyState.classList.remove('visible');
    if (countEl) {
      countEl.innerHTML = '<strong>' + filtered.length + '</strong> ' +
        (lang === 'fr'
          ? (filtered.length > 1 ? 'produits' : 'produit')
          : (filtered.length > 1 ? 'products' : 'product'));
    }
 
    // Group by category, then by brand within each category
    var catOrder    = [];
    var catMap      = {};   // category → { label, brands: [{ brand, brandSlug, products[] }] }
    var brandSeen   = {};   // category::brand → true
 
    filtered.forEach(function (p) {
      if (!catMap[p.category]) {
        catOrder.push(p.category);
        catMap[p.category] = {
          label: CATEGORY_LABELS[p.category] ? CATEGORY_LABELS[p.category][lang] : p.category,
          brands: []
        };
      }
      var bKey = p.category + '::' + p.brand;
      if (!brandSeen[bKey]) {
        brandSeen[bKey] = true;
        catMap[p.category].brands.push({ brand: p.brand, brandSlug: p.brandSlug, products: [] });
      }
      // push to last brand entry (which is this brand)
      catMap[p.category].brands[catMap[p.category].brands.length - 1].products.push(p);
    });
 
    var html = '';
 
    catOrder.forEach(function (cat) {
      var c = catMap[cat];
      html += '<div class="category-section">' +
        '<div class="category-header fade-up">' +
          '<div class="label-overline">' + escHtml(c.label) + '</div>' +
        '</div>';
 
      c.brands.forEach(function (b) {
        html +=
          '<div class="brand-subsection">' +
            '<div class="brand-subsection-header fade-up">' +
              '<h2 class="category-title">' + escHtml(b.brand) + '</h2>' +
              '<span class="brand-subsection-count">' + b.products.length + (lang === 'fr' ? ' produit' : ' product') + (b.products.length > 1 ? 's' : '') + '</span>' +
            '</div>' +
            '<div class="product-grid">' +
            b.products.map(buildProductCard).join('') +
            '</div>' +
          '</div>';
      });
 
      html += '</div>';
    });
 
    container.innerHTML = html;
 
    // Bind add-to-quote buttons
    container.querySelectorAll('.add-to-quote-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.id;
        var product = ILS_PRODUCTS.find(function (p) { return p.id === id; });
        if (!product) return;
 
        var added = addToQuote(product);
        var lang  = currentLang;
 
        if (added) {
          btn.classList.add('added');
          btn.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
            (lang === 'fr' ? 'Dans le devis' : 'In Quote List');
        } else {
          btn.classList.remove('added');
          btn.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>' +
            (lang === 'fr' ? 'Ajouter au devis' : 'Add to Quote');
        }
      });
    });
 
    // Trigger fade-up
    observeFadeUp();
  }
 
  /* ----------------------------------------
     FADE-UP OBSERVER
     ---------------------------------------- */
  function observeFadeUp() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
 
    document.querySelectorAll('.fade-up:not(.visible)').forEach(function (el) {
      observer.observe(el);
    });
 
    // Fallback
    setTimeout(function () {
      document.querySelectorAll('.fade-up').forEach(function (el) {
        el.classList.add('visible');
      });
    }, 1200);
  }
 
  /* ----------------------------------------
     SMOOTH SCROLL ANCHORS
     ---------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id === '#') return;
      var target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - (navbar ? navbar.offsetHeight + 16 : 80);
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });
 
  /* ----------------------------------------
     UTILITY
     ---------------------------------------- */
  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
 
  /* ----------------------------------------
     BRAND QUICK-FILTER STRIP (index.html)
     ---------------------------------------- */
  document.querySelectorAll('.brand-quick-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var brand = btn.dataset.brand;
      var cat   = btn.dataset.cat || 'all';
 
      // Update category chips
      currentCat = cat;
      document.querySelectorAll('.cat-chip').forEach(function (c) { c.classList.remove('active'); });
      var catChip = document.querySelector('.cat-chip[data-cat="' + cat + '"]');
      if (catChip) catChip.classList.add('active');
 
      // Update brand chips
      currentBrand  = brand;
      currentSubcat = 'all';
      document.querySelectorAll('.brand-chip').forEach(function (c) { c.classList.remove('active'); });
      var brandChip = document.querySelector('.brand-chip[data-brand="' + brand + '"]');
      if (brandChip) brandChip.classList.add('active');
 
      // Highlight active quick btn
      document.querySelectorAll('.brand-quick-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
 
      updateFilterChips();
      updateSubcatChips();
      renderProducts();
 
      // Smooth scroll to products
      var container = document.getElementById('productsContainer');
      if (container) {
        var top = container.getBoundingClientRect().top + window.scrollY - ((navbar ? navbar.offsetHeight : 64) + 80);
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });
 
  /* ----------------------------------------
     INIT
     ---------------------------------------- */
  function init() {
    toastEl = document.getElementById('quoteToast');
 
    // Support page-specific default category/brand (set via ILS_SHOP_CONFIG global)
    if (window.ILS_SHOP_CONFIG) {
      if (window.ILS_SHOP_CONFIG.defaultCat) {
        currentCat = window.ILS_SHOP_CONFIG.defaultCat;
        var catChip = document.querySelector('.cat-chip[data-cat="' + currentCat + '"]');
        if (catChip) {
          document.querySelectorAll('.cat-chip').forEach(function (c) { c.classList.remove('active'); });
          catChip.classList.add('active');
        }
      }
    }
 
    // Update dynamic stat counter (index.html stats bar)
    var statEl = document.getElementById('statProductCount');
    if (statEl) statEl.textContent = ILS_PRODUCTS.length;
 
    updateQuoteCount();
    updateFilterChips();
    updateSubcatChips();
    setLanguage(currentLang);
    renderProducts();
    observeFadeUp();

    /* ----------------------------------------
       ALPHA FILTER — bound inside init() so the
       DOM is guaranteed ready and state is live
       ---------------------------------------- */
    var alphaBar = document.getElementById('alphaBar');
    if (alphaBar) {
      alphaBar.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-letter]');
        if (!btn) return;

        var letter = btn.dataset.letter;

        // Toggle: clicking the already-active letter resets to 'all'
        if (letter !== 'all' && currentLetter === letter) {
          letter = 'all';
        }

        currentLetter = letter;

        // Update active state on the bar
        alphaBar.querySelectorAll('[data-letter]').forEach(function (b) {
          b.classList.toggle('active', b.dataset.letter === currentLetter);
        });

        renderProducts();
      });
    }
  }
 
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
 
})();