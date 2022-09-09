import { createCustomElement } from './Helpers.js';
document.addEventListener('DOMContentLoaded', async () => {
  window.toSkip = 5;
  window.lim = 5;
  window.productsSelected = [];

  /* Product display functionality */
  // Add click event listener to select buttons
  const slProductBtns = document.querySelectorAll('.product__select');
  slProductBtns.forEach(btn => btn.addEventListener('click', handleSelectProductClick));
  // Load more products
  const btnLoadMoreProds = document.getElementById('loadMore');

  btnLoadMoreProds.addEventListener('click', async () => {
    const productListContainer = document.getElementById('productListContainer');

    try {
      const { status, products } = await fetchProducts(lim, toSkip);

      if (status === 'DBERR') return alert('Ha ocurrido un error en el servidor.\nContacte al desarrollador para recibir ayuda.');
      if (status === 'NOPROP') {
        document.getElementById('nomoreTag').classList.add('show')
        return btnLoadMoreProds.disabled = true;
      }

      toSkip += lim;
      for (let prod of products) {
        const prodElement = createProductElement(prod);

        productListContainer.appendChild(prodElement);
      }
    } catch (err) {

    }
  });

  async function fetchProducts(lim, skip) {
    try {
      const svRes = await (await fetch(`/api/fetchProducts?toSkip=${skip}&limit=${lim}`, {
        method: 'GET',
        mode: 'same-origin'
      })).json();

      return svRes;
    } catch (err) {
      console.log(err);
      return alert('Ha ocurrido un error intentando conectarse al servidor.\nAsegurese de estar conectado a internet.');
    }
  }

  function createProductElement(prod) {
    const titleEl = createCustomElement('a', { class: ['product__title'], href: `/admin/product/${prod._id}` }, [prod.title]);
    const modelEl = createCustomElement('p', { class: ['product__model'] }, [prod.itemCode || 'TEST001-001']);
    const thumbEl = createCustomElement('img', { class: ['product__thumb'], src: prod.thumbImg, alt: prod.title });
    const optsEl = createCustomElement('ul', { class: ['product__actions'] }, [
      `<li class="action"><a href="/admin/product/edit/${prod._id}">Editar</a></li>`,
      `<li class="action"><a href="/admin/product/delete/${prod._id}">Eliminar</a></li>`,
    ]);
    const slLabelEl = createCustomElement('label', {
      for: `select-${prod.itemCode || 'TEST001-001'}`,
      class: ['btn', 'btn-primary', 'product__select']
    }, [
      'Seleccionar',
      `<input type="checkbox" id="select-${prod.itemCode || 'TEST001-001'}" class="selectProduct" />`
    ]);

    const containerEl = createCustomElement('div', { class: ['product__box'] }, [
      titleEl,
      modelEl,
      thumbEl,
      optsEl,
      slLabelEl
    ]);

    slLabelEl.addEventListener('click', handleSelectProductClick);

    return containerEl;
  }

  function handleSelectProductClick(e) {
    if (e.target === this) return;
    const prodId = e.target.id.split('-')[1];

    if (e.target.checked) {
      productsSelected.push(prodId);
    } else {
      productsSelected = productsSelected.filter(prodCode => prodCode !== prodId);
    }
  }
});
