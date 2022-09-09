const axios = require('axios').default;
const Mineral = require('../models/Mineral');
const Sale = require('../models/Sale');
const mDate = require('../models/Date');
const API_KEY =
  process.env.METALS_API_KEY ||
  'hp2qva2y1j5awze6ei7fs8c2g7h6hnvy5npo99tzc3r3usz2woxvd5i3c9wf';
const fs = require('fs');
const path = require('path');

const ctrl = {};

// Helpers
ctrl.isStore = (page) => {
  return page === 'store';
};

ctrl.calcSalePrice = (prod) => {
  return +(prod.price - prod.price * (prod.saleAmount * 0.01)).toFixed(2);
};

ctrl.updateMetalRates = async () => {
  let apiResponse;

  try {
    apiResponse = await (
      await axios.get(
        `https://metals-api.com/api/latest?access_key=${API_KEY}&base=MXN&symbols=XAU,XAG,USD`
      )
    ).data;
    if (!(await Mineral.countDocuments())) {
      for (let rate in apiResponse.rates) {
        let newRate = new Mineral({
          currencyCode: rate,
          rate: rate === 'USD' ? apiResponse.rates[rate] : null,
          ratePerOunce: rate !== 'USD' ? apiResponse.rates[rate] : null,
          ratePerGram: rate !== 'USD' ? apiResponse.rates[rate] / 28.35 : null,
          lastUpdated: apiResponse.date,
        });

        await newRate.save();
      }
      return;
    } else if (apiResponse.success) {
      for (let rate in apiResponse.rates) {
        await Mineral.updateOne(
          { currencyCode: rate },
          {
            rate: rate === 'USD' ? apiResponse.rates[rate] : null,
            ratePerOunce: rate !== 'USD' ? apiResponse.rates[rate] : null,
            ratePerGram:
              rate !== 'USD' ? apiResponse.rates[rate] / 28.35 : null,
            lastUpdated: apiResponse.date,
          }
        );
      }
    }
    // console.log(apiResponse);
    return apiResponse;
  } catch (e) {
    throw e;
  }
};

ctrl.updateCurrentWeek = async (week = null) => {
  let foundDate = await mDate.findOne({});

  if (!foundDate) foundDate = new mDate();

  if (week) {
    foundDate.currentWeek = week;
    return await foundDate.save();
  }

  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const weekStartDay = 1; // Monday
  const distance = weekStartDay - today.getDay();

  foundDate.currentWeek = today.setDate(today.getDate() + distance);
  return await foundDate.save();
};

ctrl.updateCurrentMonth = async (month = null) => {
  let foundDate = await mDate.findOne({});

  if (!foundDate) foundDate = new mDate();

  if (month) {
    foundDate.currentMonth = month;
    return await foundDate.save();
  }

  const today = new Date(new Date().setHours(0, 0, 0, 0));

  foundDate.currentMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  ).toISOString();
  return await foundDate.save();
};

ctrl.mineralNameSwitch = (name) => {
  switch (name) {
    case 'XAG':
      return 'Plata';
    case 'XPT':
      return 'Platino';
    case 'XPD':
      return 'Paladio';
    default:
      return 'No Mineral';
  }
};

ctrl.parseMineralLastUpdated = (date) => {
  if (!date) return 'No Date';
  const [year, month, day] = date.split('-');
  const newDate = new Date(+year, +month - 1, +day);

  return ctrl.dateToLocaleDateString(newDate);
};

ctrl.parsePrice = (price) => price.toLocaleString();

ctrl.priceToString = (price) => {
  const [priceInts, priceDecs] = (+price).toFixed(2).split('.');
  return `${(+priceInts).toLocaleString()}.${priceDecs}`;
};

ctrl.roundNumber = (n, d) => {
  return (+n).toFixed(d || 2);
};

ctrl.gte = (n1, n2) => {
  return n1 >= n2;
};

ctrl.genQtyOptions = (q) => {
  let html = '';
  for (let i = 0; i <= 10; i++) {
    switch (i) {
      case 0:
        html += `<option value="${i}">0 (Eliminar)</option>`;
        break;
      case q:
        html += `<option value="${i}" selected="true">${i}</option>`;
        break;
      case ctrl.gte(i, 10):
        html += `<option value="${i}">10+</option>`;
        break;
      default:
        html += `<option value="${i}">${i}</option>`;
    }
  }
  return html;
};

ctrl.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();

  req.flash('errMsg', 'No autenticado');
  return res.redirect('/iniciar-sesion');
};

ctrl.calcPriceWt = (price, wt, string = false) => {
  let netPrice = (price * wt).toFixed(2);

  if (string) {
    let [priceInt, priceDec] = netPrice.split('.');
    priceInt = (+priceInt).toLocaleString();

    return `${priceInt}.${priceDec}`;
  }

  return +netPrice;
};

ctrl.checkAvailability = (available) => {
  if (available) return 'Disponible';
  else return 'No disponible';
};

ctrl.parseCategory = (category) => {
  if (category === 'gold') return 'Oro';
  else return 'Plata';
};

ctrl.getCurrentDate = () => {
  let msTime = new Date(Date.now());

  return msTime.toLocaleDateString('es-MX', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

ctrl.dateToLocaleDateString = (date) => {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

ctrl.numberToLocaleDateString = (n) => {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(n));
};

ctrl.numberToNumericDateString = (n) => {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(n));
};

ctrl.parsePaymentMethod = (method) => {
  if (!method || typeof method !== 'string') return 'N/A';

  switch (method.toLowerCase()) {
    case 'paypal':
      return 'PayPal';
    case 'stripe':
      return 'Tarjeta Credito/Debito';
    default:
      return 'N/A';
  }
};

ctrl.getPaymentId = (method, doc) => {
  if (!method || typeof method !== 'string') return 'N/A';
  if (!doc) return 'N/A';

  switch (method.toLowerCase()) {
    case 'PayPal':
      return doc.payment.paypal.paymentId;
    case 'Tarjeta':
      return doc.payment.stripeId;
    default:
      return 'N/A';
  }
};

ctrl.getCategories = (items) => {
  let categories = [];

  for (let item of items) {
    if (categories.find((category) => category === item.category)) continue;
    categories.push(item.category);
  }

  categories = categories.map((category) => {
    if (category === 'gold') return 'Oro';
    if (category === 'silver') return 'Plata';
    return category;
  });

  return categories.reduce(function (acc, category, i) {
    if (i === 0) return category;
    if (i < this.length) return `, ${category}`;
    return acc;
  });
};

ctrl.getCategory = (category) => {
  if (!category || typeof category !== 'string') return 'N/A';

  switch (category.toLowerCase()) {
    case 'gold':
      return 'Oro';
    case 'silver':
      return 'Plata';
    default:
      return 'N/A';
  }
};

ctrl.getAppliedPrices = (prices) => {
  if (!prices || !prices.length) return 'N/A';

  let appliedPrices = '';

  appliedPrices = prices.reduce((acc, price, i) => {
    if (i + 1 === prices.length) {
      return acc + `$ ${price}`;
    }

    return acc + `$ ${price}, `;
  }, appliedPrices);

  return appliedPrices;
};

/* Stock page helpers */
ctrl.getAvailableWeight = (stock, de) => {
  let wg = 0;
  stock.forEach((model) => {
    wg = model.products.reduce((acc, product) => {
      if (!product.available) return acc;

      return acc + product.weight;
    }, wg);
  });

  return wg.toLocaleString();
};

ctrl.getTotalWeight = (stock) => {
  let wg = 0;

  // wg = stock.products.reduce((acc, product) => acc + product.weight, wg);
  stock.forEach((model) => {
    wg = model.products.reduce((acc, product) => acc + product.weight, wg);
  });

  return wg.toLocaleString();
};

ctrl.getWeekSoldWg = (currentWeek, sales, karat) => {
  if (!currentWeek || !sales) {
    console.log('Error: Missing arguments');
    return 'error';
  }
  let weekSales = sales.filter((sale) => sale.pat >= new Date(currentWeek));
  let wg = 0;

  weekSales.forEach((sale) => {
    wg = sale.order.items.reduce((acc, item) => {
      if (karat && item.karat === karat) {
        return acc + item.weight;
      } else if (karat && item.karat !== karat) {
        return acc;
      }

      return acc + item.weight;
    }, wg);
  });

  const [wgInts, wgDecs] = wg.toFixed(1).split('.');

  return `${+wgInts.toLocaleString()}.${wgDecs}`;
};

ctrl.getMonthSoldWg = (currentMonth, sales, karat) => {
  if (!currentMonth || !sales) {
    console.log('Error: Missing arguments');
    return 'error';
  }
  let monthSales = sales.filter((sale) => sale.pat >= new Date(currentMonth));
  let wg = 0;

  monthSales.forEach((sale) => {
    wg = sale.order.items.reduce((acc, item) => {
      if (karat && item.karat === karat) {
        return acc + item.weight;
      } else if (karat && item.karat !== karat) {
        return acc;
      }

      return acc + item.weight;
    }, wg);
  });

  const [wgInts, wgDecs] = wg.toFixed(1).split('.');

  return `${+wgInts.toLocaleString()}.${wgDecs}`;
};

ctrl.filterSalesByCategory = (sales, category) => {
  if (!sales || typeof sales !== 'object') {
    console.log('Error: Malformed arguments');
    return;
  }

  return sales.filter((sale) => sale.contents.categories.includes(category));
};

ctrl.getModelAvailableWeight = (model) => {
  // console.log(model)
  let wg = 0;

  wg = model.products.reduce((acc, product) => acc + product.weight, wg);

  return wg.toLocaleString();
};

/* Model & product handling */

ctrl.checkProductCount = function () {
  return this.products.length > 0;
};

ctrl.normalizeModels = normalizeModels;

/**
 * Maps a Model document array into a
 * front-end usable array of Models
 *
 * @param {MongooseDocument[]} models - The array of models to normalize
 * @param {Boolean=} addFirstProduct - If true, add a `firstProduct` field to each model in the return array,
 * each containing the first available product belonging to the corresponding model
 *
 * @returns {Object[]} An Array of objects containing models normalized
 */
function normalizeModels(models, addFirstProduct) {
  let normalizedModels;

  normalizedModels = models.map((model, i) => {
    const firstProduct = model.products.find(
      (product) => product.available === true
    );
    const availableProducts = model.products.filter((p) => p.available);

    let resultModel = {
      firstProduct: addFirstProduct ? firstProduct : undefined,
      isUnique: model.karat ? false : true,
      productCount: availableProducts.length,
      products: undefined,
    };

    if (model._doc) resultModel = { ...model._doc, ...resultModel };
    else resultModel = { ...model, ...resultModel };

    return resultModel;
  });

  return normalizedModels;
}

ctrl.normalizeCartItem = (item) => {
  return {
    sku: item.sku._id,
    skuRef: item.skuModel,
    title: item.title,
    code: item.code,
    size: item.itemSize || item.sku.size,
    weight: item.itemWeight,
    thumbImg: item.thumbImg,
    price: item.itemPrice,
    ctg:
      item.sku.parentModel.category === 'gold'
        ? 'Joyeria de Oro'
        : 'Joyeria de Plata',
    karat: item.sku.karat ? item.sku.karat : item.sku.parentModel.karat,
  };
};

ctrl.saleToHTML = (sale) => {
  const { customer, contents, payment, state, shipment } = sale;

  return `<h1>Se ha completado una compra de joyeria.</h1>
  <h3>Cliente</h3>
  <p><strong>Nombre:</strong> ${customer.name} ${customer.lastname}</p>
  <p><strong>Telefono:</strong> ${customer.phone}</p>
  ${
    shipment
      ? `<p><strong>Domicilio</strong></p>
  <hr>
  <p><i>Calle:</i> ${customer.address.street}<p>
  <p><i>Colonia:</i> ${customer.address.nbhood}</p>
  <p><i>Numero Exterior:</i> ${customer.address.extNumber}</p>
  ${
    customer.address.intNumber
      ? `<p><i>Numero Interior:</i> ${customer.address.intNumber}</p>`
      : ''
  }
  <p><i>Codigo Postal:</i> ${customer.address.zip}</p>
  ${
    customer.address.references
      ? `<p><i>Referencias</i> ${customer.address.references}</p>`
      : ''
  }`
      : '<p><strong>Envio:</strong> Sin envio (recoger en sucursal)</p>'
  }
  <h3>Contenidos</h3>
  <p><strong>Peso de la venta:</strong> ${contents.weight} gr</p>
  <p><strong>Productos comprados:</strong></p>
  <hr>
  ${itemsToHTML(contents.items)}
  <hr>
  <h3>Pago</h3>
  <p><strong>Subtotal:</strong> $${ctrl.priceToString(payment.subtotal)}</p>
  <p><strong>Total:</strong> $${ctrl.priceToString(payment.total)}</p>
  <p><strong>Precio(s) aplicado(s):</strong> ${contents.prices.join(', ')}</p>
  <p><strong>Metodo de Pago:</strong> ${payment.method}</p>
  <p><strong>Fecha de Pago:</strong> ${ctrl.dateToLocaleDateString(
    new Date(payment.pat)
  )}</p>
  <hr>
  <p>Para ver mas detalles haga <a href="https://elkilate.com.mx/admin/sales/${
    sale._id
  }">click aqui</a>.</p>
  `;

  function itemsToHTML(items) {
    let html = '<ul>';

    for (let i = 0; i < items.length; i++) {
      html += `<li><strong>${items[i].title}:</strong> $${ctrl.priceToString(
        items[i].price
      )}</li>`;
    }

    html += '</ul>';
    return html;
  }
};

ctrl.getPriceByKarat = function (prices, karat, weight) {
  if (!prices || !weight) return NaN;
  let karatPrice;

  switch (karat) {
    case '10K':
      karatPrice = prices.find((p) => p.name === 'gold10K').value;
      break;
    case '14K':
      karatPrice = prices.find((p) => p.name === 'gold14K').value;
      break;
    case '18K':
      karatPrice = prices.find((p) => p.name === 'gold18K').value;
      break;
    default:
      karatPrice = prices.find((p) => p.name === 'silver').value;
      break;
  }
  let calculatedPrice = (+weight * +karatPrice).toFixed(2);
  let [priceInts, priceDecs] = calculatedPrice.split('.');

  return `${(+priceInts).toLocaleString()}.${priceDecs}`;
};

ctrl.escapeRegex = function (txt) {
  return txt.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

ctrl.cleanUnfinishedSales = () => {
  return Sale.remove({ 'state.processing': true, 'state.payed': false })
    .exec()
    .then((res) => {
      console.log('Unfinished sales cleaned');
      process.env.NODE_ENV !== 'production' && console.log(res);
    });
};

module.exports = ctrl;
