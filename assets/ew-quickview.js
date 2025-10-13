document.addEventListener('DOMContentLoaded', function () {
  var $body = $('body');

  // helper: add item to cart via Shopify-style endpoint
  function addToCart(variantId, quantity = 1) {
    return $.ajax({
      type: 'POST',
      url: window.routes.root + '/cart/add.js',
      dataType: 'json',
      data: {
        id: variantId,
        quantity: quantity
      }
    });
  }

  // update the sidebar cart using your supplied logic (refactored into function)
  function updateSidebarCart(cart) {
    if (!$.isEmptyObject(cart)) {
      const $cartDropdown = $('#halo-cart-sidebar .halo-sidebar-wrapper .previewCart-wrapper');
      const $cartLoading = '<div class="loading-overlay loading-overlay--custom">\
              <div class="loading-overlay__spinner">\
                  <svg aria-hidden="true" focusable="false" role="presentation" class="spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">\
                      <circle class="path" fill="none" stroke-width="6" cx="33" cy="33" r="30"></circle>\
                  </svg>\
              </div>\
          </div>';
      const loadingClass = 'is-loading';

      $cartDropdown
        .addClass(loadingClass)
        .prepend($cartLoading);

      $.ajax({
        type: 'GET',
        url: window.routes.root + '/cart?view=ajax_side_cart',
        cache: false,
        success: function (data) {
          var response = $(data);

          $cartDropdown
            .removeClass(loadingClass)
            .html(response);

          if (typeof halo !== 'undefined' && halo.dispatchChangeForShippingMessage) {
            halo.dispatchChangeForShippingMessage();
          }
        },
        error: function (xhr, text) {
          try {
            var json = JSON.parse(xhr.responseText);
            if (json && json.description && typeof halo !== 'undefined' && halo.showWarning) {
              halo.showWarning(json.description);
            }
          } catch (e) {
            console.error('Error updating sidebar cart:', e);
          }
        },
        complete: function () {
          // update cart counts / UI text
          $body.find('[data-cart-count]').text(cart.item_count);
          if (cart.item_count >= 100) {
            $body.find('.cart-count-bubble [data-cart-count]').text(window.cartStrings && window.cartStrings.item_99 ? window.cartStrings.item_99 : '99+');
          }
          if (cart.item_count === 1) {
            $body.find('[data-cart-text]').text(window.cartStrings && window.cartStrings.item ? window.cartStrings.item : 'item');
          } else {
            $body.find('[data-cart-text]').text(window.cartStrings && window.cartStrings.items ? window.cartStrings.items : 'items');
          }

          if (typeof halo !== 'undefined') {
            if (halo.productCollectionCartSlider) halo.productCollectionCartSlider();
            if (halo.updateGiftWrapper) halo.updateGiftWrapper();
            if (halo.checkNeedToConvertCurrency && halo.checkNeedToConvertCurrency()) {
              if (window.shop_currency && $('#currencies .active').attr('data-currency') && typeof Currency !== 'undefined') {
                Currency.convertAll(window.shop_currency, $('#currencies .active').attr('data-currency'), 'span.money', 'money_format');
              }
            }
          }

          // re-dispatch cart update event
          document.dispatchEvent(new CustomEvent('cart-update', { detail: cart }));

          if ($('body').hasClass('cursor-fixed__show') && window.sharedFunctionsAnimation) {
            if (window.sharedFunctionsAnimation.onEnterButton) window.sharedFunctionsAnimation.onEnterButton();
            if (window.sharedFunctionsAnimation.onLeaveButton) window.sharedFunctionsAnimation.onLeaveButton();
          }
        }
      });
    }
  }

  // Attach quickview button handlers
  const quickviewButtons = document.querySelectorAll('.ew-quickview-button');
  if (quickviewButtons.length > 0) {
    quickviewButtons.forEach(button => {
      button.addEventListener('click', function () {
        // close other quickviews
        document.querySelectorAll('.ew-quickview.active').forEach(modal => modal.classList.remove('active'));

        const card = button.closest('.product-item');
        if (!card) return;
        const quickviewModal = card.querySelector('.ew-quickview');
        if (quickviewModal) {
          quickviewModal.classList.add('active');
        }

        // find buttons inside this card
        const cart_button = card.querySelector('.ew-add-to-cart');
        const buy_now_button = card.querySelector('.ew-buy-now');

        // ensure we don't attach duplicate listeners: remove any existing data flag first
        if (cart_button) {
          // Remove previous handler if present by using a namespaced jQuery handler (if using jQuery)
          // but since cart_button is a DOM node, use jQuery to safely rebind.
          $(cart_button).off('click.ewQuickviewAddToCart');
          $(cart_button).on('click.ewQuickviewAddToCart', function (e) {
            e.preventDefault();

            const checked_input = card.querySelector('.ew-size-option.checked input');
            if (!checked_input) {
              // if you have a UX layer to show "Please select size", call it here
              if (typeof halo !== 'undefined' && halo.showWarning) {
                halo.showWarning('Please select a size.');
              } else {
                alert('Please select a size.');
              }
              return;
            }

            const selected_variant_id = checked_input.dataset.variantId || checked_input.getAttribute('data-variant-id') || checked_input.value;
            if (!selected_variant_id) {
              console.error('Variant id not found on selected input:', checked_input);
              if (typeof halo !== 'undefined' && halo.showWarning) {
                halo.showWarning('Variant not found.');
              }
              return;
            }

            // optional: show loading state on button
            $(cart_button).prop('disabled', true).addClass('is-loading');

            // Call addToCart -> then updateSidebarCart on success
            addToCart(selected_variant_id, 1)
              .done(function (cartResponse) {
                $.ajax({
                  type: 'GET',
                  url: window.routes.root + '/cart.js',
                  dataType: 'json',
                  success: function (cart) {
                    const updateCart = updateSidebarCart(cart);
                    console.log()
                    if (typeof halo !== 'undefined' && halo.showSuccess) {
                      halo.showSuccess('Added to cart');
                      $(cart_button).prop('disabled', false).removeClass('is-loading');
                    }
                  },
                  error: function (err) {
                    console.error('Failed to fetch cart after add:', err);
                  }
                });
              })
              .fail(function (xhr) {
                // handle error from add.js
                var message = 'Could not add to cart.';
                try {
                  var json = JSON.parse(xhr.responseText);
                  if (json && json.description) message = json.description;
                } catch (e) { /* ignore parse error */ }

                if (typeof halo !== 'undefined' && halo.showWarning) {
                  halo.showWarning(message);
                } else {
                  alert(message);
                }
              })
              .always(function () {
                $(cart_button).prop('disabled', false).removeClass('is-loading');
                document.body.classList.add('cart-sidebar-show')
              });
          });
        }

        // buy_now_button optionally: add handler to add + open checkout
        if (buy_now_button) {
          $(buy_now_button).off('click.ewQuickviewBuyNow');
          $(buy_now_button).on('click.ewQuickviewBuyNow', function (e) {
            e.preventDefault();

            const checked_input = card.querySelector('.ew-size-option.checked input');
            if (!checked_input) {
              if (typeof halo !== 'undefined' && halo.showWarning) {
                halo.showWarning('Please select a size.');
              } else {
                alert('Please select a size.');
              }
              return;
            }

            const selected_variant_id = checked_input.dataset.variantId || checked_input.getAttribute('data-variant-id') || checked_input.value;
            if (!selected_variant_id) {
              if (typeof halo !== 'undefined' && halo.showWarning) halo.showWarning('Variant not found.');
              return;
            }

            $(buy_now_button).prop('disabled', true).addClass('is-loading');

            // Add to cart then redirect to checkout
            addToCart(selected_variant_id, 1)
              .done(function () {
                // redirect to checkout (Shopify standard)
                window.location.href = window.routes.root + '/checkout';
              })
              .fail(function (xhr) {
                var message = 'Could not add to cart.';
                try {
                  var json = JSON.parse(xhr.responseText);
                  if (json && json.description) message = json.description;
                } catch (e) { /* ignore parse error */ }
                if (typeof halo !== 'undefined' && halo.showWarning) halo.showWarning(message);
              })
              .always(function () {
                $(buy_now_button).prop('disabled', false).removeClass('is-loading');
              });
          });
        }

      });
    });
  }

  // Handle variant size selection
  document.querySelectorAll('.ew-size-option input[type="radio"]').forEach(function (radio) {
    radio.addEventListener('change', (e) => {
      const all = radio.closest('.ew-size-options').querySelectorAll('.ew-size-option');
      all.forEach(lbl => lbl.classList.remove('checked'));
      radio.closest('.ew-size-option').classList.add('checked');
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