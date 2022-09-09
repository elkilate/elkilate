import { printModal, zoomGalleryImage } from './Helpers.js';

/* Add To Cart Functionality */
let selectedProduct = document.getElementsByName('product')[0].value;
let selectedCode = document.getElementsByName('product')[0].id;

const addToCartForm = document.getElementById('addToCartForm');

addToCartForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  let res = await (
    await fetch('/api/add-to-cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: selectedProduct, code: selectedCode }),
    })
  ).json();

  if (res.statusTxt === 'CART_UPDATED') {
    let props = {
      item: res.item,
      msg: 'El articulo se agrego al carrito.',
      title: 'Carrito',
      count: res.count,
      modalType: 'CART_ACTION',
      goto: '/carrito',
    };
    printModal(props);
  } else {
    // console.log('nostock');
    return alert(`No se ha podido agregar el producto al carrito.\n${res.msg}`);
  }
});

/* Navigation Functionality */
const navLinks = document.querySelectorAll('.navLink');

navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();

    let type = link.dataset['type'];

    localStorage.setItem('type', type);

    window.location.replace('/joyeria');
  });
});

/* Product Selection */
const priceTag = document.getElementById('priceTag');
const weightTag = document.getElementById('wtTag');
const sizeTag = document.getElementById('szTag');
const mineralPrice = priceTag.dataset['mineralPrice'];

const productRadios = document.getElementsByName('product');

productRadios.forEach((radio) => {
  radio.addEventListener('input', function (e) {
    const weight = this.dataset['wt'];
    const size = this.dataset['sz'];
    const price = this.dataset['p'];

    weightTag.innerHTML = weight;
    sizeTag.innerHTML = size;

    let _p = price ? (+price).toFixed(2) : (mineralPrice * weight).toFixed(2);

    let [priceInt, priceDec] = _p.split('.');

    priceTag.innerHTML = `${(+priceInt).toLocaleString()}.${priceDec}`;
    selectedProduct = radio.value;
    selectedCode = radio.id;
  });
});

/* Detail product slider */
const ctNext = document.getElementById('slControl-n');
const ctPrev = document.getElementById('slControl-p');

const slContainer = document.querySelector('.slider__container');
const slSlideCount = slContainer.children.length;
const glContainer = document.querySelector('.slider__gallery');

let slSlides = [];
let glItems = [];

let nxSlide = 1;
let prSlide = slSlideCount - 1;
let crSlide = 0;

for (let i = 0; i < slSlideCount; i++) {
  slSlides.push(slContainer.children[i]);
  glItems.push(glContainer.children[i]);

  if (i == 0) {
    slSlides[i].classList.add('active');
  }
}

ctNext.addEventListener('click', (e) => {
  slSlides[crSlide].classList.remove('active');
  slSlides[nxSlide].classList.add('active');

  crSlide = nxSlide;
  nxSlide = nxSlide++ === slSlideCount - 1 ? 0 : nxSlide++;

  zoomGalleryImage(slSlides[crSlide]);
});

ctPrev.addEventListener('click', (e) => {
  slSlides[crSlide].classList.remove('active');
  slSlides[prSlide].classList.add('active');

  crSlide = prSlide;
  prSlide = prSlide-- === 0 ? slSlideCount - 1 : prSlide--;

  zoomGalleryImage(slSlides[crSlide]);
});

for (let item of glItems) {
  let pointsTo = Number(item.dataset.pointsTo);

  // console.log(pointsTo);
  item.addEventListener('click', (e) => {
    crSlide = pointsTo;
    prSlide = pointsTo - 1 === -1 ? slSlideCount - 1 : pointsTo - 1;
    nxSlide = pointsTo + 1 === slSlideCount ? 0 : pointsTo + 1;

    for (let slide of slSlides) {
      slide.classList.remove('active');
    }

    slSlides[crSlide].classList.add('active');
    zoomGalleryImage(slSlides[crSlide]);
  });
}

/* Image zoom on hover */
/* slSlides.forEach((slide) => {
  zoomGalleryImage(slide);
}); */
zoomGalleryImage(slSlides[0]);
