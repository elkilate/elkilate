import { createCustomElement, printModal, zoomImages } from './Helpers.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (location.hash.includes('#searchBar'))
    document.querySelector('.search-bar-form__button').click();

  // State values
  let filters = {};
  let modelList = [];
  let idsPrinted = [];
  let nextPage = 1;
  let selectedType = localStorage.getItem('type') || null;
  // If there's no selected type delete any type previously selected
  if (!selectedType || selectedType === 'undefined') {
    delete filters['type'];
  } else {
    // else assign the type property of filters to be the selected type
    filters['type'] = selectedType;
    //localStorage.removeItem('type'); // Remove any previously saved type
  }
  // DOM Elements
  const modelWrapper = document.getElementById('p_wrapper');
  const top = document.querySelector('#top');
  const footer = document.querySelector('footer');
  const noMoreTag = document.querySelector('.nomore');
  const navLinks = document.querySelectorAll('.navLink');

  /* Navigation */
  navLinks.forEach(link => {
    // Attach click listener to each link
    link.addEventListener('click', e => {
      e.preventDefault();

      let type = link.dataset['type'];

      localStorage.setItem('type', type);

      window.location.replace('/joyeria');
    });
  });

  /* -- END Navigation -- */

  /* Intersection Observer */
  const onIntersect = async function (ents, obvs) {
    const ftElemt = ents.find(e => e.target === footer);
    const topElemt = ents.find(e => e.target === top);

    if (ftElemt && ftElemt.isIntersecting) {
      try {
        await fetchProducts();
        printModels();
      } catch (err) {
        console.log(err);
        alert(`Hubo un error al recuperar los productos.`);
      }
    }

    if (topElemt && !topElemt.isIntersecting) {
      document.querySelector('.return-btn').classList.add('visible');
    } else if (topElemt) {
      document.querySelector('.return-btn').classList.remove('visible');
    }
  };

  const observer = new IntersectionObserver(onIntersect, {
    root: null,
    threshold: 0.35,
  });

  /* -- END Intersection Observer -- */

  /* Category picker */
  const choices = document.querySelectorAll('.stSelector__choice');
  const typeChoices = document.querySelectorAll('.stType__option');
  const savedCtg = getCookie('ctg');

  const categoryPickHandler = async e => {
    const choice = typeof e !== 'string' ? e.target : e;
    modelWrapper.innerHTML = '';
    noMoreTag.classList.remove('show');
    nextPage = 1;
    idsPrinted = [];

    filters['ctg'] =
      typeof e === 'string'
        ? e
        : choice.dataset['ctg'] || choice.parentElement.dataset['ctg'];

    await fetchProducts();

    printModels();

    document.querySelector('.stSelector').classList.remove('show');

    observer.observe(footer);
    observer.observe(top);

    switch (filters['ctg']) {
      case 'silver':
        filters['karat'] = '';
        document
          .querySelector('[data-karat-filter-container]')
          .classList.add('hidden');
        document.getElementById('nav-silver').classList.remove('hidden');
        document.getElementById('nav-gold').classList.add('hidden');
        document.querySelector('.stType__option--s').classList.add('selected');
        document
          .querySelector('.stType__option--g')
          .classList.remove('selected');
        document.cookie = 'ctg=silver;same-site=secure';
        break;
      case 'gold':
        document
          .querySelector('[data-karat-filter-container]')
          .classList.remove('hidden');
        document.getElementById('nav-gold').classList.remove('hidden');
        document.getElementById('nav-silver').classList.add('hidden');
        document.querySelector('.stType__option--g').classList.add('selected');
        document
          .querySelector('.stType__option--s')
          .classList.remove('selected');
        document.cookie = 'ctg=gold;same-site=secure';
        break;
    }
  };

  if (savedCtg) categoryPickHandler(savedCtg);

  choices.forEach(choice => {
    choice.addEventListener('click', categoryPickHandler);
  });

  typeChoices.forEach(choice => {
    choice.addEventListener('click', categoryPickHandler);
  });

  /* -- END Category picker -- */

  /* Karat Filters */
  const karatOptions = document.querySelectorAll('[data-karat-opt]');

  karatOptions.forEach(opt => {
    opt.addEventListener('click', async e => {
      const karat = opt.dataset.karatOpt;
      idsPrinted = [];
      modelWrapper.textContent = '';

      karatOptions.forEach(o => o.classList.remove('active'));

      opt.classList.add('active');
      filters['karat'] = karat;
      await fetchProducts();
      printModels();
    });
  });

  /* -- END Karat Filters */

  /* Back to top */
  const returnBtn = document.querySelector('.return-btn');

  returnBtn.addEventListener('click', () => {
    top.scrollIntoView({ block: 'start' });
  });
  /* -- END Back to top -- */

  /* Functions */
  function attachClickListeners() {
    const atcBttns = document.querySelectorAll('.addToCart');

    return atcBttns.forEach(btn => {
      btn.onclick = handleAddToCartClick;
    });
  }

  async function fetchProducts() {
    const fetchResult = await (
      await fetch(`/api/products?${generateFetchQueryParams()}`)
    ).json();

    switch (fetchResult.statusTxt) {
      case 'OK':
        return fetchResult.models?.forEach(m => modelList.push(m));
      case 'NORESULT':
        noMoreTag.classList.add('show');
        return fetchResult.models?.forEach(m => modelList.push(m));
      default:
        return handleFetchError(fetchResult);
    }
  }

  function printModels(ml = modelList) {
    ml.forEach(m => {
      if (idsPrinted.indexOf(m._id) >= 0) return;

      if (filters.type && filters.type.length > 0) {
        if (
          m.type !== filters.type &&
          m.type !== filters.type + '14' &&
          m.type !== filters.type + '18'
        )
          return;
      }

      if (
        filters['ctg'] &&
        filters['ctg'].length > 0 &&
        m.category !== filters['ctg']
      ) {
        return;
      }

      if (
        filters['ctg'] !== 'silver' &&
        filters['karat'] &&
        filters['karat'].length > 0 &&
        m.karat.toLowerCase() !== filters['karat'].toLowerCase()
      ) {
        return;
      }

      idsPrinted.push(m._id);

      modelWrapper.insertAdjacentHTML('beforeend', generateModelHTML(m));
    });
    attachClickListeners();

    zoomImages();
  }

  function generateModelHTML(model) {
    let atcBtn = createCustomElement(
      'button',
      {
        class: ['btnf', 'addToCart'],
        'data-product-id': model.firstProduct?._id,
        'data-product-code': model.firstProduct?.itemCode,
        type: 'button',
      },
      [
        'Agregar al carrito',
        `<svg data-product-id="${model.firstProduct?._id}"><use href="/img/sprite.svg#shopping-cart" data-product-id="${model.firstProduct?._id}"></use></svg>`,
      ]
    );

    let html = `<li class="gallery__item prod">
      <div class="featured item">
        <a class="featured__img-link" href="/articulo/${model._id}">
          <img src="${model.thumbImg || ''}" alt="${
      model.thumbImg || ''
    }" class="featured__img">
        </a>
        <div class="featured__btn">
        ${atcBtn.outerHTML}
        </div>
        <h3 class="featured__name"><a class="d-link" href="/articulo/${
          model._id
        }">${model.name}</a></h3>
        <div class="featured__price">
        <svg>
            <use href="/img/sprite.svg#credit"></use>
        </svg>
        <h4 class="featured__price-h4">${
          model.isUnique
            ? priceToString(model.firstProduct?.price)
            : setPriceKarat(model.karat, model.firstProduct?.weight)
        } MXN</h4>
        </div>
      </div>
    </li>`;

    return html;
  }

  function generateFetchQueryParams() {
    let newQuery = new URLSearchParams();

    if (filters['type']) newQuery.set('type', filters['type']);

    if (filters['ctg']) newQuery.set('ctg', filters['ctg']);

    if (filters['karat']) newQuery.set('karat', filters['karat']);

    newQuery.set('p', nextPage);

    nextPage++;

    return newQuery;
  }

  function handleFetchError(response) {
    response.err && console.log(response.err);
    (response.msg || response.message) &&
      alert(response.msg || response.message);
  }

  async function handleAddToCartClick(e) {
    const reqBody = {
      id: this.dataset['productId'],
      code: this.dataset['productCode'],
    };

    const response = await (
      await fetch('/api/add-to-cart', {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(reqBody),
      })
    ).json();

    switch (response.statusTxt) {
      case 'OK':
      case 'CART_UPDATED':
        let props = {
          item: response.item,
          msg: 'El articulo se agrego al carrito.',
          title: 'Carrito',
          count: response.count,
          modalType: 'CART_ACTION',
          goto: '/carrito',
        };

        printModal(props);
      default:
        handleFetchError(response);
    }
  }

  /**
   * Turns a Number into a stylized price string
   *
   * @param {Number} price - The number to convert into a price String
   *
   * @returns {String} The converted price
   *
   * @example priceToString(3000) returns 3,000.00
   */
  function priceToString(price) {
    if (!price) return `0.00`;
    let [priceInts, priceDecs] = price?.toFixed(2).split('.');

    return `${(+priceInts).toLocaleString()}.${priceDecs}`;
  }

  /**
   * Calculates the price of a product based on its karat and weight.
   * If the product, is not a gold product it uses the default rate for silver products.
   *
   * @param {'10K' | '14K' | '18K' | undefined} karat - Karat of the product
   * @param {Number} wg - The weight in grams of the product
   *
   * @returns {String} Parsed price
   * @example Output - 4,321.98
   */
  function setPriceKarat(karat, wg) {
    let rate = 0;

    switch (filters['ctg']) {
      case 'gold':
        rate = modelWrapper.dataset['gold'].split('%%%');
        break;
      case 'silver':
        rate = modelWrapper.dataset['silver'];
        break;
    }

    switch (karat) {
      case '10K':
        rate = +rate[0];
        break;
      case '14K':
        rate = +rate[1];
        break;
      case '18K':
        rate = +rate[2];
        break;
    }

    const basePrice = (rate * +wg).toFixed(2);
    let [priceInt, priceDec] = basePrice.split('.');
    return `${(+priceInt).toLocaleString()}.${priceDec}`;
  }
});
