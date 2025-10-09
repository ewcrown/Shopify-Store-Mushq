document.addEventListener('DOMContentLoaded', function () {
  const collectionSlider = document.querySelector('.splide.luis-collection-slider-splide');

  if (collectionSlider) {
    new Splide(collectionSlider, {
      perPage: 2,
      perMove: 1,
      rewind: true,
      gap: '7px',
      arrows: true,
      pagination: false,
      trimSpace: false, // allows partial slide visibility
      focus: 'left', // keeps slides aligned to the left so next one peeks
      padding: { right: '40%' }, // adjust how much of the next slide you want visible
      breakpoints: {
        1300: {
          perPage: 2,
          padding: { right: '12%' },
        },
        1024: {
          perPage: 3,
          padding: { right: '10%' },
        },
        700: {
          perPage: 2,
          gap: '10px',
          padding: { right: '0' },
        },
        480: {
          perPage: 1,
          gap: '10px',
          padding: { right: '0' },
        },
      },
    }).mount();
  }

  document.querySelectorAll('.card-media-splide').forEach(function (splideEl) {
    var options = {
      type: 'loop',
      perPage: 1,
      perMove: 1,
      autoplay: false,
      arrows: true,
      pagination: false,
      gap: '0.5rem',
    };
    var sp = new Splide(splideEl, options);
    sp.mount();
  });
});