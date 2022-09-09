import { printModal } from './Helpers.js';

/* Navigation Functionality */
const navLinks = document.querySelectorAll('.navLink');

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();

    let type = link.dataset['type'];

    localStorage.setItem('type', type);

    window.location.pathname = '/joyeria';
  });
});

const stickyDropdownToggle = document.querySelector('[data-stickydrop-toggle');
const stickyDropList = document.querySelector('[data-stickydrop-list]');

stickyDropdownToggle.addEventListener('click', e => {
  e.preventDefault();

  stickyDropList.classList.toggle('active');
});

/* Testimonial Slider */
/* const testimonials = document.querySelectorAll('.testimonial__group');
const tsCount = testimonials.length;
const ctPrev = document.getElementById('tsControl-p');
const ctNext = document.getElementById('tsControl-n');

let nxTestimonial = 1;
let crTestimonial = 0;
let prTestimonial = tsCount - 1;

testimonials[crTestimonial].classList.add('active');

ctPrev.addEventListener('click', e => {
	testimonials[crTestimonial].classList.remove('active');
	testimonials[prTestimonial].classList.add('active');

	nxTestimonial = crTestimonial;
	crTestimonial = prTestimonial;
	prTestimonial = prTestimonial - 1 === -1 ? tsCount - 1 : prTestimonial - 1;
});

ctNext.addEventListener('click', e => {
	testimonials[crTestimonial].classList.remove('active');
	testimonials[nxTestimonial].classList.add('active');

	prTestimonial = crTestimonial;
	crTestimonial = nxTestimonial;
	nxTestimonial = nxTestimonial + 1 === tsCount ? 0 : nxTestimonial + 1;
}); */

/* Add to Cart */
const addToCartBtns = document.querySelectorAll('.addToCart');

addToCartBtns.forEach(btn => {
  btn.addEventListener('click', async e => {
    if (!getCookie('device')) {
      let device = uuidv4();
      let expDate = Date.now() + 60000 * 60 * 24 * 7;

      document.cookie = `device=${device};domain=;path=/;SameSite=lax;Expires=${expDate}`;
      alert(document.cookie);
    }

    const id = btn.dataset['productId'];
    const code = btn.dataset['code'];

    let res = await (
      await fetch('/api/add-to-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, code }),
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
      return alert(
        `No se ha podido agregar el producto al carrito.\n${res.msg}`
      );
    }
  });
});
