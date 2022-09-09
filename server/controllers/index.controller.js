// Product Model
const Product = require('../models/Product');
const Mineral = require('../models/Mineral');
const Model = require('../models/Model');
const Cart = require('../models/Cart');
const Producttype = require('../models/Producttype');
const Productprice = require('../models/Productprice');
const Sale = require('../models/Sale');
const nodemailer = require('nodemailer');
const passport = require('passport');
const {
  oAuth2Client,
  CLIENT_ID,
  CLIENT_SECRET,
  REFRESH_TOKEN,
} = require('../config/oauth');
const {
  mineralNameSwitch,
  genQtyOptions,
  priceToString,
  normalizeModels,
  saleToHTML,
  escapeRegex,
  getPriceByKarat,
  checkProductCount,
} = require('../middlewares/helpers');
const paypal = require('../config/paypal');
const Currency = require('../models/Currency');
const UniqueModel = require('../models/UniqueModel');
const Shippingfee = require('../models/Shippingfee');
const Comment = require('../models/Comment');

const ctrl = {};

// Controller functions
ctrl.renderIndex = async (req, res) => {
  const modelQuery = Model.find({ mainPage: true, available: true })
    .populate({
      path: 'products',
      select: '_id itemCode weight available karat',
      sort: {
        itemCode: 1,
      },
    })
    .limit(12)
    .lean();
  const priceQuery = Productprice.find({}).sort({ name: 'asc' });
  const typeQuery = Producttype.find({ name: { $ne: 'TEST' } })
    .sort({ name: 'asc' })
    .lean();

  try {
    let [models, prices, types] = await Promise.all([
      modelQuery,
      priceQuery,
      typeQuery,
    ]);

    models = normalizeModels(models, true);

    res.status(200).render('pages/index', {
      models,
      prices,
      types: types.filter(t => t.name.toLowerCase() !== 'test'),
      helpers: {
        getPriceByKarat,
        priceToString,
      },
    });
  } catch (err) {
    console.log(err);
  }
};

ctrl.renderStore = async (req, res) => {
  const ctg = req.cookies['ctg'];
  const foundPrices = await Productprice.find({}).sort({ name: 1 }).lean();

  let _rates = foundPrices.filter(price => price.name.includes('gold'));

  const goldRates = _rates.reduce((acc, rate, i) => {
    if (i + 1 === _rates.length) {
      return acc + rate.value;
    }

    return acc + rate.value + '%%%';
  }, '');

  return res.status(200).render('pages/store', {
    goldRates: goldRates,
    typePicked: ctg && ctg.length > 0,
    typeIsGold: ctg === 'gold',
    typeIsSilver: ctg === 'silver',
    silverRate: Math.floor(
      foundPrices.find(price => price.name === 'silver')?.value
    ),
  });
};

ctrl.renderMinery = async (req, res) => {
  let wasMailSent = req.flash('wasMailSent')[0];

  if (typeof wasMailSent !== 'boolean') wasMailSent = false;

  const allRates = await Mineral.find().lean().exec();
  const rates = allRates.filter(rate => {
    rate.ratePerKilo = (rate.ratePerGram * 1000).toFixed(2);
    return rate.currencyCode !== 'XAU' && rate.currencyCode !== 'USD';
  });
  res.status(200).render('pages/minery', {
    rates,
    wasMailSent,
    helpers: {
      mineralNameSwitch,
    },
  });
};

ctrl.renderGold = async (req, res) => {
  try {
    let wasMailSent = req.flash('wasMailSent')[0];
    if (typeof wasMailSent !== 'boolean') wasMailSent = false;

    const goldQuery = Mineral.findOne({ currencyCode: 'XAU' }).lean();
    const dollarQuery = Mineral.findOne(
      { currencyCode: 'USD' },
      { rate: 1 }
    ).lean();
    const centQuery = Currency.findOne({ code: 'CENT' }).lean();
    const ozliQuery = Currency.findOne({ code: 'OZLI' }).lean();

    const [goldData, dollar, cent, ozli] = await Promise.all([
      goldQuery,
      dollarQuery,
      centQuery,
      ozliQuery,
    ]);

    return res.status(200).render('pages/gold', {
      ratePerOunce: goldData.ratePerOunce,
      ratePerGram: goldData.ratePerGram,
      ratePerKilo: goldData.ratePerGram * 1000,
      rateUSD: dollar.rate,
      wasMailSent,
      ozBuyRate: priceToString(ozli && ozli.buyRate),
      ozSellRate: priceToString(ozli && ozli.sellRate),
      centBuyRate: priceToString(cent && cent.buyRate),
      centSellRate: priceToString(cent && cent.sellRate),
      centAvailable: cent ? true : false,
      ozAvailable: ozli ? true : false,
    });
  } catch (err) {
    console.log(err);
    return res.render('pages/gold', {});
  }
};

ctrl.renderTerms = (req, res) => {
  return res.render('pages/terms', {});
};

ctrl.renderPrivacy = (req, res) => {
  return res.render('pages/privacy', {});
};

ctrl.renderSuccs = (req, res) => {
  return res.render('pages/succs', {});
};

ctrl.renderSingle = async (req, res) => {
  try {
    const id = req.params['id'];
    if (!id) return res.redirect('/tienda');
    let model = await Model.findOne({ _id: id }).populate('products').lean();
    if (!model)
      model = await UniqueModel.findById(id).populate('products').lean();

    const typeQuery = Producttype.findOne({ code: model.type }).lean();
    const priceQuery = Productprice.find({}).sort({ name: 1 }).lean();

    const [type, foundPrices] = await Promise.all([typeQuery, priceQuery]);
    let mineralPrice = foundPrices.find(price => {
      switch (model.karat) {
        case '10K':
          return price.name === 'gold10K';
        case '14K':
          return price.name === 'gold14K';
        case '18K':
          return price.name === 'gold18K';
        default:
          return price.name === 'silver';
      }
    }).value;

    if (!model) {
      return res.status(404).render('pages/error', {
        status: 404,
        statusTxt: 'NOT_FOUND',
        msg: 'Articulo no existente',
      });
    }

    model.products = model.products.filter(product => product.available);

    return res.render('pages/single', {
      model,
      type: type.name,
      mineralPrice,
      firstProduct: model.products[0],
      isGold: model.category === 'gold',
      isSilver: model.category === 'silver',
      helpers: {
        getCategory: cat => (cat === 'gold' ? 'Oro' : 'Plata'),
        setPrice: (wg, price) => {
          let p = (wg * price).toFixed(2);
          let [pInts, pDecs] = p.split('.');
          return `${+pInts.toLocaleString()}.${pDecs}`;
        },
        priceToString,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('pages/error', {
      msg: 'Ha ocurrido un error en el servidor',
      err: err,
      status: '500',
      statusTxt: 'SV_ERR',
    });
  }
};

ctrl.renderSearch = async (req, res) => {
  const searchQ = req.query.searchQuery;

  let queries = [];
  let orParameter = [];

  if (searchQ) {
    let baseRegex = new RegExp(escapeRegex(searchQ), 'gi');
    orParameter.push({ name: baseRegex }, { description: baseRegex });

    const searchWords = searchQ.split(' ');
    searchWords.forEach(word => {
      if (searchQ.endsWith('s')) {
        let newSearch = word.substring(0, word.length - 1);
        let newRegex = new RegExp(escapeRegex(newSearch), 'gi');

        orParameter.push({ name: newRegex }, { description: newRegex });
      }

      if (word.endsWith('es') || word.endsWith('as') || word.endsWith('os')) {
        let newSearch = word.substring(0, word.length - 2);
        let newRegex = new RegExp(escapeRegex(newSearch), 'gi');

        orParameter.push({ name: newRegex }, { description: newRegex });
      }
    });

    queries.push(
      Model.find({
        $where: checkProductCount,
        $or: orParameter,
        available: true,
      })
        .populate('products')
        .lean(),
      UniqueModel.find({
        $where: checkProductCount,
        $or: orParameter,
        available: true,
      })
        .populate('products')
        .lean()
    );
  } else {
    queries.push(
      Model.find({
        $where: checkProductCount,
        available: true,
      })
        .populate('products')
        .lean(),
      UniqueModel.find({
        $where: checkProductCount,
        available: true,
      })
        .populate('products')
        .lean()
    );
  }

  queries.push(Productprice.find().lean());

  let nModels, uModels, prices;

  try {
    [nModels, uModels, prices] = await Promise.all(queries);
  } catch (err) {
    console.log(err);
    return res.render('pages/error', {
      err,
      status: 500,
      statusTxt: 'DB_ERROR',
      msg: 'Ocurrio un error al recuperar los documentos de la base de datos',
    });
  }

  let models = normalizeModels([...nModels, ...uModels], true);

  models = models.filter(m => {
    return m.productCount > 0;
  });

  if (!models || models.length <= 0)
    return res.render('pages/search', { noResult: true, query: searchQ });

  return res.status(200).render('pages/search', {
    models,
    modelCount: models.length,
    query: searchQ,
    prices,
    helpers: {
      priceToString,
      getPriceByKarat,
    },
  });
};

ctrl.renderCart = async (req, res) => {
  const device = req.cookies.device;
  const cartUpdated = req.flash('cartUpdated')[0];
  try {
    const cart = await Cart.findOne({ owner: device }).lean();

    if (!cart) {
      return res.render('pages/cart', {});
    }

    res.render('pages/cart', {
      products: cart.items,
      cart,
      cartUpdated: cartUpdated || false,
      helpers: {
        priceToString: price => {
          let [priceInts, priceDecs] = price.toFixed(2).split('.');
          return `${(+priceInts).toLocaleString()}.${priceDecs}`;
        },
        genQtyOptions,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).render('pages/500', {
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor, intente de nuevo mas tarde',
    });
  }
};

ctrl.renderCheckout = async (req, res) => {
  const uid = req.cookies['device'];
  const cart = await Cart.findOne({ owner: uid }).lean();

  if (!cart) return res.redirect('/carrito');

  let subtotal = cart.totalPrice.toFixed(2);

  let fee = await Shippingfee.findFeeForValue(subtotal);

  if (!fee) fee = await Shippingfee.findOne().sort({ value: -1 });

  let discountedTotal = 0;

  cart.items.forEach(i => {
    discountedTotal += i.itemPrice * 0.95;
  });

  let total = subtotal;

  total = total + fee.value - discountedTotal;

  return res.render('pages/checkout', {
    uid,
    products: cart.items,
    subtotal: subtotal,
    subtotalStr: priceToString(subtotal),
    fee: fee.value,
    feeStr: priceToString(fee.value),
    discount: (subtotal - discountedTotal).toFixed(2),
    discountStr: priceToString(subtotal - discountedTotal),
    total: subtotal,
    totalStr: priceToString(total),
  });
};

ctrl.renderPaymentSuccess = async (req, res) => {
  const { saleId } = req.query;
  let wasMailSent = req.flash('wasMailSent')[0];
  let mailSent;

  if (typeof wasMailSent !== 'boolean') wasMailSent = false;
  if (!saleId) return res.redirect('/carrito');

  const [sale, accessToken, cart] = await Promise.all([
    Sale.findById(saleId).populate({ path: 'contents.items.sku' }).lean(),
    oAuth2Client.getAccessToken(),
    Cart.findOne({ owner: req.cookies.device }),
  ]);

  if (!wasMailSent) {
    const mailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.STORE_MAIL || 'elkilatej@gmail.com',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const sendTo = JSON.parse(process.env.NOTIFICATION_MAILS || '[]');
    const mailOptions = {
      from: `El Kilate Joyeria | ${
        process.env.STORE_MAIL || 'elkilatej@gmail.com'
      }`,
      to: sendTo && sendTo.length > 0 ? sendTo : 'vladwithb@gmail.com',
      subject: 'Nueva compra de joyeria.',
      text: `Se ha completado una nueva venta de joyeria, revise este link para ver los detalles: ${req.protocol}://${req.hostname}/admin/sale/${sale._id}`,
      html: saleToHTML(sale),
    };

    mailSent = await mailTransporter.sendMail(mailOptions);
  }

  if (wasMailSent || mailSent.accepted.length) {
    wasMailSent && console.log('mail already sent');
    req.flash('wasMailSent', true);
  }

  req.flash('saleId', undefined);

  if (cart) {
    await cart.remove();
  }

  return res.render('pages/postPayment', {
    sale,
  });
};

ctrl.renderPaymentCancelled = async (req, res) => {
  res.redirect('/carrito/pago');
};

ctrl.renderComments = async (req, res) => {
  const p = req.params.p || 1;
  const comments = await Comment.paginate(
    { approved: true, rejected: false },
    {
      page: p || 1,
      limit: 15,
      lean: true,
      sort: { date: -1 },
    }
  );

  const truncatePrev = !(comments.page - 3 <= 0);
  const truncateNext = !(comments.page + 3 >= comments.totalPages);

  const pages = [];

  let modifier = -2;

  for (let i = 0; i < 4; i++) {
    let page = 0;

    if (i !== 2) {
      page = comments.page + modifier;
    } else {
      page = comments.page;
    }

    page > 0 && page < comments.totalPages && pages.push(page);
    page === 1 && pages.push(page);
    modifier++;
  }

  return res.render('pages/comments', {
    comments: comments.docs,
    nextPage: comments.hasNextPage,
    prevPage: comments.hasPrevPage,
    isFirstPage: comments.page === 1,
    isLastPage: comments.page === comments.totalPages,
    pageCount: comments.totalPages,
    prev: comments.prevPage,
    next: comments.nextPage,
    truncateNext,
    truncatePrev,
    pages,
  });
};

ctrl.renderNewComment = async (req, res) => {
  const { id } = req.params;
  let sale;

  try {
    sale = await Sale.findOne({
      _id: id,
      hasComment: false,
      'state.payed': true,
    }).lean();
  } catch (error) {
    return res.redirect('/');
  }

  if (!sale) return res.redirect('/');

  return res.render('pages/newComment', {
    sale,
  });
};

ctrl.renderSignUp = async (req, res) => {
  res.status(200).render('pages/signIn', {});
};

ctrl.renderSignIn = (req, res) => {
  res.status(200).render('pages/signIn', {
    errMsg: req.flash('errMsg'),
  });
};

ctrl.signIn = async (req, res, next) => {
  passport.authenticate(
    'local.signin',
    {
      successRedirect: '/admin',
      failureRedirect: '/iniciar-sesion',
      failureFlash: true,
    },
    async (err, user, info) => {
      if (err) return next(err);

      if (!user) {
        req.flash('errMsg', 'Usuario no registrado.');
        return res.redirect('/iniciar-sesion');
      }

      const validPass = await user.validatePass(req.body.pass);
      if (!validPass) {
        console.log('Incorrect Password');
        req.flash('errMsg', 'Contraseña incorrecta');
        return res.redirect('/iniciar-sesion');
      }

      req.logIn(user, err => {
        if (err) return next(err);

        return res.redirect('/admin');
      });
    }
  )(req, res, next);
};

module.exports = ctrl;
