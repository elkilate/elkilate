import { printModal } from './Helpers.js'

document.addEventListener('DOMContentLoaded', async e => {
  /* Add to cart buttons */
  const atcButtons = document.querySelectorAll('.scProduct__atc');
  atcButtons.forEach(btn => {
    btn.addEventListener('click', async function (e) {
      const productCode = this.dataset['product'];

      let res = await (await fetch('/api/add-to-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId: productCode })
      })).json();

      if (res.statusTxt === 'CART_UPDATED') {
        let props = {
          item: res.item,
          msg: 'El articulo se agrego al carrito.',
          title: 'Carrito',
          count: res.count,
          modalType: 'CART_ACTION',
          goto: '/carrito'
        }
        return printModal(props);
      } else {
        return alert(`No se ha podido agregar el producto al carrito.\n${res.msg}`);
      }
    });
  });

  /* Navigation functionality */
  const navLinks = document.querySelectorAll('.navLink');

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();

      let type = link.dataset['type'];

      localStorage.setItem('type', type);
      window.location.assign('/joyeria');
    })
  });
});
