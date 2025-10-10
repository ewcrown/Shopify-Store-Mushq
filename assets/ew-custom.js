const quickviewButtons = document.querySelectorAll('.ew-quickview-button');
if (quickviewButtons.length > 0) {
  quickviewButtons.forEach(button => {
    button.addEventListener('click', function () {
      document.querySelectorAll('.ew-quickview.active').forEach(modal => {
        modal.classList.remove('active');
      });
      const card = button.closest('.product-item');
      if (!card) return;
      const quickviewModal = card.querySelector('.ew-quickview');
      if (quickviewModal) {
        quickviewModal.classList.add('active');
      }
    });
  });
}

const filterButton = document.querySelector('.ew-filter-button');
if (filterButton) {
  filterButton.addEventListener('click', function () {
    const sidebar = document.querySelector('.halo-collection-content');
    if (sidebar) {
      sidebar.classList.toggle('ew-sidebar-filter');
      if (sidebar.classList.contains('ew-sidebar-filter')) {
        filterButton.textContent = 'Filters';
      } else {
        filterButton.textContent = 'Hide Filters';
      }
    }
  });
}

const pdp_size_chart = document.querySelector('.ew-open-pdp-sizechart')
if (pdp_size_chart) {
  pdp_size_chart.addEventListener('click', function () {
    const popup = document.querySelector('.ew-sizechart-popup');
    if (popup) popup.classList.add('active');
  });
}


(function(){
  function initCustom(context){
    context = context || document;

    // Quickview button
    context.querySelectorAll('.ew-quickview-button').forEach(button => {
      button.addEventListener('click', () => {
        context.querySelectorAll('.ew-quickview.active').forEach(modal => modal.classList.remove('active'));
        const card = button.closest('.product-item');
        card?.querySelector('.ew-quickview')?.classList.add('active');
      });
    });

    // Filter sidebar toggle
    context.querySelectorAll('.ew-filter-button').forEach(button => {
      button.addEventListener('click', () => {
        const sidebar = document.querySelector('.halo-collection-content');
        if (!sidebar) return;
        sidebar.classList.toggle('ew-sidebar-filter');
        button.textContent = sidebar.classList.contains('ew-sidebar-filter') ? 'Filters' : 'Hide Filters';
      });
    });

    // PDP size chart
    context.querySelectorAll('.ew-open-pdp-sizechart').forEach(btn => {
      btn.addEventListener('click', () => {
        const popup = document.querySelector('.ew-sizechart-popup');
        if (popup) popup.classList.add('active');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => initCustom(document));
  window.EWCustom = { init: initCustom };
})();