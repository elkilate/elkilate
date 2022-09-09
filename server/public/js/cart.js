import { printModal } from './Helpers.js';

/* Remove Item */
const removeBtns = document.querySelectorAll('.rmvBtn');

removeBtns.forEach((btn) => {
  btn.addEventListener('click', async (e) => {
    const itemId = btn.dataset['itemId'];
    const res = await (
      await fetch(`/api/remove-from-cart?itemId=${itemId}`, {
        method: 'DELETE',
      })
    ).json();

    if (res.status === 'OK') return window.location.assign('/carrito');
    else {
      console.log(res.err);
      return alert(
        'Ha ocurrido un error en el servidor.\nIntenta de nuevo mas tarde'
      );
    }
  });
});

const closeUpdated = document.getElementById('closeUpdated');

closeUpdated &&
  closeUpdated.addEventListener('click', function (e) {
    const parentElement = this.parentElement;

    parentElement.classList.add('closed');
    parentElement.addEventListener('transitionend', function (e) {
      this.remove();
    });
  });

/* Navigation Functionality */
const navLinks = document.querySelectorAll('.navLink');

navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();

    let type = link.dataset['type'];

    localStorage.setItem('type', type);
    window.location.assign('/joyeria');
  });
});
