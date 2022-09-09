const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const stripe = require('../config/stripe');
const paypal = require('../config/paypal');
const Mineral = require('../models/Mineral');
const Model = require('../models/Model');
const Sale = require('../models/Sale');
const UniqueModel = require('../models/UniqueModel');
const UniqueProduct = require('../models/UniqueProduct');
const Productprice = require('../models/Productprice');
const {
  oAuth2Client,
  CLIENT_ID,
  CLIENT_SECRET,
  REFRESH_TOKEN,
} = require('../config/oauth');
const nodemailer = require('nodemailer');
const { MongooseDocument } = require('mongoose');
const seeder = require('../middlewares/seeder');
const {
  calcPriceWt,
  normalizeModels,
  priceToString,
  normalizeCartItem,
} = require('../middlewares/helpers');
const Shippingfee = require('../models/Shippingfee');
const Comment = require('../models/Comment');

// Controllers for server interaction

const ctrl = {};

ctrl.fetchProducts = async (req, res) => {
  const { ctg, karat, type, p } = req.query;
  const lim = req.query.lim || 12;

  const filters = {
    available: true,
  };
  if (ctg) filters.category = ctg;
  // if (type) filters.type = type;

  let models, uniqueModels;

  if (type && type.length > 0)
    filters['$or'] = [
      { type: type },
      { type: type + '14' },
      { type: type + '18' },
    ];

  const queries = [
    Model.paginate(filters, {
      lean: true,
      page: p || 1,
      limit: lim,
      populate: 'products',
    }),
    UniqueModel.paginate(filters, {
      lean: true,
      page: p || 1,
      limit: lim,
      populate: 'products',
    }),
  ];

  try {
    [models, uniqueModels] = await Promise.all(queries);
  } catch (err) {
    console.log(err);
    return res.json({
      status: 500,
      statusTxt: 'SV_ERR',
      msg:
        err.message || 'Error al recuperar los productos de la base de datos',
      err,
    });
  }

  let normalizedModels = normalizeModels(
    [...models.docs, ...uniqueModels.docs],
    true
  );

  if (!normalizedModels || !normalizedModels.length)
    return res.json({
      status: 200,
      statusTxt: 'NORESULT',
      msg: 'No hay más productos',
      modelCount: normalizedModels.length,
      models: normalizedModels,
    });

  return res.json({
    status: 200,
    statusTxt: 'OK',
    modelCount: normalizedModels.length,
    models: normalizedModels,
  });
};

ctrl.addToCart = async (req, res) => {
  const { id, code } = req.body;
  const { device } = req.cookies;

  const queries = [
    Product.findOne({ _id: id, itemCode: code }).populate('parentModel'),
    UniqueProduct.findOne({ _id: id, itemCode: code }).populate('parentModel'),
    Cart.findOne({ owner: device }),
  ];

  let foundProduct, foundUniqueProduct, cart;

  try {
    [foundProduct, foundUniqueProduct, cart] = await Promise.all(queries);
  } catch (err) {
    console.log(err);
    return res.json({
      status: 500,
      statusTxt: 'DB_ERROR',
      msg: err.message || 'Error interno.',
      err,
    });
  }

  const product = foundProduct || foundUniqueProduct;

  if (!product)
    return res.json({
      status: 404,
      statusTxt: 'NOT_FOUND',
      msg: 'El producto no existe',
    });

  if (!product.available)
    return res.json({
      status: 200,
      statusTxt: 'NO_STOCK',
    });

  if (!cart)
    cart = new Cart({
      owner: device,
      totalItemCount: 0,
      totalPrice: 0,
      items: [],
    });

  let price = product.price || null;

  if (!price) {
    let priceName;

    if (product.parentModel.category === 'silver') {
      priceName = 'silver';
    } else {
      switch (product.parentModel.karat) {
        case '10K':
          priceName = 'gold10K';
          break;
        case '14K':
          priceName = 'gold14K';
          break;
        case '18K':
          priceName = 'gold18K';
          break;
      }
    }

    let foundPrice = await Productprice.findOne({ name: priceName });

    price = calcPriceWt(foundPrice.value, product.weight);
  }

  let itemIndex;

  const itemOnCart = cart.items.find((item, i) => {
    if (String(item.sku) === String(product._id)) {
      itemIndex = i;
      return true;
    }
  });

  if (!itemOnCart) {
    cart.items.push({
      sku: product._id,
      skuModel: product.price ? 'Uniqueproduct' : 'Product',
      unitPrice: price,
      itemPrice: price,
      unitWeight: product.weight,
      itemWeight: product.weight,
      title: product.parentModel.name,
      thumbImg: product.parentModel.thumbImg || undefined,
      priceApplied: product.price
        ? product.price
        : (price / product.weight).toFixed(2),
      code: product.itemCode,
    });
  } else {
    const newQty = cart.items[itemIndex].quantity + 1;
    if (newQty > product.count) {
      return res.json({
        status: 201,
        statusText: 'NOT_ENOUGH_STOCK',
        msg: 'No contamos con más unidades de este articulo.',
      });
    }
    cart.items[itemIndex].quantity++;
    cart.items[itemIndex].itemPrice = +(
      cart.items[itemIndex].unitPrice * cart.items[itemIndex].quantity
    ).toFixed(2);
    cart.items[itemIndex].itemWeight = +(
      cart.items[itemIndex].unitWeight * cart.items[itemIndex].quantity
    ).toFixed(2);
  }

  try {
    await cart.save();
  } catch (err) {
    console.log(err);
    return res.json({
      status: 500,
      statusTxt: 'UPDATE_ERROR',
      msg: 'Hubo un error al actualizar el carrito.',
      err,
    });
  }

  let itemAdded = {
    title: product.parentModel.name,
    price: price,
    thumbImg: product.parentModel.thumbImg,
  };

  return res.status(201).json({
    statusTxt: 'CART_UPDATED',
    item: itemAdded,
    count: cart.totalItemCount,
  });
};

ctrl.updateItemQuantity = async (req, res) => {
  const device = req.cookies.device;
  const { itemId, newQty } = req.body;

  const queryCart = Cart.findOne({ owner: device }).populate({
    path: 'items',
    populate: {
      path: 'sku',
      select: 'count',
    },
  });

  try {
    const [cart] = await Promise.all([queryCart]);

    let itemIndex;
    const itemOnCart = cart.items.find((item, i) => {
      if (String(item.sku) == String(itemId)) {
        itemIndex = i;
        return true;
      }
    });

    if (!itemOnCart) {
      return res.status(404).json({
        status: 404,
        statusText: 'NOT_FOUND',
        msg: 'El producto ya no se encuentra en el carrito.',
        itemId: itemId,
        cartId: cart._id,
      });
    }

    if (newQty === 0) {
      cart.items = cart.items.filter((item, i) => itemIndex !== i && true);
    } else if (
      cart.items[itemIndex].sku.count &&
      newQty > cart.items[itemIndex].sku.count
    ) {
      return res.json({
        status: 201,
        statusText: 'NOT_ENOUGH_STOCK',
        msg: 'La cantidad ingresada excede la cantidad de unidades disponibles',
      });
    } else {
      cart.items[itemIndex].quantity = newQty;
      cart.items[itemIndex].itemPrice = +(
        cart.items[itemIndex].unitPrice * cart.items[itemIndex].quantity
      ).toFixed(2);
      cart.items[itemIndex].itemWeight = +(
        cart.items[itemIndex].unitWeight * cart.items[itemIndex].quantity
      ).toFixed(2);
    }

    await cart.save();

    req.flash('cartUpdated', true);
    return res.json({
      status: 201,
      statusText: 'CART_UPDATED',
      msg: 'La cantidad de elementos ha sido actualizada',
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: 500,
      statusText: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor, intente de nuevo mas tarde.',
      err: err,
    });
  }
};

ctrl.removeFromCart = async (req, res) => {
  let device = req.cookies['device'];
  let itemId = req.query.itemId;
  let queryCart = Cart.findOne({ owner: device });

  try {
    const cart = await queryCart;
    const item = cart.items.find(i => String(i.sku) === String(itemId));

    const newItems = cart.items.filter(
      item => String(item.sku) !== String(itemId)
    );

    cart.items = newItems;

    await cart.save();

    const fee = await Shippingfee.findFeeForValue(cart.totalPrice);

    let discount = 0;

    cart.items.forEach(i => {
      discount += i.itemPrice * 0.05;
    });

    req.flash('success', 'Se eliminó el producto del carrito.');
    return res.status(201).json({
      status: 'OK',
      msg: 'Producto removido con exito',
      cart: {
        subtotal: cart.totalPrice,
        shipfee: fee?.value,
        discount,
      },
      item,
      count: cart.items.length,
    });
  } catch (e) {
    console.log(e);
    return res.json({
      status: 500,
      statusText: 'SV_ERR',
      err: e,
    });
  }
};

ctrl.initializeSale = async (req, res) => {
  const {
    firstName: name,
    lastName: lastname,
    phone,
    email,
    street,
    col: nbhood,
    extNumber,
    intNumber,
    postalCode: zip,
    state,
    city,
    references: refs,
    shipment,
    pickUp,
    invoice,
    business_name,
    rfc,
    invoicing_address,
    invoicing_email,
    invoicing_phone,
    cfdi,
  } = req.body;
  const { device: owner } = req.cookies;

  const cart = await Cart.findOne({
    owner: owner,
  }).populate({
    path: 'items.sku',
    populate: 'parentModel',
  });

  let fee;

  if (shipment) {
    fee = await Shippingfee.findFeeForValue(cart.totalPrice);
  }

  if (!fee) fee = { value: 0 };

  const newSale = new Sale({
    customer: {
      device: owner,
      name,
      lastname,
      phone,
      email,
      address: {
        street,
        nbhood,
        extNumber,
        intNumber,
        zip,
        state,
        city,
        refs,
      },
    },
    payment: {
      shipmentFee: fee.value,
    },
    shipment,
    pickUp,
    invoicing: invoice,
  });

  const normalizedItems = [];

  let karats = [],
    prices = [],
    categories = [],
    weight = 0,
    discount = 0;

  cart.items.forEach(i => {
    // Define current values for relevant fields
    const k = i.sku.karat || i.sku.parentModel.karat,
      p = i.priceApplied,
      c =
        i.sku.parentModel.category === 'gold'
          ? 'Joyeria de Oro'
          : 'Joyeria de Plata',
      w = i.itemWeight || i.sku.weight * i.quantity;

    if (prices.indexOf(p) < 0) prices.push(p);
    if (karats.indexOf(k) < 0) karats.push(k);
    if (categories.indexOf(c) < 0) categories.push(c);

    weight += w;

    discount += i.itemPrice * 0.05;

    // Push normalized item to normalizedItems array
    normalizedItems.push(normalizeCartItem(i));
  });

  newSale.contents = {
    items: normalizedItems,
    karats,
    categories,
    prices,
    weight,
  };

  newSale.payment.discount = discount.toFixed(2);

  if (invoice)
    newSale.invoice = {
      business_name,
      RFC: rfc,
      address: invoicing_address,
      email: invoicing_email,
      phone: invoicing_phone,
      CFDI: cfdi,
    };

  try {
    await newSale.save();
  } catch (err) {
    console.log(err);

    if (err.name === 'ValidationError') {
      return res.json({
        statusTxt: 'DB_ERROR',
        msg: 'No se pudo generar una nueva venta con la informacion proporcionada.\nPor favor revisela e intente de nuevo.',
        err,
      });
    }

    return res.json({
      statusTxt: 'DB_ERROR',
      msg: 'Hubo un error al guardar la venta en la base de datos.',
      err,
    });
  }

  return res.json({
    statusTxt: 'OK',
    saleId: newSale._id,
  });
};

ctrl.finalizeStripeSale = async (req, res) => {
  const { intentId, saleId } = req.body;
  const saleQ = Sale.findById(saleId).populate({
    path: 'contents.items.sku',
  });
  const stripePaymentIntentQ = stripe.paymentIntents.retrieve(intentId);

  const [sale, pay_intent] = await Promise.all([saleQ, stripePaymentIntentQ]);

  const total = pay_intent.amount / 100;

  /* let subtotal = sale.shipment
    ? ((pay_intent.amount * 100) / 100 - sale.payment.shipmentFee).toFixed(2)
    : ((pay_intent.amount * 100) / 100).toFixed(2); */

  const subtotal = sale.shipment
    ? total - sale.payment.shipmentFee + sale.payment.discount
    : total + sale.payment.discount;

  sale.state = {
    ...sale.state,
    payed: true,
    processing: false,
    asString: 'payed',
  };

  sale.payment = {
    ...sale.payment,
    shipmentFee: sale.shipment ? sale.payment.shipmentFee : 0,
    method: 'Tarjeta',
    stripeId: intentId,
    subtotal: subtotal,
    total: total,
    pat: Date.now(),
  };

  try {
    await sale.save();
  } catch (err) {
    console.log(err);
  }

  const modifiedModels = [];
  const saveQueries = [];

  sale.contents.items.map(({ sku: p }) => {
    p.available = false;

    if (modifiedModels.indexOf(p.parentModel._id) < 0) {
      modifiedModels.push(p.parentModel._id);
    }

    saveQueries.push(p.save());
  });

  const nModelQ = Model.find({ _id: modifiedModels }).populate('products');
  const uModelQ = UniqueModel.find({ _id: modifiedModels }).populate(
    'products'
  );

  let nModels, uModels;

  try {
    [nModels, uModels] = await Promise.all([nModelQ, uModelQ, ...saveQueries]);
  } catch (err) {
    console.log(err);
  }

  const updateAvailabilityQueries = [];

  [...nModels, ...uModels].forEach(async m => {
    updateAvailabilityQueries.push(m.updateAvailability(m.products));
  });

  try {
    await Promise.all(updateAvailabilityQueries);
  } catch (err) {
    console.log(err);
  }

  req.flash('wasMailSent', false);
  req.flash('saleId', sale.id);
  return res.json({
    status: 'OK',
    total: sale.payment.total,
  });
};

ctrl.cancelAndRemoveSale = async (req, res) => {
  const { id } = req.query;

  try {
    await Sale.findByIdAndDelete(id);
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      statusTxt: 'DB_ERROR',
      msg: 'Error al eliminar la venta',
      err,
    });
  }

  return res.json({
    statusTxt: 'OK',
  });
};

ctrl.finalizePaypalSale = async (req, res) => {
  const { PayerID, paymentId, saleId, owner } = req.query;

  const queries = [
    Sale.findById(saleId).populate('contents.items.sku'),
    Cart.findOne({ owner }).populate('items.sku'),
  ];

  let sale, cart;

  try {
    [sale, cart] = await Promise.all(queries);
  } catch (err) {
    console.log(err);
    return res.render('pages/error', {
      status: 404,
      statusTxt: 'NOT_FOUND',
      msg: `Ocurrio un error inesperado.
      No hemos podido encontrar tu ${
        !sale ? 'registro de venta' : !cart ? 'carrito' : ''
      } y por lo tanto la transaccion no pudo ser completada.
      Lamentamos las molestias.
      ${err.message || ''}`,
      err,
    });
  }

  const subtotal = cart.totalPrice;
  const total = sale.shipment
    ? subtotal + sale.payment.shipmentFee - sale.payment.discount
    : subtotal - sale.payment.discount;

  const executePaymentJSON = {
    payer_id: PayerID,
    transactions: [
      {
        amount: {
          currency: 'MXN',
          total: total.toFixed(2),
        },
      },
    ],
  };

  paypal.payment.execute(
    paymentId,
    executePaymentJSON,
    async (err, payment) => {
      if (err) {
        console.log(err);

        return res.status(500).render('pages/error', {
          status: 500,
          statusTxt: 'PAYMENT_ERROR',
          msg: `No se pudo ejecutar el pago.\n${err.message}`,
          err,
        });
      }

      sale.state = {
        ...sale.state,
        processing: false,
        payed: true,
        asString: 'payed',
      };

      sale.payment = {
        ...sale.payment,
        shipmentFee: sale.shipment ? sale.payment.shipmentFee : 0,
        method: 'PayPal',
        paypal: {
          payerId: PayerID,
          paymentId,
        },
        subtotal,
        total,
        pat: Date.now(),
      };

      try {
        await sale.save();
      } catch (err) {
        console.log(err);
      }

      const modifiedModels = [];
      const saveQueries = [];

      sale.contents.items.forEach(({ sku: p }) => {
        p.available = false;

        if (modifiedModels.indexOf(p.parentModel._id) < 0) {
          modifiedModels.push(p.parentModel._id);
        }

        saveQueries.push(p.save());
      });

      const nModelQ = Model.find({ _id: modifiedModels }).populate('products');
      const uModelQ = UniqueModel.find({ _id: modifiedModels }).populate(
        'products'
      );

      let nModels, uModels;

      try {
        [nModels, uModels] = await Promise.all([
          nModelQ,
          uModelQ,
          ...saveQueries,
        ]);
      } catch (err) {
        console.log(err);
      }

      const updateAvailabilityQueries = [];

      [...nModels, ...uModels].forEach(async m => {
        updateAvailabilityQueries.push(m.updateAvailability(m.products));
      });

      try {
        await Promise.all(updateAvailabilityQueries);
      } catch (err) {
        console.log(err);
      }

      req.flash('wasMailSent', false);
      return res.redirect(`/carrito/pago/realizado?saleId=${sale._id}`);
    }
  );
};

ctrl.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.query;

    if (!orderId || orderId.length === 0)
      return res.status(400).json({
        status: 400,
        statusTxt: 'NO_ORDERID',
        msg: 'No se ha ingresado un id',
      });

    await Order.deleteOne({ _id: orderId });

    return res.status(200).json({
      status: 200,
      statusTxt: 'ORDER_REMOVED',
      msg: 'Orden removida exitosamente',
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      status: 500,
      statusTxt: 'SV_ERR',
      err: err,
      msg: 'Ha ocurrido un error en el servidor',
    });
  }
};

ctrl.createStripePaymentIntent = async (req, res) => {
  const { saleId } = req.body;
  const { device } = req.cookies;

  const [cart, sale] = await Promise.all([
    Cart.findOne({ owner: device }),
    Sale.findById(saleId),
  ]);

  const subtotal = cart && cart.totalPrice;
  const total = sale.shipment
    ? Math.ceil(subtotal * 100) +
      Math.ceil(sale.payment.shipmentFee * 100) -
      Math.ceil(sale.payment.discount * 100)
    : Math.ceil(subtotal * 100) - Math.ceil(sale.payment.discount * 100);
  let paymentIntent;

  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: 'mxn',
    });
  } catch (err) {
    console.log(err);
    return res.json({
      status: 'ERROR',
      msg: `Hubo un error al crear "PaymentIntent".\n${err.message || ''}`,
      err,
    });
  }

  return res.json({
    status: 'OK',
    clientSecret: paymentIntent.client_secret,
  });
};

ctrl.createPaypalPaymentIntent = async (req, res) => {
  const { saleId } = req.body;
  const { device } = req.cookies;

  const [cart, sale] = await Promise.all([
    Cart.findOne({ owner: device }).populate({
      path: 'items.sku',
      select: '_id parentModel',
      populate: {
        path: 'parentModel',
        select: 'description',
      },
    }),
    Sale.findById(saleId),
  ]);

  const cartContents =
    cart &&
    cart.items.map(item => {
      return {
        name: item.title,
        description: item.sku.parentModel.description,
        sku: item.sku._id,
        price: item.unitPrice.toFixed(2),
        quantity: item.quantity,
        currency: 'MXN',
      };
    });

  const paymentObject = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal',
    },
    redirect_urls: {
      return_url: `${req.protocol}://${req.hostname}/api/sale/finish/paypal?saleId=${saleId}&owner=${device}`,
      cancel_url: `${req.protocol}://${req.hostname}/api/sale/cancel?id=${saleId}`,
    },
    transactions: [
      {
        item_list: {
          items: cartContents,
        },
        amount: {
          currency: 'MXN',
          total: sale.shipment
            ? (
                cart.totalPrice +
                sale.payment.shipmentFee -
                sale.payment.discount
              ).toFixed(2)
            : (cart.totalPrice - sale.payment.discount).toFixed(2),
          details: {
            subtotal: cart.totalPrice.toFixed(2),
            shipping: sale.shipment ? `${sale.payment.shipmentFee}.00` : '0.00',
            discount: sale.payment.discount,
          },
        },
        description: 'Compra de joyeria en elkilate.com.mx',
      },
    ],
  };

  paypal.payment.create(paymentObject, (err, payment) => {
    if (err) {
      console.log(err);
      console.log(err.response.details);
      req.flash('paypal_error', err.message);
      return res.redirect('/carrito/pago');
    }

    for (const link of payment.links) {
      if (link.rel === 'approval_url') return res.redirect(link.href);
    }
  });
};

/* Contact mail Controllers */
ctrl.sendContactMail = async (req, res) => {
  const { contactEmail, name, email, subject, message, page } = req.body;

  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const mailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: 'elkilatej@gmail.com',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: 'El Kilate | <elkilatej@gmail.com>',
      to: contactEmail || 'vladwithb@gmail.com',
      subject: `${subject}`,
      text: `Se ha enviado un correo desde el formulario de contacto.
            Los datos son:
            Nombre: ${name}
            Correo: ${email}
            Mensaje: ${message}`,
      html: createHTMLMessage(name, email, message),
    };

    mailSent = await mailTransporter.sendMail(mailOptions);
    req.flash('wasMailSent', true);

    res.redirect(`/${page}`);
  } catch (err) {
    console.log(err);
    res.redirect(`/${page}`);
    throw err;
  }

  function createHTMLMessage(name, email, message) {
    let html = '';

    html += `<h1>Nuevo correo de contacto</h1>
        <p>Se ha enviado un correo desde el formulario de contacto.</p>
        <p>Los datos de contacto son:</p>
        <ul>
            <li><strong>Nombre</strong> ${name}</li>
            <li><strong>Correo</strong> ${email}</li>
        </ul>
        <p>El mensaje enviado es:</p>
        <p>${message}</p>`;

    return html;
  }
};

ctrl.saveNewComment = async (req, res) => {
  const { id } = req.params;
  const commentBody = req.body;

  const comment = new Comment({ ...commentBody, sale: id });

  try {
    await comment.save();
  } catch (ex) {
    return handleAsyncError(ex);
  }

  try {
    await Sale.updateOne({ _id: id }, { $set: { hasComment: true } });
  } catch (ex) {
    return handleAsyncError(ex);
  }

  req.flash(
    'success',
    `Su comentario fue enviado y será revisado para su publicación. Muchas gracias por su preferencia.`
  );
  return res.redirect('/comentarios');

  function handleAsyncError(ex) {
    console.log(ex);

    if (ex.name === 'ValidationError') {
      req.flash(
        'error',
        `Alguno de los campos no es válido, revise la información proporcionada y vuelva a intentarlo.`
      );
    }

    if (ex.name === 'MongoError') {
      req.flash(
        'error',
        `Ha ocurrido un error al guardar su comentario en la base de datos. Por favor, intente de nuevo más tarde.`
      );
    }

    req.flash(
      'error',
      `Ocurrio un error en el servidor. Intente de nuevo más tarde.`
    );

    return res.redirect('/comentarios/nuevo/' + id);
  }
};

ctrl.fetchStripePublishableKey = (req, res) => {
  const pk =
    process.env.STRIPE_PK || 'pk_test_pPozYcpc4fu7zY7RaKe55bZb00sMt2jlGe';

  return res.json({
    status: 200,
    statusTxt: 'FOUND',
    pk: pk,
    msg: 'Publishable key found',
  });
};

ctrl.seed = async (req, res) => {
  try {
    await seeder();
    res.status(200).send('Finished');
  } catch (e) {
    res.status(500).json({ err: e });
    throw e;
  }
};

function escapeRegex(txt) {
  return txt.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

module.exports = ctrl;
