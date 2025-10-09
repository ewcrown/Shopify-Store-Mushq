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
