const quickviewButtons = document.querySelectorAll('.ew-quickview-button');

if (quickviewButtons.length > 0) {
  quickviewButtons.forEach(button => {
    button.addEventListener('click', function () {
      // Close all open quickviews first
      document.querySelectorAll('.ew-quickview.active').forEach(modal => {
        modal.classList.remove('active');
      });

      // Find the quickview in the clicked card and open it
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
  filterButton.addEventListener('click', function() {
    const sidebar = document.querySelector('.halo-collection-content');
    if (sidebar) {
      sidebar.classList.toggle('ew-sidebar-filter');

      // Change button text depending on whether the sidebar is active
      if (sidebar.classList.contains('ew-sidebar-filter')) {
        filterButton.textContent = 'Filters';
      } else {
        filterButton.textContent = 'Hide Filters';
      }
    }
  });
}