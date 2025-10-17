/**
 * OPTIMIZED SPLIDE MANAGER FOR ELLA THEME - DEBUG VERSION
 * - Added debug logging for size chart issues
 * - Added auto infinite scroll functionality
 * - Fixed slider reinitialization after infinite scroll
 * - Added filter button functionality with single event listener
 * - Added product size chart button functionality
 */

(function () {
  'use strict';

  /* ----------------------------------------------
   * CONFIGURATION & UTILITIES
   * ---------------------------------------------- */
  const CARD_SELECTOR = '.card-media-splide';
  const COLLECTION_SLIDER_SELECTOR = '.luis-collection-slider-splide';
  const DEBOUNCE_TIME = 300;

  const instances = new Map();
  let observer = null;
  let infiniteScrollObserver = null;
  let filterButtonInitialized = false; // Track if filter button is already set up

  // Faster debounce for better responsiveness
  const debounce = (fn, wait = 100) => {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  // Safe destroy with better cleanup
  function safeDestroy(el) {
    if (!el) return;
    
    const instanceId = el.id;
    const instance = instances.get(instanceId);
    
    if (instance && typeof instance.destroy === 'function') {
      try {
        instance.destroy(true);
      } catch (e) {
        console.warn('Error destroying Splide:', e);
      }
    }
    
    instances.delete(instanceId);
    el.classList.remove('splide-initialized');
    el._splide = null;
  }

  // Optimized mount function
  function mountSplideOn(el, opts) {
    if (!el || typeof Splide === 'undefined') {
      console.warn('Splide not available');
      return null;
    }

    // Clean up any existing instance first
    safeDestroy(el);

    try {
      const sp = new Splide(el, opts);
      sp.mount();
      
      const instanceId = el.id || `splide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      instances.set(instanceId, sp);
      el._splide = sp;
      el.classList.add('splide-initialized');
      
      return sp;
    } catch (error) {
      console.error('Error mounting Splide:', error);
      return null;
    }
  }

  // Collection slider options
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

  // Product card slider options
  const cardOpts = {
    type: 'slide',
    perPage: 1,
    perMove: 1,
    autoplay: false,
    arrows: true,
    pagination: false,
    gap: '0.5rem',
    speed: 150, // Faster transitions
    rewind: true,
    lazyLoad: 'nearby',
    preloadPages: 1,
    breakpoints: {
      768: {
        arrows: false
      }
    }
  };

  /* ----------------------------------------------
   * CORE INITIALIZATION LOGIC
   * ---------------------------------------------- */
  
  function destroyAllSplides(context = document) {
    // Destroy card sliders
    const cards = context.querySelectorAll(CARD_SELECTOR);
    cards.forEach(el => {
      safeDestroy(el);
      if (observer) observer.unobserve(el);
    });

    // Destroy collection slider
    const collectionSliders = context.querySelectorAll(COLLECTION_SLIDER_SELECTOR);
    collectionSliders.forEach(slider => {
      safeDestroy(slider);
    });
  }

  function initCollectionSlider(context = document) {
    const collectionSliders = context.querySelectorAll(COLLECTION_SLIDER_SELECTOR);
    if (collectionSliders.length > 0) {
      console.log(`Initializing ${collectionSliders.length} collection slider(s)`);
      collectionSliders.forEach((slider, index) => {
        // Stagger initialization to prevent performance issues
        setTimeout(() => {
          mountSplideOn(slider, collectionSliderOpts);
        }, index * 50);
      });
    }
  }

  function initSplidesImmediately(context = document) {
    // Clean up first
    destroyAllSplides(context);

    // Initialize collection slider (works on homepage and anywhere else)
    initCollectionSlider(context);

    // Initialize all card sliders immediately (no lazy load for stability)
    const allCards = context.querySelectorAll(CARD_SELECTOR);
    
    allCards.forEach((el, index) => {
      // Small delay to prevent blocking the main thread
      setTimeout(() => {
        mountSplideOn(el, cardOpts);
      }, index * 10); // Stagger initialization
    });

    console.log(`Initialized ${allCards.length} product card sliders and collection sliders`);
  }

  function initSplidesLazy(context = document) {
    destroyAllSplides(context);

    // Initialize collection slider (works on homepage)
    initCollectionSlider(context);

    const allCards = context.querySelectorAll(CARD_SELECTOR);

    // Initialize first 4 immediately for better UX
    allCards.forEach((el, index) => {
      if (index < 4) {
        mountSplideOn(el, cardOpts);
      } else {
        // Lazy load the rest
        setTimeout(() => {
          mountSplideOn(el, cardOpts);
        }, 100 + (index * 20));
      }
    });
  }

  /* ----------------------------------------------
   * INFINITE SCROLL FUNCTIONALITY
   * ---------------------------------------------- */
  
  // Simple auto-click infinite scroll
  function setupAutoInfiniteScroll() {
    // Clean up existing observer
    if (infiniteScrollObserver) {
      infiniteScrollObserver.disconnect();
    }
    
    const loadMoreBtn = document.querySelector('[data-infinite-scrolling]');
    
    if (!loadMoreBtn || loadMoreBtn.classList.contains('disabled')) {
      console.log('No active infinite scroll button found');
      return;
    }
    
    console.log('Setting up auto infinite scroll observer');
    
    infiniteScrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          console.log('Auto-clicking load more button');
          
          // Add a small delay to ensure smooth loading
          setTimeout(() => {
            loadMoreBtn.click();
          }, 300);
        }
      });
    }, {
      rootMargin: '500px 0px', // Increased margin for smoother loading
      threshold: 0
    });
    
    infiniteScrollObserver.observe(loadMoreBtn);
  }

  /* ----------------------------------------------
   * FILTER BUTTON FUNCTIONALITY - FIXED VERSION
   * ---------------------------------------------- */
  
  function setupFilterButton() {
    // Only set up the filter button once
    if (filterButtonInitialized) {
      console.log('Filter button already initialized, skipping...');
      return;
    }
    
    const filterButton = document.querySelector('.ew-filter-button');
    if (filterButton) {
      console.log('Filter button found, setting up event listener');
      
      // Use event delegation instead of direct event listener
      document.addEventListener('click', function(e) {
        if (e.target.closest('.ew-filter-button')) {
          e.preventDefault();
          const sidebar = document.querySelector('.ew__sidebar--content');
          if (sidebar) {
            const isActive = sidebar.classList.toggle('ew-sidebar-filter');
            console.log('isActive==>', isActive);
            filterButton.textContent = isActive ? 'Hide Filters' : 'Filters';
          } else {
            console.log('Sidebar not found');
          }
        }
      });
      
      filterButtonInitialized = true; // Mark as initialized
    } else {
      console.log('Filter button not found');
    }
  }

  /* ----------------------------------------------
   * PRODUCT SIZE CHART BUTTON FUNCTIONALITY
   * ---------------------------------------------- */
  
  function setupProductSizeChartButtons() {
    // Handle product size chart button clicks
    document.addEventListener('click', function(e) {
      const productSizeChartBtn = e.target.closest('.ew-product-size-chart');
      if (productSizeChartBtn) {
        e.preventDefault();
        console.log('Product size chart button clicked!');
        
        // Look for the size chart popup in various locations
        let sizeChartPopup = null;
        
        // Method 1: Look in the same product item
        const productItem = productSizeChartBtn.closest('.product-item');
        if (productItem) {
          sizeChartPopup = productItem.querySelector('.ew-sizechart-popup');
          if (sizeChartPopup) {
            console.log('Found size chart popup in product item');
            sizeChartPopup.classList.add('active');
            return;
          }
        }
        
        // Method 2: Look in the same card
        const cardProduct = productSizeChartBtn.closest('.card-product');
        if (cardProduct) {
          sizeChartPopup = cardProduct.querySelector('.ew-sizechart-popup');
          if (sizeChartPopup) {
            console.log('Found size chart popup in card product');
            sizeChartPopup.classList.add('active');
            return;
          }
        }
        
        // Method 3: Global search as fallback
        console.log('Searching globally for size chart popup...');
        const allPopups = document.querySelectorAll('.ew-sizechart-popup');
        if (allPopups.length > 0) {
          sizeChartPopup = allPopups[0];
          console.log('Using first available size chart popup');
          sizeChartPopup.classList.add('active');
        } else {
          console.error('No size chart popup found for product size chart button');
        }
      }
    });
  }

  /* ----------------------------------------------
   * EVENT HANDLERS FOR FILTERS/SORTING
   * ---------------------------------------------- */
  
  const reinitSplides = debounce((context) => {
    console.log('Reinitializing Splide sliders after collection update');
    initSplidesImmediately(context);
  }, DEBOUNCE_TIME);

  // Enhanced event handler for infinite scroll completion
  function handleInfiniteScrollComplete() {
    console.log('Infinite scroll complete - reinitializing sliders');
    
    // Wait a bit for DOM to be fully updated
    setTimeout(() => {
      // Reinitialize all sliders in the newly loaded content
      initSplidesImmediately(document);
      
      // Re-setup infinite scroll for the next page
      setTimeout(() => {
        setupAutoInfiniteScroll();
      }, 200);
    }, 500);
  }

  // Listen for collection updates
  const setupCollectionListeners = () => {
    const events = [
      'collection:loaded',
      'collection:products:loaded', 
      'collection:append',
      'products:appended',
      'ajaxContentReplaced',
      'filter:updated',
      'sort:changed',
      'loadmore:complete',
      'shopify:section:load' // Add Shopify section events
    ];

    events.forEach(eventName => {
      document.addEventListener(eventName, (e) => {
        const context = e.detail?.container || e.detail?.context || document;
        console.log(`Event triggered: ${eventName}`, e.detail);
        reinitSplides(context);
        
        // Special handling for infinite scroll events
        if (eventName === 'loadmore:complete' || eventName === 'products:appended') {
          handleInfiniteScrollComplete();
        }
      });
    });

    // Also listen for URL changes (for some filter systems)
    let currentUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(() => reinitSplides(document), 500);
      }
    }, 100);

    // Mutation Observer for dynamic content changes - ENHANCED
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          let shouldReinit = false;
          let hasNewProducts = false;
          
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              if (node.matches && (
                node.matches(CARD_SELECTOR) || 
                node.matches(COLLECTION_SLIDER_SELECTOR) ||
                node.querySelector(CARD_SELECTOR) ||
                node.querySelector(COLLECTION_SLIDER_SELECTOR)
              )) {
                shouldReinit = true;
              }
              
              // Check if new product items were added (infinite scroll)
              if (node.matches && (
                node.matches('.product-item') ||
                node.matches('.product-card') ||
                node.querySelector('.product-item') ||
                node.querySelector('.product-card')
              )) {
                hasNewProducts = true;
              }
            }
          });

          if (shouldReinit) {
            reinitSplides(document);
          }
          
          // If new products were added via infinite scroll
          if (hasNewProducts) {
            console.log('New products detected via mutation observer');
            setTimeout(() => {
              handleInfiniteScrollComplete();
            }, 300);
          }
        }
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  /* ----------------------------------------------
   * QUICKVIEW, SIZECHART & CART HANDLERS - DEBUG VERSION
   * ---------------------------------------------- */
  
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
    const priceEl = radio.closest('.ew-quickview').querySelector('.ew-price-current');
    const compareEl = radio.closest('.ew-quickview').querySelector('.ew-price-compare');
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

  // Event delegation for quickview
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
    if (radio) {
      radio.closest('.ew-size-options')?.querySelectorAll('.ew-size-option').forEach(l => l.classList.remove('checked'));
      radio.closest('.ew-size-option')?.classList.add('checked');
      updatePriceDisplayFromRadio(radio);
    }
  });

  document.addEventListener('click', async function (e) {
    const cartBtn = e.target.closest('.ew-add-to-cart');
    if (cartBtn) {
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
    }
  });

  // DEBUG: Enhanced Size Chart handler with logging
  document.addEventListener('click', function (e) {
    const sizeChartBtn = e.target.closest('.ew-open-sizechart');
    if (sizeChartBtn) {
      e.preventDefault();
      console.log('Size chart button clicked!');
      
      // Method 1: Try to find popup in quickview
      const quickview = sizeChartBtn.closest('.ew-quickview');
      if (quickview) {
        console.log('Found quickview container');
        const popupInQuickview = quickview.querySelector('.ew-sizechart-popup');
        console.log('Popup in quickview:', popupInQuickview);
        if (popupInQuickview) {
          popupInQuickview.classList.add('active');
          console.log('Opened size chart from quickview');
          return;
        }
      }
      
      // Method 2: Try to find popup in product-item
      const productItem = sizeChartBtn.closest('.product-item');
      if (productItem) {
        console.log('Found product-item container');
        const popupInProduct = productItem.querySelector('.ew-sizechart-popup');
        console.log('Popup in product-item:', popupInProduct);
        if (popupInProduct) {
          popupInProduct.classList.add('active');
          console.log('Opened size chart from product-item');
          return;
        }
      }
      
      // Method 3: Try to find popup in card-product
      const cardProduct = sizeChartBtn.closest('.card-product');
      if (cardProduct) {
        console.log('Found card-product container');
        const popupInCard = cardProduct.querySelector('.ew-sizechart-popup');
        console.log('Popup in card-product:', popupInCard);
        if (popupInCard) {
          popupInCard.classList.add('active');
          console.log('Opened size chart from card-product');
          return;
        }
      }
      
      // Method 4: Try global search as fallback
      console.log('Trying global search for size chart popup...');
      const allPopups = document.querySelectorAll('.ew-sizechart-popup');
      console.log('Total size chart popups found:', allPopups.length);
      
      if (allPopups.length > 0) {
        // Try to find the one that matches the current product
        const productItem = sizeChartBtn.closest('.product-item');
        if (productItem) {
          const productId = productItem.dataset.productId;
          console.log('Current product ID:', productId);
          
          // Look for popup with matching data attributes or similar context
          allPopups.forEach((popup, index) => {
            console.log(`Popup ${index}:`, popup);
            // Just open the first one for now
            if (index === 0) {
              popup.classList.add('active');
              console.log('Opened first available size chart popup');
            }
          });
        }
      } else {
        console.error('No size chart popups found anywhere in the document!');
      }
    }
  });

  // Close size chart
  document.addEventListener('click', function (e) {
    if (e.target.matches('.ew-sizechart-close, .ew-sizechart-popup__overlay')) {
      const popup = e.target.closest('.ew-sizechart-popup');
      if (popup) {
        popup.classList.remove('active');
        console.log('Closed size chart popup');
      }
    }
  });

  // Close modals with Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      // Close quickview modals
      document.querySelectorAll('.ew-quickview.active').forEach(modal => {
        modal.classList.remove('active');
      });
      // Close sizechart modals
      document.querySelectorAll('.ew-sizechart-popup.active').forEach(modal => {
        modal.classList.remove('active');
      });
    }
  });

  /* ----------------------------------------------
   * INITIALIZATION
   * ---------------------------------------------- */
  
  function initialize() {
    // Wait a bit for DOM to be fully ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          initSplidesLazy(document);
          setupCollectionListeners();
          setupAutoInfiniteScroll(); // Initialize infinite scroll
          setupFilterButton(); // Initialize filter button
          setupProductSizeChartButtons(); // Initialize product size chart buttons
        }, 100);
      });
    } else {
      setTimeout(() => {
        initSplidesLazy(document);
        setupCollectionListeners();
        setupAutoInfiniteScroll(); // Initialize infinite scroll
        setupFilterButton(); // Initialize filter button
        setupProductSizeChartButtons(); // Initialize product size chart buttons
      }, 100);
    }
  }

  // Initialize on load and after AJAX updates for infinite scroll
  document.addEventListener('DOMContentLoaded', setupAutoInfiniteScroll);
  document.addEventListener('collection:loaded', setupAutoInfiniteScroll);
  document.addEventListener('ajaxContentReplaced', setupAutoInfiniteScroll);
  document.addEventListener('products:appended', setupAutoInfiniteScroll);
  document.addEventListener('loadmore:complete', setupAutoInfiniteScroll);

  // Start everything
  initialize();

})();