document.addEventListener('DOMContentLoaded', function () {
  const collectionSlider = document.querySelector('.splide.luis-collection-slider-splide');
  const galleryOther = document.querySelectorAll('.template-collection .card-media-splide')

  if (collectionSlider) {
    new Splide(collectionSlider, {
      perPage: 2,
      perMove: 1,
      rewind: true,
      gap: '7px',
      arrows: true,
      autoplay: true,
      speed: 200,
      pagination: false,
      trimSpace: false, // allows partial slide visibility
      focus: 'left', // keeps slides aligned to the left so next one peeks
      padding: { right: '5%' }, // adjust how much of the next slide you want visible
      breakpoints: {
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
  galleryOther?.forEach(function (splideEl) {
    let options = {
      type: 'loop',
      perPage: 1,
      perMove: 1,
      autoplay: true,
      arrows: true,
      pagination: false,
      gap: '0.5rem',
    };
    let sp = new Splide(splideEl, options);
    sp.mount();
  });
});