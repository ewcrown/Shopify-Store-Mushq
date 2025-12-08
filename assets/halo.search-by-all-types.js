Shopify.SearchByAllTypes = (function() {
    var config = {
        sectionId: 'main-search',
        onComplete: null
    };

    return {
        renderResultTable: function(params) {
            var params = params || {};
            $.extend(config, params);

            this.section = document.getElementById(config.sectionId);
            if (!this.section) return;

            this.url = this.section.getAttribute('data-url');
            this.id = this.section.getAttribute('data-id');

            fetch(this.url)
                .then(r => r.text())
                .then(html => {
                    const parsed = new DOMParser().parseFromString(html, 'text/html');

                    const resultTemplate = parsed
                        .querySelector(`div[id="${config.sectionId}"]`)
                        ?.querySelector('template')
                        ?.content.firstElementChild;

                    if (!resultTemplate || !resultTemplate.innerHTML.trim().length) {
                        this.section.remove();
                        return;
                    }

                    // Render results into section
                    this.section.innerHTML = resultTemplate.innerHTML;

                    // PRODUCT SHOW MORE LOGIC
                    const collectionProduct = document.querySelector('.collection');
                    if (collectionProduct) {
                        const products = collectionProduct.querySelectorAll('.product');
                        if (products.length > 0) {
                            collectionProduct.classList.add('productShowMore');
                        } else {
                            collectionProduct.classList.remove('productShowMore');
                        }
                    }

                    // LOAD MORE ARTICLES / PAGES LOGIC
                    const loadMoreBtn = document.getElementById('article-page-load-btn');
                    if (!loadMoreBtn) return;

                    const perLoad = parseInt(loadMoreBtn.dataset.itemsPerPage);
                    const total = parseInt(loadMoreBtn.dataset.total);
                    const totalPages = Math.ceil(total / perLoad);

                    if (total <= perLoad) {
                        loadMoreBtn.style.display = 'none';
                        return;
                    }

                    if (totalPages <= 1) {
                        loadMoreBtn.classList.add('disabled');
                    }

                    let currentPage = 1;
                    const items = [...document.querySelectorAll('[data-listed-article-or-page]')];

                    // SHOW FIRST PAGE
                    items.forEach((el, i) => el.classList.toggle('visible', i < perLoad));

                    // LOAD MORE CLICK
                    loadMoreBtn.addEventListener('click', () => {
                        if (currentPage >= totalPages) return;

                        currentPage++;
                        loadMoreBtn.classList.add('is-loading');

                        const timeout = Math.random() * 500 + 500;

                        setTimeout(() => {
                            const limit = perLoad * currentPage;

                            // SHOW ONLY THE NEW ITEMS
                            items.forEach((el, i) => {
                                if (i < limit) {
                                    el.classList.add('visible');
                                }
                            });

                            // Hide button on last page
                            if (currentPage === totalPages) {
                                loadMoreBtn.style.display = 'none';
                            }

                            loadMoreBtn.classList.remove('is-loading');
                        }, timeout);
                    });

                })
                .catch(err => console.error(err));
        }
    }
})();
