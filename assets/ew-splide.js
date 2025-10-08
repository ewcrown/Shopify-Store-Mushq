const collectionSlider = document.querySelector('.splide.luis-collection-slider-splide');

if (collectionSlider) {
  new Splide(collectionSlider, {
    perPage: 2,
    rewind: true,
    gap: '7px',
    arrows: false,
    pagination: false,
    trimSpace: false, // allows partial slide visibility
    focus: 'left', // keeps slides aligned to the left so next one peeks
    padding: { right: '15%' }, // adjust how much of the next slide you want visible
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
        gap: '20px',
        padding: { right: '15%' },
      },
      480: {
        perPage: 1,
        gap: '10px',
        padding: { right: '20%' },
      },
    },
  }).mount();
}