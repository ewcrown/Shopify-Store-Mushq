/**
 * COMPLETE SPLIDE MANAGER + CONTINUOUS AUTO "SHOW MORE" (DROP-IN)
 * - WeakMap instance storage (no ID mismatch)
 * - Safe targeted destroy/reinit (no global destructive wipes)
 * - Debounced mutation handling
 * - Continuous auto "Show more" that triggers when visible and waits for completion
 * - Rebinds after full collection/grid replacements (fixes removal-after-3-4-pages)
 * - Filter button, product size chart, quickview, add-to-cart handlers
 * - Console helpers: showSplideStatus(), repairAllSplides()
 *
 * Usage: paste entire file into your theme JS (replace previous copies).
 */

(function () {
  'use strict';

  /* --------------------
   * CONFIG
   * -------------------- */
  const CARD_SELECTOR = '.card-media-splide';
  const COLLECTION_SLIDER_SELECTOR = '.luis-collection-slider-splide';
  const DEBOUNCE_TIME = 300;

  // Fallback selectors for load-more / show-more control
  const LOAD_MORE_SELECTORS = [
    '[data-infinite-scrolling]',
    '.load-more-button',
    '.show-more',
    '.js-load-more',
    'button.load-more',
    'a.load-more'
  ];

  /* --------------------
   * STATE
   * -------------------- */
  const instances = new WeakMap(); // element -> Splide instance
  let mutationObserver = null;
  let filterButtonInitialized = false;
  let urlWatcherInitialized = false;
  let globalLoadMoreObserver = null;

  /* --------------------
   * UTILITIES
   * -------------------- */
  const debounce = (fn, wait = DEBOUNCE_TIME) => {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  function safeDestroy(el) {
    if (!el) return;
    try {
      const inst = instances.get(el);
      if (inst && typeof inst.destroy === 'function') {
        inst.destroy(true);
        console.log('[Splide] Destroyed instance for element:', el);
      }
    } catch (err) {
      console.warn('[Splide] Error destroying instance:', err);
    } finally {
      instances.delete(el);
      el.classList.remove('splide-initialized');
      try { el._splide = null; } catch (e) {}
    }
  }

  function mountSplideOn(el, opts) {
    if (!el || typeof Splide === 'undefined') {
      if (typeof Splide === 'undefined') console.warn('[Splide] Splide library not found');
      return null;
    }

    const existing = instances.get(el);
    if (existing && existing.Components && typeof existing.mount === 'function') {
      el.classList.add('splide-initialized');
      el._splide = existing;
      return existing;
    }

    if (existing) safeDestroy(el);

    try {
      const sp = new Splide(el, opts);
      sp.mount();
      instances.set(el, sp);
      el._splide = sp;
      el.classList.add('splide-initialized');

      if (!el.dataset.splideId) {
        el.dataset.splideId = `splide-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
      }

      console.log('[Splide] Mounted new instance', el.dataset.splideId, el);
      return sp;
    } catch (err) {
      console.error('[Splide] Error mounting:', err, el);
      safeDestroy(el);
      return null;
    }
  }

  // Initialize only elements not already mounted
  function initSplidesForNewElements(context = document) {
    initCollectionSlider(context);
    const allCards = Array.from(context.querySelectorAll(CARD_SELECTOR));
    allCards.forEach((el, i) => {
      if (!instances.has(el)) {
        setTimeout(() => mountSplideOn(el, cardOpts), i * 10);
      }
    });
    console.log('[Splide] initSplidesForNewElements() processed', allCards.length, 'cards');
  }

  // Destroy splides found in provided context
  function destroySplidesInContext(context = document) {
    const cards = Array.from(context.querySelectorAll(CARD_SELECTOR));
    cards.forEach(el => {
      if (instances.has(el)) safeDestroy(el);
    });
    const collections = Array.from(context.querySelectorAll(COLLECTION_SLIDER_SELECTOR));
    collections.forEach(el => {
      if (instances.has(el)) safeDestroy(el);
    });
    console.log('[Splide] destroySplidesInContext done for context');
  }

  /* --------------------
   * SPLIDE OPTIONS
   * -------------------- */
  const collectionSliderOpts = {
    perPage: 2,
    perMove: 1,
    rewind: true,
    gap: '7px',
    arrows: true,
    autoplay: true,
    speed: 200,
    pagination: false,
    focus: 'left',
    padding: { right: '5%' },
    breakpoints: {
      700: { perPage: 2, gap: '10px', padding: { right: 0 } },
      480: { perPage: 2, gap: '10px', padding: { right: 0 } }
    }
  };

  const cardOpts = {
    type: 'slide',
    perPage: 1,
    perMove: 1,
    autoplay: false,
    arrows: true,
    pagination: false,
    gap: '0.5rem',
    speed: 150,
    rewind: true,
    lazyLoad: 'nearby',
    preloadPages: 1,
    breakpoints: {
      768: { arrows: false }
    }
  };

  function initCollectionSlider(context = document) {
    const collectionSliders = Array.from(context.querySelectorAll(COLLECTION_SLIDER_SELECTOR));
    collectionSliders.forEach((slider, idx) => {
      setTimeout(() => mountSplideOn(slider, collectionSliderOpts), idx * 30);
    });
  }

  function initSplidesImmediately(context = document) {
    destroySplidesInContext(context);
    initSplidesForNewElements(context);
  }

  function initSplidesLazy(context = document) {
    initCollectionSlider(context);
    const allCards = Array.from(context.querySelectorAll(CARD_SELECTOR));
    allCards.forEach((el, idx) => {
      if (instances.has(el)) return;
      if (idx < 4) {
        mountSplideOn(el, cardOpts);
      } else {
        setTimeout(() => mountSplideOn(el, cardOpts), 100 + idx * 25);
      }
    });
  }

  /* --------------------
   * CONTINUOUS AUTO "SHOW MORE" / INFINITE SCROLL
   * -------------------- */

  (function continuousAutoShowMore() {
    let autoLoadInProgress = false;
    let _io = null;
    let _watcher = null;
    let currentLoadMore = null;
    let reobserveTimer = null;
    let pollingFallbackTimer = null;

    function findLoadMore() {
      for (const sel of LOAD_MORE_SELECTORS) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const isHidden = el.offsetParent === null;
        const isDisabled = el.classList.contains('disabled') || el.disabled || el.getAttribute('aria-disabled') === 'true';
        if (!isHidden && !isDisabled) return el;
      }
      return document.querySelector('[data-infinite-scrolling]') || null;
    }

    function triggerLoadMore(el) {
      if (!el) return false;
      try {
        el.click();
        console.log('[AutoLoad] clicked', el);
        return true;
      } catch (e) {
        console.warn('[AutoLoad] native click failed', e);
      }
      try {
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
        el.dispatchEvent(ev);
        console.log('[AutoLoad] dispatched MouseEvent click', el);
        return true;
      } catch (e) {
        console.warn('[AutoLoad] MouseEvent fallback failed', e);
      }
      try {
        const custom = new CustomEvent('showmore:trigger', { bubbles: true });
        el.dispatchEvent(custom);
        console.log('[AutoLoad] dispatched showmore:trigger', el);
        return true;
      } catch (e) {
        console.warn('[AutoLoad] final fallback failed', e);
        return false;
      }
    }

    function stopObservingLoadMore() {
      try { if (_io) { _io.disconnect(); _io = null; } } catch (e) {}
      try { if (_watcher) { _watcher.disconnect(); _watcher = null; } } catch (e) {}
      try { if (pollingFallbackTimer) { clearInterval(pollingFallbackTimer); pollingFallbackTimer = null; } } catch (e) {}
      currentLoadMore = null;
    }

    function scheduleReobserve(delay = 700) {
      if (reobserveTimer) clearTimeout(reobserveTimer);
      reobserveTimer = setTimeout(() => {
        reobserveTimer = null;
        setupAutoInfiniteScroll();
      }, delay);
    }

    function startPollingFallback(el) {
      if (pollingFallbackTimer) clearInterval(pollingFallbackTimer);
      pollingFallbackTimer = setInterval(() => {
        if (!document.body.contains(el)) {
          clearInterval(pollingFallbackTimer);
          pollingFallbackTimer = null;
          scheduleReobserve(300);
          return;
        }
        const rect = el.getBoundingClientRect();
        const threshold = window.innerHeight + 400;
        if (!autoLoadInProgress && rect.top < threshold && !(el.classList.contains('disabled') || el.disabled)) {
          autoLoadInProgress = true;
          triggerLoadMore(el);
          waitForLoadCompletion(el);
        }
      }, 500);
    }

    function watchParentForReplacement(el) {
      const parent = el.parentElement || document.body;
      const mo = new MutationObserver(debounce((mutations) => {
        if (!document.body.contains(el)) {
          try { mo.disconnect(); } catch (e) {}
          stopObservingLoadMore();
          scheduleReobserve(300);
        }
      }, 250));
      mo.observe(parent, { childList: true, subtree: true });
      _watcher = mo;
    }

    function waitForLoadCompletion(el) {
      let resolved = false;
      let attrWatcher = null;
      let domWatcher = null;
      let timeoutId = null;

      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        autoLoadInProgress = false;
        try { initSplidesForNewElements(document); } catch (e) { console.warn('[AutoLoad] init error', e); }
        try { document.removeEventListener('loadmore:complete', onEvent); } catch(e){}
        try { document.removeEventListener('products:appended', onEvent); } catch(e){}
        try { document.removeEventListener('showmore:complete', onEvent); } catch(e){}
        try { if (attrWatcher) attrWatcher.disconnect(); } catch(e){}
        try { if (domWatcher) domWatcher.disconnect(); } catch(e){}
        if (timeoutId) clearTimeout(timeoutId);
        scheduleReobserve(150);
      };

      const onEvent = (e) => {
        if (!resolved) cleanup();
      };

      document.addEventListener('loadmore:complete', onEvent, { once: true });
      document.addEventListener('products:appended', onEvent, { once: true });
      document.addEventListener('showmore:complete', onEvent, { once: true });

      try {
        attrWatcher = new MutationObserver((muts) => {
          if (!document.body.contains(el)) {
            if (!resolved) cleanup();
          } else {
            const disabledNow = el.classList.contains('disabled') || el.disabled || el.getAttribute('aria-disabled') === 'true';
            if (!disabledNow && !resolved) {
              cleanup();
            }
          }
        });
        attrWatcher.observe(el, { attributes: true, attributeFilter: ['class', 'disabled', 'aria-disabled'] });
      } catch (e) {}

      try {
        const productContainer = document.querySelector('.collection-list, .product-grid, .products-grid, .collection') || document.body;
        domWatcher = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.addedNodes && m.addedNodes.length) {
              if (!resolved) cleanup();
              break;
            }
          }
        });
        domWatcher.observe(productContainer, { childList: true, subtree: true });
      } catch (e) {}

      timeoutId = setTimeout(() => {
        if (!resolved) cleanup();
      }, 6000);
    }

    function observeLoadMore(el) {
      stopObservingLoadMore();

      if (!el) {
        scheduleReobserve();
        return;
      }

      currentLoadMore = el;
      const isDisabled = () => el.classList.contains('disabled') || el.disabled || el.getAttribute('aria-disabled') === 'true';

      if (isDisabled()) {
        const attrObserver = new MutationObserver((mut) => {
          if (!isDisabled()) {
            try { attrObserver.disconnect(); } catch (e) {}
            setTimeout(() => setupAutoInfiniteScroll(), 250);
          }
        });
        attrObserver.observe(el, { attributes: true, attributeFilter: ['class', 'disabled', 'aria-disabled'] });
        return;
      }

      if ('IntersectionObserver' in window) {
        _io = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !autoLoadInProgress) {
              autoLoadInProgress = true;
              setTimeout(() => {
                triggerLoadMore(el);
                waitForLoadCompletion(el);
              }, 120);
            }
          });
        }, { root: null, rootMargin: '400px 0px', threshold: 0 });
        try {
          _io.observe(el);
          console.log('[AutoLoad] observing load-more element', el);
        } catch (e) {
          console.warn('[AutoLoad] IO observe failed, using fallback', e);
          startPollingFallback(el);
        }
        watchParentForReplacement(el);
        return;
      }

      startPollingFallback(el);
      watchParentForReplacement(el);
    }

    function setupAutoInfiniteScroll() {
      if (_io) try { _io.disconnect(); _io = null; } catch (e) {}
      if (_watcher) try { _watcher.disconnect(); _watcher = null; } catch (e) {}
      if (pollingFallbackTimer) try { clearInterval(pollingFallbackTimer); pollingFallbackTimer = null; } catch (e) {}

      const el = findLoadMore();
      if (!el) {
        if (reobserveTimer) clearTimeout(reobserveTimer);
        reobserveTimer = setTimeout(setupAutoInfiniteScroll, 700);
        return;
      }

      const disabled = el.classList.contains('disabled') || el.disabled || el.getAttribute('aria-disabled') === 'true';
      if (disabled) {
        const attrObs = new MutationObserver((mut) => {
          if (!(el.classList.contains('disabled') || el.disabled || el.getAttribute('aria-disabled') === 'true')) {
            try { attrObs.disconnect(); } catch(e){}
            setTimeout(setupAutoInfiniteScroll, 120);
          }
        });
        attrObs.observe(el, { attributes: true, attributeFilter: ['class', 'disabled', 'aria-disabled'] });
        return;
      }

      observeLoadMore(el);
    }

    // Expose small helper to global scope
    window.setupAutoInfiniteScroll = setupAutoInfiniteScroll;

    // Start
    try { setupAutoInfiniteScroll(); } catch (e) { console.warn('setupAutoInfiniteScroll start failed', e); }

    // Re-observe globally if a load-more appears later
    try {
      if (!globalLoadMoreObserver) {
        globalLoadMoreObserver = new MutationObserver(debounce((mutations) => {
          setupAutoInfiniteScroll();
        }, 600));
        globalLoadMoreObserver.observe(document.body, { childList: true, subtree: true });
      }
    } catch (e) { /* ignore */ }

  })(); // end continuousAutoShowMore IIFE

  /* --------------------
   * WATCH COLLECTION CONTAINER (fixes full replacement)
   * -------------------- */
  function watchCollectionContainer() {
    try {
      const container = document.querySelector('.collection, .product-grid, .collection-list, .products-grid');
      if (!container) {
        // If not found, try again later (theme may render it after load)
        setTimeout(watchCollectionContainer, 500);
        return;
      }

      const mo = new MutationObserver(debounce((mutations) => {
        // If the grid is replaced/cleared and recreated, react
        let replaced = false;
        for (const m of mutations) {
          if (m.type === 'childList' && (m.removedNodes.length || m.addedNodes.length)) {
            replaced = true;
            break;
          }
        }
        if (replaced) {
          console.log('[WatchGrid] Collection container changed — reinitializing splides & auto-load');
          try { initSplidesForNewElements(document); } catch (e) { console.warn('[WatchGrid] init error', e); }
          try { window.setupAutoInfiniteScroll(); } catch (e) { console.warn('[WatchGrid] setupAutoInfiniteScroll error', e); }
        }
      }, 250));

      mo.observe(container, { childList: true, subtree: false });
      console.log('[WatchGrid] Observing product grid for replacement');
    } catch (e) {
      console.warn('[WatchGrid] could not attach observer', e);
    }
  }

  /* --------------------
   * FILTER BUTTON
   * -------------------- */
  function setupFilterButton() {
    if (filterButtonInitialized) return;
    const filterButton = document.querySelector('.ew-filter-button');
    if (!filterButton) { console.log('[Filter] .ew-filter-button not found'); return; }
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.ew-filter-button')) return;
      e.preventDefault();
      const sidebar = document.querySelector('.ew__sidebar--content');
      if (!sidebar) return console.log('[Filter] sidebar not found');
      const isActive = sidebar.classList.toggle('ew-sidebar-filter');
      filterButton.textContent = isActive ? 'Hide Filters' : 'Filters';
    });
    filterButtonInitialized = true;
    console.log('[Filter] Filter button initialized');
  }

  /* --------------------
   * PRODUCT SIZE CHART
   * -------------------- */
  function setupProductSizeChartButtons() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.ew-product-size-chart, .ew-open-sizechart');
      if (!btn) return;
      e.preventDefault();

      const productItem = btn.closest('.product-item') || btn.closest('.card-product') || btn.closest('.ew-quickview');
      if (productItem) {
        const popup = productItem.querySelector('.ew-sizechart-popup');
        if (popup) {
          popup.classList.add('active');
          return;
        }
      }

      const all = document.querySelectorAll('.ew-sizechart-popup');
      if (all.length) {
        all[0].classList.add('active');
      } else {
        console.error('[SizeChart] No popup found');
      }
    });

    document.addEventListener('click', function (e) {
      if (e.target.matches('.ew-sizechart-close, .ew-sizechart-popup__overlay')) {
        const popup = e.target.closest('.ew-sizechart-popup');
        if (popup) popup.classList.remove('active');
      }
    });
  }

  /* --------------------
   * QUICKVIEW / CART / PRICE HANDLING
   * -------------------- */
  function addToCart(variantId, quantity = 1) {
    return $.post(`${window.routes.root}/cart/add.js`, { id: variantId, quantity });
  }

  function updateSidebarCart(cart) {
    const $dropdown = $('#halo-cart-sidebar .halo-sidebar-wrapper .previewCart-wrapper');
    if (!$dropdown.length) return;
    $dropdown.addClass('is-loading').prepend(`
      <div class="loading-overlay loading-overlay--custom">
        <div class="loading-overlay__spinner">
          <svg class="spinner" viewBox="0 0 66 66"><circle class="path" fill="none" stroke-width="6" cx="33" cy="33" r="30"></circle></svg>
        </div>
      </div>
    `);
    $.get(`${window.routes.root}/cart?view=ajax_side_cart`, (data) => {
      $dropdown.removeClass('is-loading').html(data);
      document.body.classList.add('cart-sidebar-show');
    });
  }

  function updatePriceDisplayFromRadio(radio) {
    if (!radio) return;
    const priceEl = radio.closest('.ew-quickview')?.querySelector('.ew-price-current');
    const compareEl = radio.closest('.ew-quickview')?.querySelector('.ew-price-compare');
    const price = radio.dataset.variantPriceFormatted || (radio.dataset.variantPrice / 100).toFixed(2);
    const compare = radio.dataset.compareAtPriceFormatted || '';
    if (priceEl) priceEl.innerHTML = price;
    if (compareEl) {
      if (compare && compare !== 'undefined') {
        compareEl.innerHTML = compare;
        compareEl.style.display = '';
      } else {
        compareEl.style.display = 'none';
      }
    }
  }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.ew-quickview-button');
    if (btn) {
      e.preventDefault();
      document.querySelectorAll('.ew-quickview.active').forEach(m => m.classList.remove('active'));
      const card = btn.closest('.product-item');
      const modal = card?.querySelector('.ew-quickview');
      if (modal) modal.classList.add('active');
      return;
    }
    const closeBtn = e.target.closest('.ew-quickview-close');
    if (closeBtn) closeBtn.closest('.ew-quickview')?.classList.remove('active');
  });

  document.addEventListener('change', function (e) {
    const radio = e.target.closest('.ew-size-option input[type="radio"]');
    if (!radio) return;
    radio.closest('.ew-size-options')?.querySelectorAll('.ew-size-option').forEach(l => l.classList.remove('checked'));
    radio.closest('.ew-size-option')?.classList.add('checked');
    updatePriceDisplayFromRadio(radio);
  });

  document.addEventListener('click', async function (e) {
    const cartBtn = e.target.closest('.ew-add-to-cart');
    if (!cartBtn) return;
    e.preventDefault();
    const card = cartBtn.closest('.product-item');
    const selected = card.querySelector('.ew-size-option.checked input');
    if (!selected) return alert('Please select a size.');
    const variantId = selected.dataset.variantId || selected.value;

    cartBtn.disabled = true;
    $(cartBtn).addClass('is-loading');

    try {
      await addToCart(variantId, 1);
      const cart = await $.getJSON(`${window.routes.root}/cart.js`);
      updateSidebarCart(cart);
    } catch {
      alert('Could not add to cart.');
    } finally {
      cartBtn.disabled = false;
      $(cartBtn).removeClass('is-loading');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.ew-quickview.active').forEach(m => m.classList.remove('active'));
      document.querySelectorAll('.ew-sizechart-popup.active').forEach(m => m.classList.remove('active'));
    }
  });

  /* --------------------
   * EVENT LISTENERS & MUTATION OBSERVER
   * -------------------- */
  const reinitSplidesDebounced = debounce((context = document) => {
    console.log('[Event] reinitSplidesDebounced for context', context);
    initSplidesForNewElements(context);
  }, 250);

  function setupCollectionListeners() {
    if (setupCollectionListeners._initialized) return;
    setupCollectionListeners._initialized = true;

    const events = [
      'collection:loaded',
      'collection:products:loaded',
      'collection:append',
      'products:appended',
      'ajaxContentReplaced',
      'filter:updated',
      'sort:changed',
      'loadmore:complete',
      'shopify:section:load'
    ];

    events.forEach(eventName => {
      document.addEventListener(eventName, (e) => {
        console.log('[Event]', eventName, e && e.detail);
        if (eventName === 'loadmore:complete' || eventName === 'products:appended') {
          setTimeout(() => {
            try { initSplidesForNewElements(document); } catch (err) { console.warn(err); }
          }, 300);
        }
        reinitSplidesDebounced(e?.detail?.container || e?.detail?.context || document);
      });
    });

    if (!urlWatcherInitialized) {
      let currentUrl = window.location.href;
      setInterval(() => {
        if (window.location.href !== currentUrl) {
          currentUrl = window.location.href;
          setTimeout(() => reinitSplidesDebounced(document), 300);
        }
      }, 300);
      urlWatcherInitialized = true;
    }

    if (!mutationObserver) {
      mutationObserver = new MutationObserver((mutations) => {
        debounce(() => {
          let relevant = false;
          for (const m of mutations) {
            if (m.addedNodes && m.addedNodes.length) {
              for (const node of m.addedNodes) {
                if (node.nodeType === 1) {
                  if (node.matches && (node.matches(CARD_SELECTOR) || node.matches(COLLECTION_SLIDER_SELECTOR) || node.querySelector(CARD_SELECTOR) || node.querySelector(COLLECTION_SLIDER_SELECTOR))) {
                    relevant = true;
                    break;
                  }
                }
              }
            }
            if (relevant) break;
          }
          if (relevant) {
            reinitSplidesDebounced(document);
          }
        }, 200)();
      }, { childList: true, subtree: true });

      try { mutationObserver.observe(document.body, { childList: true, subtree: true }); } catch (e) { console.warn('[Mutation] observer failed', e); }
    }
  }

  /* --------------------
   * INITIALIZATION
   * -------------------- */
  function initialize() {
    const bootstrap = () => {
      initSplidesLazy(document);
      setupCollectionListeners();
      // continuous auto show-more is started in its IIFE and also exposed as window.setupAutoInfiniteScroll
      try { window.setupAutoInfiniteScroll(); } catch (e) {}
      setupFilterButton();
      setupProductSizeChartButtons();
      // important: watch the grid for full replacements
      watchCollectionContainer();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
      bootstrap();
    }

    // ensure auto infinite run also on these signals (idempotent)
    document.addEventListener('DOMContentLoaded', function() {
      try { window.setupAutoInfiniteScroll(); } catch (e) {}
    });
    document.addEventListener('collection:loaded', function() {
      try { window.setupAutoInfiniteScroll(); } catch (e) {}
    });
    document.addEventListener('ajaxContentReplaced', function() {
      try { window.setupAutoInfiniteScroll(); } catch (e) {}
    });
    document.addEventListener('products:appended', function() {
      try { window.setupAutoInfiniteScroll(); } catch (e) {}
    });
    document.addEventListener('loadmore:complete', function() {
      try { window.setupAutoInfiniteScroll(); } catch (e) {}
    });
  }

  initialize();

  /* --------------------
   * DEV / INSPECTOR HELPERS
   * -------------------- */
  window.showSplideStatus = function() {
    try {
      const list = [];
      const nodes = document.querySelectorAll(`${CARD_SELECTOR}, ${COLLECTION_SLIDER_SELECTOR}`);
      nodes.forEach(node => {
        const inst = instances.get(node);
        list.push({
          element: node,
          splideId: node.dataset.splideId || null,
          mounted: !!inst,
          instance: inst || null
        });
      });
      console.table(list.map(i => ({ splideId: i.splideId, mounted: i.mounted })));
      console.log('Full details:', list);
      return list;
    } catch (e) {
      console.warn('showSplideStatus error', e);
      return null;
    }
  };

  window.repairAllSplides = function() {
    console.log('[Repair] Reinitializing all splides (destroy+mount)');
    initSplidesImmediately(document);
  };

})();

// --- BLOCKER: Prevent ?page= from being added to URL ---
(function () {
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;

  history.pushState = function () {
    if (arguments[2] && arguments[2].includes('page=')) {
      console.log('Blocked pushState page param:', arguments[2]);
      return;
    }
    return originalPush.apply(history, arguments);
  };

  history.replaceState = function () {
    if (arguments[2] && arguments[2].includes('page=')) {
      console.log('Blocked replaceState page param:', arguments[2]);
      return;
    }
    return originalReplace.apply(history, arguments);
  };
})();
// --- RESETTER: Always keep URL clean (no ?page=) ---
// document.addEventListener('products:appended', function () {
//   history.replaceState({}, '', window.location.pathname);
// });

// document.addEventListener('loadmore:complete', function () {
//   history.replaceState({}, '', window.location.pathname);
// });

// document.addEventListener('collection:products:loaded', function () {
//   history.replaceState({}, '', window.location.pathname);
// })