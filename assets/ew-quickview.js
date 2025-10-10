document.addEventListener('DOMContentLoaded', function () {
  // Handle variant size selection
  document.querySelectorAll('.ew-size-option input[type="radio"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      const all = radio.closest('.ew-size-options').querySelectorAll('.ew-size-option');
      all.forEach(lbl => lbl.classList.remove('checked'));
      radio.closest('.ew-size-option').classList.add('checked');

      const variantId = radio.dataset.variantId;
      const quickForm = document.querySelector('form[action="/cart/add"]');
      if (quickForm && variantId) {
        let idInput = quickForm.querySelector('input[name="id"]');
        if (!idInput) {
          idInput = document.createElement('input');
          idInput.type = 'hidden';
          idInput.name = 'id';
          quickForm.appendChild(idInput);
        }
        idInput.value = variantId;
      }
    });
  });

  // Handle remove / close quickview
  document.querySelectorAll('.ew-quickview-close')?.forEach(btn => {
    btn.addEventListener('click', function () {
      const quickview = btn.closest('.ew-quickview');
      if (quickview) quickview.classList.remove('active');
    });
  });

  // Handle Size Chart popup
  document.querySelectorAll('.ew-open-sizechart')?.forEach(button => {
    button.addEventListener('click', function () {
      const quickview = button.closest('.card-product');
      const popup = quickview.querySelector('.ew-sizechart-popup');
      if (popup) popup.classList.add('active');
    });
  });

  // Close size chart popup
  document.addEventListener('click', function (e) {
    if (e.target.matches('.ew-sizechart-close, .ew-sizechart-popup__overlay')) {
      const popup = e.target.closest('.ew-sizechart-popup');
      if (popup) popup.classList.remove('active');
    }
  });
});

/**
 * assets/ew-quickview.js
 * Complete quickview script: open/close quickview, size radios, add-to-cart, buy-now,
 * fetch cart, update cart count, open Ella cart drawer (via your cart icon selector),
 * and refresh notification/events so theme CartItems updates correctly.
 *
 * Include with: <script src="{{ 'ew-quickview.js' | asset_url }}" defer></script>
 */

(function () {
  'use strict';

  // ---------- tiny DOM helpers ----------
  function $qs(selector, root) { return (root || document).querySelector(selector); }
  function $qsa(selector, root) { return Array.from((root || document).querySelectorAll(selector)); }

  // ---------- small UI toast fallback ----------
  function showEwMiniToast(message, timeout = 2500) {
    try {
      const existing = document.querySelector('.ew-mini-toast');
      if (existing) existing.remove();
      const toast = document.createElement('div');
      toast.className = 'ew-mini-toast';
      toast.textContent = message;
      Object.assign(toast.style, {
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        background: '#111',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: '6px',
        zIndex: 99999,
        boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
        transition: 'opacity .25s ease'
      });
      document.body.appendChild(toast);
      setTimeout(() => (toast.style.opacity = '0'), timeout);
      setTimeout(() => { if (toast && toast.parentNode) toast.parentNode.removeChild(toast); }, timeout + 300);
    } catch (e) { /* ignore */ }
  }

  // ---------- cart AJAX helpers ----------
  function ajaxAddToCart(variantId, quantity = 1) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity })
    }).then(res => {
      if (!res.ok) return res.json().then(err => { throw err; });
      return res.json();
    });
  }

  function fetchCart() {
    return fetch('/cart.js', { credentials: 'same-origin' }).then(res => {
      if (!res.ok) throw new Error('Could not fetch cart');
      return res.json();
    });
  }

  function updateCartCount(cart) {
    if (!cart) return;
    $qsa('[data-cart-count]').forEach(el => { el.textContent = cart.item_count || 0; });
  }

  // ---------- event dispatch (so theme code can react) ----------
  function dispatchCartEvents(cart) {
    try { window.dispatchEvent(new CustomEvent('ew:cart-updated', { detail: cart })); } catch(e){}
    try { window.dispatchEvent(new CustomEvent('cart:updated', { detail: cart })); } catch(e){}
    try { document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart })); } catch(e){}
  }

  // ---------- open drawer by clicking your cart icon bubble ----------
  function openCartByIcon() {
    const cartIcon = document.querySelector('.header-basic__content #cart-icon-bubble');
    if (cartIcon) {
      try { cartIcon.click(); console.info('EW: clicked cart icon bubble'); return true; } catch(e) { console.warn('EW: click failed', e); return false; }
    }
    return false;
  }

  // ---------- attempt to refresh drawer content (best-effort) ----------
  function refreshEllaDrawer(cart) {
    dispatchCartEvents(cart);

    // Try common theme-exposed refresh functions (best-effort)
    try {
      if (window.Ella && typeof window.Ella.refreshCart === 'function') { window.Ella.refreshCart(cart); return true; }
      if (window.theme && typeof window.theme.refreshCart === 'function') { window.theme.refreshCart(cart); return true; }
      if (window.cartDrawer && typeof window.cartDrawer.refresh === 'function') { window.cartDrawer.refresh(cart); return true; }
    } catch(e) { /* ignore */ }

    // Try updating a few likely drawer elements (simple pieces) to avoid showing stale totals/count
    try {
      const drawerSelectors = [
        '.drawer--cart', '#CartDrawer', '.cart-drawer', '.ajaxcart__inner', '.drawer--right[data-drawer="cart"]'
      ];
      for (const sel of drawerSelectors) {
        const container = document.querySelector(sel);
        if (!container) continue;

        // update count badges within drawer if present
        container.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = cart.item_count || 0; });

        // update simple subtotal-like elements (best effort)
        const subtotalEls = container.querySelectorAll('.cart-subtotal, .ajaxcart__subtotal, .drawer-subtotal, .cart__subtotal');
        subtotalEls.forEach(el => {
          try {
            const cents = cart.items_subtotal_price || cart.total_price || 0;
            el.textContent = '$' + (Number(cents) / 100).toFixed(2);
          } catch (err) { /* ignore formatting errors */ }
        });

        return true;
      }
    } catch (err) { /* ignore */ }

    return false;
  }

  // ---------- Combined post-add handler ----------
  // Fetches cart, updates counts, opens drawer and triggers refresh/events.
  function handlePostAdd(addResult) {
    return fetchCart()
      .then(cart => {
        updateCartCount(cart);

        // dispatch events so theme code updates
        dispatchCartEvents(cart);

        // open drawer (click icon) — preferred
        const opened = openCartByIcon();

        // short delay to let drawer mount, then attempt refresh
        setTimeout(() => {
          const refreshed = refreshEllaDrawer(cart);
          if (!opened && !refreshed) {
            // if neither opened nor refreshed, show toast fallback
            showEwMiniToast('Added to cart');
          }
        }, 250);

        return cart;
      });
  }

  // ---------- Quickview UI: triggers, radios, actions, size chart ----------
  function initQuickviewTriggers() {
    $qsa('.ew-quickview-button').forEach(button => {
      button.addEventListener('click', function () {
        $qsa('.ew-quickview.active').forEach(m => m.classList.remove('active'));
        const card = this.closest('.product-item');
        if (!card) return;
        const quickviewModal = card.querySelector('.ew-quickview');
        if (quickviewModal) quickviewModal.classList.add('active');
      });
    });

    // close quickview when clicking outside
    document.addEventListener('click', function (e) {
      if (e.target.closest('.ew-quickview') || e.target.closest('.ew-quickview-button')) return;
      // $qsa('.ew-quickview.active').forEach(m => m.classList.remove('active'));
    });
  }

  function initSizeRadios() {
    $qsa('.ew-quickview').forEach(quickview => {
      const radios = $qsa('input[type="radio"][name="size"]', quickview);
      if (!radios.length) return;
      // initial classes
      radios.forEach(r => { const lbl = r.closest('.ew-size-option'); if (lbl) lbl.classList.toggle('checked', r.checked); });
      quickview.addEventListener('change', function (e) {
        if (!e.target.matches('input[type="radio"][name="size"]')) return;
        radios.forEach(r => { const lbl = r.closest('.ew-size-option'); if (lbl) lbl.classList.toggle('checked', r.checked); });
      });
    });
  }

  function initQuickviewActions() {
    $qsa('.ew-quickview').forEach(quickview => {
      const addBtn = quickview.querySelector('.ew-add-to-cart');
      const buyBtn = quickview.querySelector('.ew-buy-now');
      const qtyInput = quickview.querySelector('.ew-qty-input'); // optional

      function getSelectedVariantId() {
        const checked = quickview.querySelector('input[type="radio"][name="size"]:checked');
        if (checked && checked.dataset && checked.dataset.variantId) return checked.dataset.variantId;
        const any = quickview.querySelector('input[type="radio"][name="size"][data-variant-id]');
        return any ? any.dataset.variantId : null;
      }

      function setLoading(state) {
        [addBtn, buyBtn].forEach(b => { if (!b) return; b.disabled = state; b.classList.toggle('is-loading', state); });
      }

      if (addBtn) {
        addBtn.addEventListener('click', function () {
          const variantId = getSelectedVariantId();
          if (!variantId) { alert('Please select a size.'); return; }
          const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;

          setLoading(true);
          ajaxAddToCart(variantId, qty)
            .then(addResult => handlePostAdd(addResult))
            .catch(err => {
              console.error('Add to cart error', err);
              alert((err && err.description) ? err.description : 'Could not add to cart — please try again.');
            })
            .finally(() => setLoading(false));
        });
      }

      if (buyBtn) {
        buyBtn.addEventListener('click', function () {
          const variantId = getSelectedVariantId();
          if (!variantId) { alert('Please select a size.'); return; }
          const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;

          setLoading(true);
          ajaxAddToCart(variantId, qty)
            .then(() => fetchCart())
            .then(cart => {
              // ensure drawer refresh attempt before redirecting to checkout
              openCartByIcon();
              setTimeout(() => { refreshEllaDrawer(cart); window.location.href = '/checkout'; }, 150);
            })
            .catch(err => {
              console.error('Buy now error', err);
              alert((err && err.description) ? err.description : 'Could not proceed to checkout — please try again.');
            });
        });
      }
    });
  }

  function initSizeChartPopup() {
    $qsa('.ew-open-sizechart').forEach(btn => {
      btn.addEventListener('click', function () {
        const quick = this.closest('.ew-quickview');
        const popup = quick ? quick.querySelector('.ew-sizechart-popup') : null;
        if (popup) { popup.classList.add('active'); popup.setAttribute('aria-hidden', 'false'); }
      });
    });

    // close size chart
    document.addEventListener('click', function (e) {
      if (e.target.matches('.ew-sizechart-popup__overlay') || e.target.matches('.ew-sizechart-close')) {
        const popup = e.target.closest('.ew-sizechart-popup');
        if (popup) { popup.classList.remove('active'); popup.setAttribute('aria-hidden', 'true'); }
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        $qsa('.ew-sizechart-popup.active').forEach(p => { p.classList.remove('active'); p.setAttribute('aria-hidden', 'true'); });
      }
    });
  }

  function initQuickviewClose() {
    $qsa('.ew-quickview-close').forEach(btn => {
      btn.addEventListener('click', function () { const q = this.closest('.ew-quickview'); if (q) q.classList.remove('active'); });
    });
  }

  // ---------- Initialize on DOM ready ----------
  document.addEventListener('DOMContentLoaded', function () {
    initQuickviewTriggers();
    initSizeRadios();
    initQuickviewActions();
    initSizeChartPopup();
    initQuickviewClose();
  });

  // expose helpers for debugging
  window.ewQuickview = {
    ajaxAddToCart,
    fetchCart,
    handlePostAdd,
    openCartByIcon,
    refreshEllaDrawer,
    showEwMiniToast
  };

})();

(function () {
  'use strict';

  function $qs(selector, root) { return (root || document).querySelector(selector); }
  function $qsa(selector, root) { return Array.from((root || document).querySelectorAll(selector)); }

  function showEwMiniToast(message, timeout = 2500) {
    const existing = document.querySelector('.ew-mini-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'ew-mini-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed', right: '16px', bottom: '16px',
      background: '#111', color: '#fff', padding: '8px 12px',
      borderRadius: '6px', zIndex: 99999, boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
      transition: 'opacity .25s ease'
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '0', timeout);
    setTimeout(() => toast.remove(), timeout + 300);
  }

  function ajaxAddToCart(variantId, quantity = 1) {
    return fetch('/cart/add.js', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity })
    }).then(res => {
      if (!res.ok) return res.json().then(err => { throw err; });
      return res.json();
    });
  }

  function fetchCart() {
    return fetch('/cart.js', { credentials: 'same-origin' }).then(res => res.json());
  }

  function updateCartCount(cart) {
    $qsa('[data-cart-count]').forEach(el => el.textContent = cart.item_count || 0);
  }

  function dispatchCartEvents(cart) {
    try { window.dispatchEvent(new CustomEvent('ew:cart-updated', { detail: cart })); } catch(e){}
    try { window.dispatchEvent(new CustomEvent('cart:updated', { detail: cart })); } catch(e){}
    try { document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart })); } catch(e){}
  }

  function openCartByIcon() {
    const cartIcon = document.querySelector('.header-basic__content #cart-icon-bubble');
    if (cartIcon) { try { cartIcon.click(); return true; } catch(e){ return false; } }
    return false;
  }

  function refreshEllaDrawer(cart) {
    dispatchCartEvents(cart);
    try { if (window.Ella && typeof window.Ella.refreshCart === 'function') { window.Ella.refreshCart(cart); return true; } } catch(e){}
    try { if (window.theme && typeof window.theme.refreshCart === 'function') { window.theme.refreshCart(cart); return true; } } catch(e){}
    try { if (window.cartDrawer && typeof window.cartDrawer.refresh === 'function') { window.cartDrawer.refresh(cart); return true; } } catch(e){}
    return false;
  }

  function handlePostAdd(addResult) {
    return fetchCart().then(cart => {
      updateCartCount(cart);
      dispatchCartEvents(cart);
      const opened = openCartByIcon();
      setTimeout(() => { if (!opened) refreshEllaDrawer(cart); }, 250);
      return cart;
    });
  }

  function initQuickview(context) {
    context = context || document;

    // Open quickview
    $qsa('.ew-quickview-button', context).forEach(btn => {
      btn.addEventListener('click', function () {
        $qsa('.ew-quickview.active').forEach(m => m.classList.remove('active'));
        const card = btn.closest('.product-item');
        if (!card) return;
        const quickview = card.querySelector('.ew-quickview');
        if (quickview) quickview.classList.add('active');
      });
    });

    // Close quickview
    $qsa('.ew-quickview-close', context).forEach(btn => {
      btn.addEventListener('click', function () {
        const quickview = btn.closest('.ew-quickview');
        if (quickview) quickview.classList.remove('active');
      });
    });

    // Size radios
    $qsa('.ew-quickview', context).forEach(q => {
      const radios = $qsa('input[type="radio"][name="size"]', q);
      radios.forEach(r => { r.closest('.ew-size-option').classList.toggle('checked', r.checked); });
      q.addEventListener('change', e => {
        if (!e.target.matches('input[type="radio"][name="size"]')) return;
        radios.forEach(r => r.closest('.ew-size-option').classList.toggle('checked', r.checked));
      });
    });

    // Add-to-cart & buy-now
    $qsa('.ew-quickview', context).forEach(q => {
      const addBtn = q.querySelector('.ew-add-to-cart');
      const buyBtn = q.querySelector('.ew-buy-now');
      const qtyInput = q.querySelector('.ew-qty-input');

      function getSelectedVariantId() {
        const checked = q.querySelector('input[type="radio"][name="size"]:checked');
        return checked?.dataset?.variantId || null;
      }

      function setLoading(state) {
        [addBtn, buyBtn].forEach(b => { if (!b) return; b.disabled = state; b.classList.toggle('is-loading', state); });
      }

      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const variantId = getSelectedVariantId();
          if (!variantId) { alert('Please select a size.'); return; }
          const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value,10)||1) : 1;
          setLoading(true);
          ajaxAddToCart(variantId, qty)
            .then(handlePostAdd)
            .catch(err => alert(err?.description || 'Could not add to cart'))
            .finally(() => setLoading(false));
        });
      }

      if (buyBtn) {
        buyBtn.addEventListener('click', () => {
          const variantId = getSelectedVariantId();
          if (!variantId) { alert('Please select a size.'); return; }
          const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value,10)||1) : 1;
          setLoading(true);
          ajaxAddToCart(variantId, qty)
            .then(() => fetchCart())
            .then(cart => {
              openCartByIcon();
              setTimeout(() => { refreshEllaDrawer(cart); window.location.href='/checkout'; },150);
            })
            .catch(err => alert(err?.description || 'Could not proceed to checkout'));
        });
      }
    });

    // Size chart
    $qsa('.ew-open-sizechart', context).forEach(btn => {
      btn.addEventListener('click', () => {
        const quick = btn.closest('.ew-quickview');
        const popup = quick?.querySelector('.ew-sizechart-popup');
        if (popup) popup.classList.add('active');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => initQuickview(document));

  // Expose global for infinite scroll
  window.EWQuickview = { init: initQuickview };

})();