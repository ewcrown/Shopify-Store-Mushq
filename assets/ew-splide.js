const collectionSlider = document.querySelector('.splide.luis-collection-slider-splide')

if (collectionSlider) {
    new Splide(collectionSlider, {
        perPage: 2,
        rewind: true,
        gap: '7px',
        arrows: false,
        pagination: false,
        breakpoints: {
            1300: {
                perPage: 2,
            },
            1024: {
                perPage: 3,
            },
            700: {
                perPage: 2,
                gap: '20px'
            },
            480: {
                perPage: 1,
                gap: '10px'
            },
        }
    }).mount();
}