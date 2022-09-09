const Admin = require('../models/Admin');
const Model = require('../models/Model');
const Product = require('../models/Product');
const Mineral = require('../models/Mineral');
const Producttype = require('../models/Producttype');
const Productprice = require('../models/Productprice');
const Sale = require('../models/Sale');
const mDate = require('../models/Date');
const Order = require('../models/Order');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const {
  priceToString,
  updateCurrentMonth,
  updateCurrentWeek,
  parseMineralLastUpdated,
  updateMetalRates,
  checkAvailability,
  parseCategory,
  parsePaymentMethod,
  getPaymentId,
  getCategories,
  getCategory,
  getAppliedPrices,
  getAvailableWeight,
  getTotalWeight,
  getModelAvailableWeight,
  filterSalesByCategory,
  getWeekSoldWg,
  getMonthSoldWg,
  numberToLocaleDateString,
  roundNumber,
} = require('../middlewares/helpers');
const { isValidObjectId, Types } = require('mongoose');
const Currency = require('../models/Currency');
const UniqueModel = require('../models/UniqueModel');
const UniqueProduct = require('../models/UniqueProduct');
const Shippingfee = require('../models/Shippingfee');
const Comment = require('../models/Comment');
const {
  oAuth2Client,
  CLIENT_ID,
  CLIENT_SECRET,
  REFRESH_TOKEN,
} = require('../config/oauth');

const ctrl = {};

/* Render Controllers */

ctrl.renderAdmin = async (req, res) => {
  const userId = req.session.passport.user;
  const salesQuery = Sale.find({
    'state.asString': { $ne: 'processing' },
  })
    .limit(5)
    .populate('order')
    .sort({ pat: 1 })
    .lean();
  const modelsQuery = Model.find({}).limit(5).lean();
  const adminQuery = Admin.findById(userId, { displayName: 1 });

  try {
    const [models, sales, admin] = await Promise.all([
      modelsQuery,
      salesQuery,
      adminQuery,
    ]);

    res.status(200).render('pages/admin/index', {
      user: admin.displayName,
      models,
      sales,
      helpers: {
        priceToString: priceToString,
      },
    });
  } catch (err) {
    console.log(err);
  }
};

ctrl.renderSignup = (req, res) => {
  res.render('pages/admin/adminSignUp', {});
};

ctrl.renderSignin = (req, res) => {
  res.render('pages/admin/adminSignIn', {});
};

// Sales
ctrl.renderSales = async (req, res) => {
  const msg = req.flash('msg')[0];
  const err = req.flash('err')[0];
  const success = req.flash('success')[0];

  try {
    const foundDates = await mDate.findOne({}).lean();
    const today = new Date(new Date().setHours(0, 0, 0, 0));

    const salesQuery = Sale.find({ 'state.processing': false })
      .sort({ pat: -1 })
      .populate({
        path: 'order',
      })
      .lean();

    const [foundSales] = await Promise.all([salesQuery]);

    foundSales.forEach(s => {
      if (!(s.payment.pat instanceof Date)) {
        s.payment.pat = new Date(s.payment.pat);
      }
    });

    const daySales = foundSales.filter(sale => {
      return sale.payment.pat >= today;
    });
    const weekSales = foundSales.filter(sale => {
      return sale.payment.pat >= foundDates.currentWeek;
    });
    const monthSales = foundSales.filter(sale => {
      return sale.payment.pat >= foundDates.currentMonth;
    });

    const saleCount = foundSales.length;
    const daySaleCount = daySales.length;
    const weekSaleCount = weekSales.length;
    const monthSaleCount = monthSales.length;

    const totalWeightSold = foundSales.reduce(
      (accumulated, sale) => +(accumulated + sale.contents.weight).toFixed(2),
      0
    );
    const totalEarnings = foundSales.reduce(
      (accumulated, sale) => accumulated + sale.payment.total,
      0
    );

    const monthWeightSold = monthSales.reduce(
      (accumulated, sale) => +(accumulated + sale.contents.weight).toFixed(2),
      0
    );
    const monthEarnings = monthSales.reduce(
      (accumulated, sale) => accumulated + sale.payment.total,
      0
    );

    const weekWeightSold = weekSales.reduce(
      (accumulated, sale) => +(accumulated + sale.contents.weight).toFixed(2),
      0
    );
    const weekEarnings = weekSales.reduce(
      (accumulated, sale) => accumulated + sale.payment.total,
      0
    );

    const dayWeightSold = daySales.reduce(
      (accumulated, sale) => +(accumulated + sale.contents.weight).toFixed(2),
      0
    );
    const dayEarnings = daySales.reduce(
      (accumulated, sale) => accumulated + sale.payment.total,
      0
    );

    return res.render('pages/admin/sales', {
      sales: foundSales,
      daySales,
      monthSales,
      weekSales,
      saleCount,
      daySaleCount,
      weekSaleCount,
      monthSaleCount,
      totalWeightSold,
      totalEarnings,
      monthWeightSold,
      monthEarnings,
      weekWeightSold,
      weekEarnings,
      dayWeightSold,
      dayEarnings,
      err: err,
      msg: msg,
      success: success,
      helpers: {
        priceToString,
        numberToLocaleDateString,
        roundNumber,
      },
    });
  } catch (err) {
    console.log(err);
    throw err;
  }
};

ctrl.renderSale = async (req, res) => {
  const saleId = req.params['id'];
  const err = req.flash('err')[0];
  const success = req.flash('success')[0];

  try {
    const foundSale = await Sale.findById(saleId).populate('order');

    if (!foundSale) {
      req.flash('err', 'Venta no existente');
      return res.redirect('/admin/sales');
    }

    if (!(foundSale.payment.pat instanceof Date)) {
      foundSale.payment.pat = new Date(foundSale.payment.pat).toISOString();
    }

    return res.render('pages/admin/sale', {
      sale: foundSale.toJSON(),
      err: err,
      success: success,
      helpers: {
        priceToString,
        parsePaymentMethod,
        getPaymentId,
        getCategory,
      },
    });
  } catch (err) {
    console.log(err);
    throw err;
  }
};

ctrl.renderSearchSale = async (req, res) => {
  try {
    const search = req.query['searchQuery'];
    let orderQuery;
    let orParameter = [];

    if (search) {
      let baseRegex = new RegExp(escapeRegex(search), 'gi');
      orParameter.push(
        {
          'customer.firstName': baseRegex,
        },
        {
          'customer.last': baseRegex,
        },
        {
          'customer.email': baseRegex,
        },
        {
          'address.neighborhood': baseRegex,
        },
        {
          'address.street': baseRegex,
        }
      );

      const searchWords = search.split(' ');
      searchWords.forEach(word => {
        let newExp = new RegExp(escapeRegex(word), 'gi');
        orParameter.push(
          {
            'customer.firstName': newExp,
          },
          {
            'customer.last': newExp,
          },
          {
            'customer.email': newExp,
          },
          {
            'address.neighborhood': newExp,
          },
          {
            'address.street': baseRegex,
          }
        );
      });

      isValidObjectId(search) &&
        orParameter.push({ _id: Types.ObjectId(search) });
      let searchNumber = +search;
      if (typeof searchNumber !== 'number')
        orParameter.push({ 'address.postalCode': search });
      // console.log(orParameter)
      orderQuery = Order.find({ $or: orParameter }).populate('sale').lean();
    } else {
      orderQuery = Order.find({}).populate('sale').lean();
    }

    const [foundOrders] = await Promise.all([orderQuery]);

    if (!foundOrders || foundOrders.length < 1)
      return res.render('pages/admin/searchSale', {
        noResult: true,
        query: search,
      });

    return res.status(200).render('pages/admin/searchSale', {
      orders: foundOrders,
      orderCount: foundOrders.length,
      query: search,
      helpers: {
        priceToString,
      },
    });
  } catch (err) {
    console.log(err);
    throw err;
  }
};

ctrl.renderSearchSaleByDate = async (req, res) => {
  try {
    const { year, month, day, nonExact } = req.query;

    if (!year || !month || !day) {
      return res.render('pages/admin/searchSaleByDate', {});
    }

    let date = new Date(+year, +month - 1, +day);
    let ISODate = new Date(date.toISOString());
    let saleQuery;

    switch (nonExact) {
      case 'after':
        saleQuery = Sale.find({ pat: { $gte: ISODate } })
          .populate('order')
          .sort({ pat: -1 })
          .lean();
        break;
      case 'before':
        saleQuery = Sale.find({ pat: { $lte: ISODate } })
          .populate('order')
          .sort({ pat: -1 })
          .lean();
        break;
      default:
        saleQuery = Sale.find({ pat: ISODate }).populate('order').lean();
    }

    const foundSales = await saleQuery;

    if (!foundSales || foundSales.length < 1)
      return res.render('pages/admin/searchSaleByDate', {
        noResult: true,
        query: `${year}-${month}-${day}`,
      });

    return res.render('pages/admin/searchSaleByDate', {
      sales: foundSales,
      saleCount: foundSales.length,
      query: `${year}-${month}-${day}`,
      helpers: {
        priceToString,
      },
    });
  } catch (err) {
    console.log(err);
    return res.render('pages/error', {
      err: err,
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor',
    });
  }
};

// Stock
ctrl.renderStock = async (req, res) => {
  try {
    const foundDates = await mDate.findOne({}).lean();
    const currentMonthISO = new Date(foundDates.currentMonth).toISOString();
    const currentWeekISO = new Date(foundDates.currentWeek).toISOString();
    const salesQuery = Sale.find({ 'state.processing': false })
      .limit(10)
      .sort({ date: 1 })
      .populate({
        path: 'order',
        options: {
          lean: true,
        },
      })
      .lean();

    const modelsQuery = Model.find({}).populate('products').lean();

    const [sales, models] = await Promise.all([salesQuery, modelsQuery]);

    /* Separate Stock on Category and Karat basis */
    const goldStock = models.filter(model => model.category === 'gold');
    const silverStock = models.filter(model => model.category === 'silver');
    const gold10kStock = goldStock.filter(stock => stock.karat === '10K');
    const gold14kStock = goldStock.filter(stock => stock.karat === '14K');
    const gold18kStock = goldStock.filter(stock => stock.karat === '18K');

    /* Calculate Weight sold per stock */
    let silverSales = filterSalesByCategory(sales, 'silver');
    let goldSales = filterSalesByCategory(sales, 'gold');

    let silverWeekWgSold = getWeekSoldWg(currentWeekISO, silverSales);
    let gold10kWeekWgSold = getWeekSoldWg(currentWeekISO, goldSales, '10K');
    let gold14kWeekWgSold = getWeekSoldWg(currentWeekISO, goldSales, '14K');
    let gold18kWeekWgSold = getWeekSoldWg(currentWeekISO, goldSales, '18K');

    let silverMonthWgSold = getMonthSoldWg(currentMonthISO, silverSales);
    let gold10kMonthWgSold = getMonthSoldWg(currentMonthISO, goldSales, '10K');
    let gold14kMonthWgSold = getMonthSoldWg(currentMonthISO, goldSales, '14K');
    let gold18kMonthWgSold = getMonthSoldWg(currentMonthISO, goldSales, '18K');

    res.render('pages/admin/stock', {
      sales,
      silverStock,
      gold10kStock,
      gold14kStock,
      gold18kStock,
      silverWeekWgSold,
      silverMonthWgSold,
      gold10kWeekWgSold,
      gold10kMonthWgSold,
      gold14kWeekWgSold,
      gold14kMonthWgSold,
      gold18kWeekWgSold,
      gold18kMonthWgSold,
      models: models.slice(0, 10),
      helpers: {
        checkAvailability,
        parseCategory,
        getAvailableWeight,
        getTotalWeight,
      },
    });
  } catch (err) {
    console.log(err);
    res.render('pages/error', {
      msg: 'Ha ocurrido un error en el servidor',
      status: 500,
      statusTxt: 'SV_ERR',
    });
  }
};

ctrl.renderModels = async (req, res) => {
  try {
    const models = await Model.find()
      .populate('products')
      .limit(10)
      .sort({ code: 1 })
      .lean();

    return res.render('pages/admin/models', {
      models,
      helpers: {},
    });
  } catch (err) {
    console.log(err);
    throw err;
  }
};

ctrl.renderAllModels = async (req, res) => {
  try {
    const foundModels = await Model.find({ karat: '10K' })
      .populate('products')
      .sort({ code: 1 })
      .lean();

    return res.render('pages/admin/all-models', {
      models: foundModels,
      helpers: {
        getModelAvailableWeight,
      },
    });
  } catch (err) {}
};

ctrl.renderAddModel = async (req, res) => {
  try {
    const prodTypesQuery = Producttype.find().sort({ name: 1 }).lean();

    const [prodTypes] = await Promise.all([prodTypesQuery]);

    res.render('pages/admin/addModel', {
      prodTypes,
      firstCode: prodTypes[0]?.code,
    });
  } catch (err) {
    console.log(err);
    res.status(500).render('pages/error', {
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor',
    });
  }
};

ctrl.renderSearchModel = async (req, res) => {
  try {
    const search = req.query['searchQuery'];

    let modelQuery;
    let orParameter = [];

    if (search) {
      let baseRegex = new RegExp(escapeRegex(search), 'gi');
      orParameter.push(
        { name: baseRegex },
        { description: baseRegex },
        { code: baseRegex }
      );

      const searchWords = search.split(' ');
      searchWords.forEach(word => {
        if (word.endsWith('s')) {
          let newWord = word.substring(0, word.length - 1);
          let newExp = new RegExp(escapeRegex(newWord), 'gi');

          orParameter.push(
            { name: newExp },
            { description: newExp },
            { code: newExp }
          );
        }

        if (word.endsWith('es') || word.endsWith('as') || word.endsWith('os')) {
          let newWord = word.substring(0, word.length - 2);
          let newExp = new RegExp(escapeRegex(newWord), 'gi');
          orParameter.push(
            { name: newExp },
            { description: newExp },
            { code: newExp }
          );
        }
      });
      // console.log(orParameter)
      modelQuery = Model.find({ $or: orParameter }).populate('products').lean();
    } else {
      modelQuery = Model.find({}).populate('products').limit(30).lean();
    }

    const [foundModels] = await Promise.all([modelQuery]);

    if (!foundModels || foundModels.length === 0)
      return res.render('pages/admin/searchModel', {
        noResult: true,
        query: search,
      });

    return res.status(200).render('pages/admin/searchModel', {
      models: foundModels,
      modelCount: foundModels.length,
      query: search,
      helpers: {
        getModelAvailableWeight,
      },
    });
  } catch (err) {
    console.log(err);
    throw err;
  }
};

ctrl.renderUpdateModel = async (req, res) => {
  const modelId = req.params['id'];
  const err = req.flash('err')[0];
  const success = req.flash('success')[0];

  if (modelId) {
    const modelQuery = Model.findById(modelId)
      .populate({
        path: 'products',
        select: 'itemCode available weight',
      })
      .lean();
    const typesQuery = Producttype.find({}).sort({ name: 1 }).lean();

    try {
      const [foundModel, foundTypes] = await Promise.all([
        modelQuery,
        typesQuery,
      ]);
      let selectedType = {
        code: foundModel.type,
        name: '',
      };
      let selectedCategory = {
        value: foundModel.category,
        name:
          foundModel.category === 'gold'
            ? 'Joyeria de Oro'
            : 'Joyeria de Plata',
      };

      selectedType.name = foundTypes.find(
        type => selectedType.code === type.code
      ).name;

      let galleryToString = foundModel.gallery.reduce((acc, path, i, arr) => {
        if (i + 1 === arr.length) {
          return acc + path;
        }
        return acc + path + '%%%';
      }, '');

      return res.render('pages/admin/updateModel', {
        model: foundModel,
        types: foundTypes,
        galleryToString,
        selectedType: selectedType,
        selectedCategory,
        err,
        success,
        helpers: {
          parseImgName,
          parseItemCode,
        },
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  const modelsQuery = Model.find({})
    .populate({
      path: 'products',
      select: 'itemCode weight available',
    })
    .limit(10)
    .lean();

  try {
    const models = await modelsQuery;

    res.status(200).render('pages/admin/updateModels', {
      models,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('pages/error', {
      err,
      msg: 'Ha ocurrido un error en el servidor',
      status: 'DBERR',
    });
  }
};

ctrl.renderRemoveModel = async (req, res) => {
  const modelId = req.params['id'];
  const deleted = req.flash('deleted')[0];

  if (modelId) {
    const modelQuery = Model.findById(
      modelId,
      'name title code thumbImg products'
    ).lean();

    try {
      const foundModel = await modelQuery;
      return res.status(201).render('pages/admin/removeModel', {
        model: foundModel,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).render('pages/error', {
        status: 'DBERR',
        msg: 'Ha ocurrido un error en el servidor',
        err: err,
      });
    }
  }

  const modelsQuery = Model.find({})
    .populate({
      path: 'products',
      select: 'itemCode weight available',
    })
    .limit(10)
    .lean();

  try {
    const models = await modelsQuery;

    res.status(200).render('pages/admin/removeModel', {
      models,
      deleted,
    });
  } catch (err) {
    return res.status(500).render('pages/error', {
      err,
      msg: 'Ha ocurrido un error en el servidor',
      status: 'DBERR',
    });
  }
};

ctrl.renderRemoveAllModels = async (req, res) => {
  try {
    const [
      availableModelCount,
      unavailableModelCount,
      availableProductCount,
      unavailableProductCount,
    ] = await Promise.all([
      Model.countDocuments({ available: true }),
      Model.countDocuments({ available: false }),
      Product.countDocuments({ available: true }),
      Product.countDocuments({ available: false }),
    ]);
    const totalModelCount = availableModelCount + unavailableModelCount;
    const totalProductCount = availableProductCount + unavailableProductCount;

    res.render('pages/admin/removeAllModels', {
      availableModelCount,
      unavailableModelCount,
      totalModelCount,
      availableProductCount,
      unavailableProductCount,
      totalProductCount,
    });
  } catch (err) {
    console.log(err);
    res.status(500).render('pages/error', {
      err,
      msg: 'Ha ocurrido un error en el servidor',
      status: 'SV_ERR',
    });
  }
};

// Product Methods
ctrl.renderProducts = async (req, res) => {
  try {
    const models = await Model.find({ available: true })
      .limit(5)
      .populate({
        path: 'products',
      })
      .lean();
    let products = await Product.find()
      .populate({
        path: 'parentModel',
      })
      .limit(5)
      .lean();
    let msg = req.flash('msg') || null;

    if (msg) {
      return res.render('pages/admin/products', {
        products,
        msg: msg,
      });
    }

    return res.render('pages/admin/products', {
      products,
    });
  } catch (err) {
    console.log(err);
    res.status(500).render('pages/error', {
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor',
    });
  }
};

ctrl.renderAddProduct = async (req, res) => {
  const foundModels = await Model.find({}).lean();
  const firstModel = foundModels[0].code;
  let err = req.flash('err')[0];
  let success = req.flash('success')[0];
  let msg = req.flash('msg')[0];

  res.status(200).render('pages/admin/addProducts', {
    models: foundModels,
    firstModel,
    err,
    success,
    msg,
  });
};

ctrl.renderUpdateProduct = async (req, res) => {
  const productId = req.params['id'];
  const success = req.flash('success')[0];
  const err = req.flash('err')[0];

  if (productId) {
    try {
      const productQuery = Product.findById(productId)
        .populate({
          path: 'parentModel',
          options: {
            lean: true,
          },
        })
        .lean();
      const modelsQuery = Model.find({}).lean();

      const [foundProduct, foundModels] = await Promise.all([
        productQuery,
        modelsQuery,
      ]);

      if (!foundProduct) {
        req.flash('err', 'Producto no existente');
        return res.redirect('/admin/models');
      }

      return res.status(200).render('pages/admin/updateProduct', {
        product: foundProduct,
        models: foundModels,
        parentSelected: foundProduct.parentModel,
        err,
        success,
        helpers: {
          parseItemCode,
        },
      });
    } catch (err) {
      console.log(err);
      return res.status(404).render('pages/error', {
        msg: 'El producto no existe',
        err: err,
      });
    }
  }

  const productsQuery = Product.find({})
    .populate('parentModel')
    .limit(10)
    .lean();

  try {
    const products = await productsQuery;

    res.status(200).render('pages/admin/updateProducts', {
      products,
    });
  } catch (err) {
    res.status(500).render('pages/error', {
      err,
      msg: 'Ha ocurrido un error en el servidor',
      status: 'DBERR',
    });
  }
};

ctrl.renderSearchProduct = async (req, res) => {
  const searchQuery = req.query.searchQuery;

  if (!searchQuery) return res.render('pages/admin/searchProduct', {});

  const productQuery = Product.find({
    itemCode: { $regex: searchQuery, $options: 'ix' },
  })
    .populate('parentModel')
    .lean();

  try {
    const foundProducts = await productQuery;

    if (foundProducts.length === 0)
      return res.render('pages/admin/searchProduct', { noResult: true });

    return res.render('pages/admin/searchProduct', {
      products: foundProducts,
      count: foundProducts.length,
    });
  } catch (err) {
    console.log(err);
  }

  res.status(200).render('pages/admin/searchProduct', {
    noResult: true,
  });
};

ctrl.renderRemoveProduct = async (req, res) => {
  const productId = req.params['id'];
  console.log(productId);
  if (productId) {
    const productQuery = Product.findById(
      productId,
      'itemCode thumbImg parentModel'
    )
      .populate({
        path: 'parentModel',
      })
      .lean();

    try {
      const foundProduct = await productQuery;
      return res.status(201).render('pages/admin/removeProduct', {
        product: foundProduct,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).render('pages/error', {
        status: 'DBERR',
        msg: 'Ha ocurrido un error en el servidor',
        err: err,
      });
    }
  }

  const productsQuery = Product.find({})
    .populate('parentModel')
    .limit(10)
    .lean();

  try {
    const products = await productsQuery;

    res.status(200).render('pages/admin/removeProduct', {
      products,
    });
  } catch (err) {
    return res.status(500).render('pages/error', {
      err,
      msg: 'Ha ocurrido un error en el servidor',
      status: 'DBERR',
    });
  }
};

// Unique Model Methods
ctrl.renderAddUniqueModel = async (req, res, next) => {
  try {
    const prodTypesQuery = Producttype.find().sort({ name: 1 }).lean();

    const [prodTypes] = await Promise.all([prodTypesQuery]);

    return res.render('pages/admin/addUniqueModel', {
      prodTypes,
      uniques: true,
      firstCode: prodTypes[0].code,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('pages/error', {
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor',
    });
  }
};

ctrl.renderUpdateUniqueModel = async (req, res, next) => {
  const modelId = req.params['id'];
  const err = req.flash('err')[0];
  const success = req.flash('success')[0];

  if (modelId) {
    const modelQuery = UniqueModel.findById(modelId)
      .populate({
        path: 'products',
        select: 'itemCode available weight',
      })
      .lean();
    const typesQuery = Producttype.find({}).sort({ name: 1 }).lean();

    try {
      const [foundModel, foundTypes] = await Promise.all([
        modelQuery,
        typesQuery,
      ]);
      let selectedType = {
        code: foundModel.type,
        name: '',
      };

      selectedType.name = foundTypes.find(
        type => selectedType.code === type.code
      ).name;

      let galleryToString = foundModel.gallery.reduce((acc, path, i, arr) => {
        if (i + 1 === arr.length) {
          return acc + path;
        }
        return acc + path + '%%%';
      }, '');

      return res.render('pages/admin/updateUniqueModel', {
        model: foundModel,
        types: foundTypes,
        galleryToString,
        selectedType: selectedType,
        err,
        success,
        uniques: true,
        helpers: {
          parseImgName,
          parseItemCode,
        },
      });
    } catch (err) {
      console.log(err);
      // throw err;
      return res.render('pages/admin/5xx', {
        err,
        status: 500,
        statusTxt: 'SV_ERR',
        msg: 'Ha ocurrido un error en el servidor',
      });
    }
  }

  const modelsQuery = UniqueModel.find({})
    .populate({
      path: 'products',
      select: 'itemCode weight available',
    })
    .limit(10)
    .lean();

  try {
    const models = await modelsQuery;

    return res.status(200).render('pages/admin/updateModels', {
      models,
      uniques: true,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('pages/admin/5xx', {
      err,
      msg: 'Ha ocurrido un error en el servidor',
      status: 500,
      statusTxt: 'DBERR',
    });
  }
};

ctrl.renderRemoveUniqueModel = async (req, res, next) => {
  const modelId = req.params['id'];
  const deleted = req.flash('deleted')[0];

  if (modelId) {
    const modelQuery = UniqueModel.findById(
      modelId,
      'name title code thumbImg products'
    ).lean();

    try {
      const foundModel = await modelQuery;
      return res.status(201).render('pages/admin/removeModel', {
        model: foundModel,
        uniques: true,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).render('pages/error', {
        statusTxt: 'DBERR',
        status: 500,
        msg: 'Ha ocurrido un error en el servidor',
        err: err,
      });
    }
  }

  const modelsQuery = UniqueModel.find({})
    .populate({
      path: 'products',
      select: 'itemCode weight available',
    })
    .limit(10)
    .lean();

  try {
    const models = await modelsQuery;

    return res.status(200).render('pages/admin/removeModel', {
      models,
      deleted,
      uniques: true,
    });
  } catch (err) {
    return res.status(500).render('pages/error', {
      err,
      msg: 'Ha ocurrido un error en el servidor',
      status: 500,
      statusTxt: 'DBERR',
    });
  }
};

ctrl.renderSearchUniqueModel = async (req, res, next) => {
  try {
    const search = req.query['searchQuery'];

    let modelQuery;
    let orParameter = [];

    if (search) {
      let baseRegex = new RegExp(escapeRegex(search), 'gi');
      orParameter.push(
        { name: baseRegex },
        { description: baseRegex },
        { code: baseRegex }
      );

      const searchWords = search.split(' ');
      searchWords.forEach(word => {
        if (word.endsWith('s')) {
          let newWord = word.substring(0, word.length - 1);
          let newExp = new RegExp(escapeRegex(newWord), 'gi');

          orParameter.push(
            { name: newExp },
            { description: newExp },
            { code: newExp }
          );
        }

        if (word.endsWith('es') || word.endsWith('as') || word.endsWith('os')) {
          let newWord = word.substring(0, word.length - 2);
          let newExp = new RegExp(escapeRegex(newWord), 'gi');
          orParameter.push(
            { name: newExp },
            { description: newExp },
            { code: newExp }
          );
        }
      });
      // console.log(orParameter)
      modelQuery = UniqueModel.find({ $or: orParameter })
        .populate('products')
        .lean();
    } else {
      modelQuery = UniqueModel.find({}).populate('products').limit(30).lean();
    }

    const [foundModels] = await Promise.all([modelQuery]);

    if (!foundModels || foundModels.length === 0)
      return res.render('pages/admin/searchModel', {
        noResult: true,
        query: search,
        uniques: true,
      });

    return res.status(200).render('pages/admin/searchModel', {
      models: foundModels,
      modelCount: foundModels.length,
      query: search,
      uniques: true,
      helpers: {
        getModelAvailableWeight,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('pages/admin/5xx', {
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor',
      err,
    });
  }
};

// Unique Product Methods
ctrl.renderAddUniqueProduct = async (req, res) => {
  try {
    const foundModels = await UniqueModel.find({}).lean();
    const firstModel = foundModels[0].code;
    let err = req.flash('err')[0];
    let success = req.flash('success')[0];
    let msg = req.flash('msg')[0];

    return res.status(200).render('pages/admin/addUniqueProduct', {
      models: foundModels,
      firstModel,
      err,
      success,
      msg,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('pages/admin/5xx', {
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor',
      err,
    });
  }
};

ctrl.renderUpdateUniqueProduct = async (req, res) => {
  const productId = req.params['id'];
  const success = req.flash('success')[0];
  const err = req.flash('err')[0];

  if (productId) {
    try {
      const productQuery = UniqueProduct.findById(productId)
        .populate({
          path: 'parentModel',
          options: {
            lean: true,
          },
        })
        .lean();
      const modelsQuery = UniqueModel.find({}).lean();

      const [foundProduct, foundModels] = await Promise.all([
        productQuery,
        modelsQuery,
      ]);

      if (!foundProduct) {
        req.flash('err', 'Producto no existente');
        return res.redirect('/admin/models/unique');
      }

      return res.status(200).render('pages/admin/updateUniqueProduct', {
        product: foundProduct,
        models: foundModels,
        parentSelected: foundProduct.parentModel,
        err,
        success,
        uniques: true,
        helpers: {
          parseItemCode,
        },
      });
    } catch (err) {
      console.log(err);
      return res.status(404).render('pages/error', {
        msg: 'El producto no existe',
        err: err,
      });
    }
  }

  const productsQuery = UniqueProduct.find({})
    .populate('parentModel')
    .limit(10)
    .lean();

  try {
    const products = await productsQuery;

    res.status(200).render('pages/admin/updateProducts', {
      uniques: true,
      products,
    });
  } catch (err) {
    res.status(500).render('pages/error', {
      err,
      msg: 'Ha ocurrido un error en el servidor',
      status: 'DBERR',
    });
  }
};

ctrl.renderSearchUniqueProduct = async (req, res) => {
  const searchQuery = req.query.searchQuery;

  if (!searchQuery)
    return res.render('pages/admin/searchProduct', { uniques: true });

  const productQuery = UniqueProduct.find({
    itemCode: { $regex: searchQuery, $options: 'ig' },
  })
    .populate('parentModel')
    .lean();

  try {
    const foundProducts = await productQuery;

    if (foundProducts.length === 0)
      return res.render('pages/admin/searchProduct', {
        noResult: true,
        uniques: true,
      });

    return res.render('pages/admin/searchProduct', {
      products: foundProducts,
      uniques: true,
      count: foundProducts.length,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('pages/admin/5xx', {
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor',
      err,
    });
  }
};

ctrl.renderRemoveUniqueProduct = async (req, res) => {
  const productId = req.params['id'];
  console.log(productId);
  if (productId) {
    const productQuery = UniqueProduct.findById(
      productId,
      'itemCode thumbImg parentModel'
    )
      .populate({
        path: 'parentModel',
      })
      .lean();

    try {
      const foundProduct = await productQuery;
      return res.status(201).render('pages/admin/removeProduct', {
        uniques: true,
        product: foundProduct,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).render('pages/error', {
        status: 'DBERR',
        msg: 'Ha ocurrido un error en el servidor',
        err: err,
      });
    }
  }

  const productsQuery = UniqueProduct.find({})
    .populate('parentModel')
    .limit(10)
    .lean();

  try {
    const products = await productsQuery;

    res.status(200).render('pages/admin/removeProduct', {
      products,
      uniques: true,
    });
  } catch (err) {
    return res.status(500).render('pages/error', {
      err,
      msg: 'Ha ocurrido un error en el servidor',
      status: 'DBERR',
    });
  }
};

ctrl.renderProductTypes = async (req, res, next) => {
  const success = req.flash('success')[0];
  const err = req.flash('err')[0];

  try {
    const foundTypes = await Producttype.find().lean();

    return res.render('pages/admin/productTypes', {
      types: foundTypes,
      err,
      success,
    });
  } catch (err) {
    // console.log(err);
    return next(err);
  }
};

ctrl.renderAddProductType = async (req, res, next) => {
  const err = req.flash('err')[0];
  const success = req.flash('success')[0];
  try {
    res.render('pages/admin/addProductType', {
      err,
      success,
    });
  } catch (err) {
    // console.log(err);
    next(err);
  }
};

ctrl.renderUpdateProductType = async (req, res, next) => {
  const { id } = req.params;
  const err = req.flash('err')[0];
  const success = req.flash('success')[0];

  if (!id) return res.redirect('/admin/product/types');

  try {
    const foundType = await Producttype.findById(id).lean();

    if (!foundType) {
      req.flash('err', 'No se encontro el tipo de prenda con este id');
      return res.redirect('/admin/product/types');
    }

    return res.render('pages/admin/updateProductType', {
      err,
      success,
      type: foundType,
    });
  } catch (err) {
    console.log(err);
    req.flash('err', 'Ha ocurrido un error en el servidor.');
    return res.redirect('/admin/product/types');
  }
};

ctrl.renderRemoveProductType = async (req, res, next) => {
  const { id } = req.params;
  const err = req.flash('err')[0];
  const success = req.flash('success')[0];

  if (!id) return res.redirect('/admin/product/types');

  try {
    const foundType = await Producttype.findById(id).lean();

    if (!foundType) {
      req.flash('err', 'No se encontro el tipo de prenda con este id');
      return res.redirect('/admin/product/types');
    }

    return res.render('pages/admin/removeProductType', {
      err,
      success,
      type: foundType,
    });
  } catch (err) {
    console.log(err);
    req.flash('err', 'Ha ocurrido un error en el servidor.');
    return res.redirect('/admin/product/types');
  }
};

ctrl.renderSetGoldPrice = async (req, res) => {
  const err = req.flash('err')[0];
  const success = req.flash('success')[0];

  try {
    let currentPrices = await Productprice.find({ name: /^gold/ }).lean();
    // let marketPrice = await Mineral.findOne({ currencyCode: 'XAU' }).lean();
    const metalImg = '/img/gold_256.png';

    if (!currentPrices || !currentPrices.length)
      return res.status(200).render('pages/admin/setMetalPrice', {
        isGold: true,
        metal: 'gold',
        metalImg,
        metalName: 'oro',
        noPriceSet: true,
        helpers: {
          priceToString: priceToString,
        },
      });

    const price10K = currentPrices.find(price => price.name === 'gold10K');
    const price14K = currentPrices.find(price => price.name === 'gold14K');
    const price18K = currentPrices.find(price => price.name === 'gold18K');

    return res.status(200).render('pages/admin/setMetalPrice', {
      isGold: true,
      metal: 'gold',
      metalImg,
      metalName: 'oro',
      noPriceSet: false,
      price10K,
      price14K,
      price18K,
      err,
      success,
      helpers: {
        priceToString: priceToString,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('pages/error', {
      err: err,
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor',
    });
  }
};

ctrl.renderSetSilverPrice = async (req, res) => {
  try {
    let currentPrice = await Productprice.findOne({ name: 'silver' }).lean();
    let marketPrice = await Mineral.findOne({ currencyCode: 'XAG' }).lean();
    const metalImg = '/img/silver_256.png';

    if (!currentPrice)
      return res.status(200).render('pages/admin/setMetalPrice', {
        metal: 'silver',
        metalImg,
        metalName: 'plata',
        noPriceSet: true,
        marketPrice: marketPrice?.ratePerGram,
        priceToString: priceToString,
      });

    return res.status(200).render('pages/admin/setMetalPrice', {
      metal: 'silver',
      metalImg,
      metalName: 'plata',
      noPriceSet: false,
      marketPrice: marketPrice?.ratePerGram,
      currentPrice: currentPrice.value,
      priceToString: priceToString,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('pages/error', {
      err: err,
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor',
    });
  }
};

ctrl.renderMinerals = async (req, res) => {
  try {
    const success = req.flash('success')[0];
    const mineralsQuery = Mineral.find({
      $where: "this.currencyCode !== 'USD'",
    }).lean();
    const currenciesQuery = Currency.find({}).lean();

    const [foundMinerals, foundCurrencies] = await Promise.all([
      mineralsQuery,
      currenciesQuery,
    ]);

    const goldDocument = foundMinerals.find(
      mineral => mineral.currencyCode === 'XAU'
    );
    const silverDocument = foundMinerals.find(
      mineral => mineral.currencyCode === 'XAG'
    );

    const gold = {
      id: goldDocument?._id,
      title: 'Oro',
      rateOunce: goldDocument?.ratePerOunce,
      rateGram: goldDocument?.ratePerGram,
      lastUpdated: parseMineralLastUpdated(goldDocument?.lastUpdated),
      currencyCode: goldDocument?.currencyCode,
    };

    const silver = {
      id: silverDocument?._id,
      title: 'Plata',
      rateOunce: silverDocument?.ratePerOunce,
      rateGram: silverDocument?.ratePerGram,
      lastUpdated: parseMineralLastUpdated(silverDocument?.lastUpdated),
      currencyCode: silverDocument?.currencyCode,
    };

    const currencies = foundCurrencies.map(currency => {
      return {
        ...currency,
        lastUpdated: parseMineralLastUpdated(currency.lastUpdated),
      };
    });

    return res.render('pages/admin/minerals', {
      gold,
      silver,
      currencies,
      successMsg: success,
      helpers: {
        priceToString,
      },
    });
  } catch (err) {
    console.log(err);
    throw err;
  }
};

ctrl.renderAddCurrency = async (req, res, next) => {
  try {
    const successMsg = req.flash('success')[0];
    const errMsg = req.flash('err')[0];

    return res.render('pages/admin/addCurrency', {
      successMsg,
      errMsg,
    });
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

/* END Render controllers */

/* Misc controllers */

// Sale Controllers
ctrl.saleDelivered = async (req, res) => {
  const saleId = req.params['id'];

  try {
    const foundSale = await Sale.findById(saleId);

    foundSale.state.delivered = true;
    foundSale.state.asString = 'delivered';

    const saveResult = await foundSale.save();

    if (!saveResult) {
      req.flash('err', 'Venta no existente');
      return res.redirect(`/admin/sales`);
    }

    req.flash('success', 'Se ha actualizado con exito la venta.');
    return res.redirect(`/admin/sale/${saleId}`);
  } catch (err) {
    console.log(err);
    req.flash(
      'err',
      'No se ha podido actulizar la venta. Ha ocurrido un error en el servidor.'
    );
    return res.redirect(`/admin/sale/${saleId}`);
  }
};

ctrl.saleRefunded = async (req, res) => {
  const saleId = req.params['id'];

  try {
    const foundSale = await Sale.findById(saleId);

    foundSale.state.refunded = true;

    const saveResult = await foundSale.save();

    if (!saveResult) {
      req.flash('err', 'Venta no existente');
      return res.redirect(`/admin/sales`);
    }

    req.flash('success', 'Se ha actualizado con exito la venta.');
    return res.redirect(`/admin/sale/${saleId}`);
  } catch (err) {
    console.log(err);
    req.flash(
      'err',
      'No se ha podido actulizar la venta. Ha ocurrido un error en el servidor.'
    );
    return res.redirect(`/admin/sale/${saleId}`);
  }
};

ctrl.saleRemove = async (req, res) => {
  const saleId = req.params['id'];

  try {
    const removeResult = await Sale.findByIdAndDelete(saleId);

    if (!removeResult) {
      req.flash('err', 'Venta no existente');
      return res.redirect(`/admin/sales`);
    }

    req.flash('success', 'Se ha eliminado con exito la venta.');
    return res.redirect(`/admin/sales`);
  } catch (err) {
    console.log(err);
    req.flash(
      'err',
      'No se ha podido eliminar la venta. Ha ocurrido un error en el servidor.'
    );
    return res.redirect(`/admin/sale/${saleId}`);
  }
};

// Invoice controller
ctrl.renderInvoices = async (req, res) => {
  const allInvoicings = await Sale.find({ invoicing: true }).lean();
  const pendingInvoicings = allInvoicings.filter(doc => !doc.invoice.delivered);
  const deliveredInvoicings = allInvoicings.filter(
    doc => doc.invoice.delivered
  );

  return res.render('pages/admin/invoices', {
    allInvoicings,
    pendingInvoicings,
    deliveredInvoicings,
  });
};

ctrl.renderInvoice = async (req, res) => {
  const id = req.params.id;

  if (!id) {
    req.flash('error', 'No se ingresó un id.');
    return res.redirect('/admin/invoices');
  }

  const sale = await Sale.findById(id).lean();

  if (!sale) {
    req.flash('error', `No se encontró la venta para el id ${id}/`);
    return res.redirect('/admin/invoices');
  }

  if (!sale.invoicing) {
    req.flash('error', `La venta con id ${id} no require factura.`);
    return res.redirect('/admin/invoices');
  }

  return res.render('pages/admin/invoice', {
    sale: sale,
  });
};

ctrl.invoiceDelivered = async (req, res) => {
  const id = req.params.id;

  try {
    const foundSale = await Sale.findById(id);

    if (!foundSale) {
      req.flash('error', 'Venta no existente');
      return res.redirect(`/admin/sales`);
    }

    foundSale.invoice.delivered = true;

    await foundSale.save();

    req.flash('success', 'Se ha actualizado con exito la venta.');
  } catch (ex) {
    console.log(ex);
    req.flash(
      'err',
      'No se ha podido actulizar la venta. Ha ocurrido un error en el servidor.'
    );
  }

  return res.redirect(`/admin/sale/${id}`);
};

// Model controllers
ctrl.fetchModels = async (req, res) => {
  try {
    const { skip, limit } = req.query;

    const foundModels = await Model.find({})
      .limit(+limit)
      .skip(+skip)
      .lean();

    if (!foundModels.length) {
      return res.json({
        status: 200,
        statusTxt: 'NO_MORE_MODELS',
        msg: 'No hay más modelos para mostrar.',
        models: foundModels,
      });
    }

    return res.json({
      status: 200,
      statusTxt: 'FOUND',
      msg: 'Se han encontrado mas modelos.',
      models: foundModels,
    });
  } catch (err) {
    console.log(err);
    return res.json({
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor.',
      err: err,
    });
  }
};

ctrl.addModel = async (req, res) => {
  try {
    const {
      modelName,
      modelKarat,
      modelType,
      modelCode,
      modelCategory,
      modelDescription,
      modelGallery,
      mainImage,
      thumbImage,
      mainPage,
      available,
      price,
    } = req.body;

    const newModel = new Model({
      code: `${modelType}-${modelCode}`,
      name: modelName,
      description: modelDescription,
      type: modelType,
      karat: modelKarat,
      category: modelCategory,
      gallery: modelGallery,
      mainImg: mainImage,
      thumbImg: thumbImage,
      mainPage: mainPage,
      available: available,
      price: price,
    });

    const modelCodeInUse = await Model.exists({
      code: `${modelType}-${modelCode}`,
    });

    if (modelCodeInUse)
      return res.json({
        status: 200,
        statusTxt: 'CODE_EXISTS',
        msg: `El codigo ${modelType}-${modelCode} ya esta en uso`,
      });

    const savedProduct = await newModel.save();

    if (!savedProduct)
      return res.json({
        status: 200,
        statusTxt: 'NOT_SAVED',
        msg: 'El modelo no se ha agregado.',
      });

    req.flash('msg', 'Producto añadido');
    return res.json({
      status: 200,
      statusTxt: 'PRODUCT_ADDED',
      msg: 'El modelo ha sido agregado correctamente',
    });
  } catch (err) {
    console.log(err);
    throw err;
  }
};

ctrl.updateModel = async (req, res, next) => {
  const { id } = req.params;
  let {
    modelName,
    modelKarat,
    modelType,
    modelCode,
    modelCategory,
    modelDescription,
    galleryString,
    mainImage,
    thumbImage,
    mainPage,
    available,
  } = req.body;

  const gallery =
    galleryString &&
    galleryString.split('%%%').filter(path => {
      if (
        path.indexOf('/img/products/') >= 0 &&
        (path !== '/img/products/' || path !== '/img/products')
      ) {
        return true;
      }

      return false;
    });

  try {
    const foundModel = await Model.findById(id);

    foundModel.set({
      name: modelName,
      code: modelType + '-' + modelCode,
      description: modelDescription,
      type: modelType,
      karat: modelKarat,
      category: modelCategory,
      gallery: gallery && gallery[0] === '' ? [] : gallery,
      mainImg: mainImage,
      thumbImg: thumbImage,
      available: available,
      mainPage: mainPage,
    });

    const savedModel = await foundModel.save();

    if (!savedModel) {
      // console.log(foundModel);
      req.flash('err', 'No se ha actualizado el modelo.');
      return res.redirect('/admin/model/edit/' + id);
    }

    // console.log(savedModel);
    req.flash('success', 'Se ha actualizado el modelo con exito.');
    return res.redirect('/admin/model/edit/' + id);
  } catch (err) {
    console.log(err);
    req.flash('err', 'Ha ocurrido un error al intentar actualizar el modelo.');
    res.redirect('/admin/model/edit/' + id);
  }
};

ctrl.removeModel = async (req, res, next) => {
  try {
    const modelId = req.params['id'];
    const foundModel = await Model.findById(modelId);
    let removeResult;

    if (foundModel.products.length) {
      removeResult = await Promise.all([
        foundModel.remove(),
        Product.deleteMany({ parentModel: foundModel._id }),
      ]);
    }

    removeResult = await Promise.all([foundModel.remove()]);
    // console.log(removeResult)
    req.flash('deleted', 'El modelo a sido eliminado correctamente');
    return res.redirect('/admin/model/remove');
  } catch (err) {
    console.log(err);
    req.flash('err', 'El modelo no ha podido ser eliminado.');
    return res.redirect('/admin/model/remove');
  }
};

ctrl.removeAllModels = async (req, res, next) => {
  try {
    const removeModelsQuery = Model.deleteMany({});
    const removeProductsQuery = Product.deleteMany({});

    const [removeModelsResult, removeProductsResult] = await Promise.all([
      removeModelsQuery,
      removeProductsQuery,
    ]);

    console.log(removeModelsResult, removeProductsResult);

    req.flash('success', 'La base de datos ha sido limpiada');
    return res.redirect('/admin/models');
  } catch (err) {
    console.log(err);
    return next(err);
  }
};

// Unique Model Methods
ctrl.addUniqueModel = async (req, res, next) => {
  const {
    modelName,
    modelType,
    modelCode,
    modelCategory,
    modelDescription,
    modelGallery,
    mainImage,
    thumbImage,
    mainPage,
    available,
  } = req.body;

  const newUniqueModel = new UniqueModel({
    code: `${modelType}-${modelCode}`,
    name: modelName,
    description: modelDescription,
    type: modelType,
    category: modelCategory,
    gallery: modelGallery || [],
    mainImg: mainImage,
    thumbImg: thumbImage,
    mainPage: mainPage,
    available: available,
  });

  try {
    const modelCodeInUse = await UniqueModel.exists({
      code: `${modelType}-${modelCode}`,
    });

    if (modelCodeInUse)
      return res.json({
        status: 200,
        statusTxt: 'CODE_EXISTS',
        msg: `El codigo ${modelType}-${modelCode} ya esta en uso`,
      });

    const savedModel = await newUniqueModel.save();

    if (!savedModel)
      return res.json({
        status: 400,
        statusTxt: 'NOT_SAVED',
        msg: 'El modelo no se ha agregado.',
      });

    req.flash('msg', 'Producto añadido');
    return res.json({
      status: 200,
      statusTxt: 'PRODUCT_ADDED',
      msg: 'El modelo ha sido agregado correctamente',
      modelId: savedModel._id,
    });
  } catch (err) {
    console.log(err);
    // throw err;
    return res.json({
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor',
      err: err,
    });
  }
};

ctrl.updateUniqueModel = async (req, res, next) => {
  const { id } = req.params;
  let {
    modelName,
    modelType,
    modelCode,
    modelCategory,
    modelDescription,
    galleryString,
    mainImage,
    thumbImage,
    mainPage,
    available,
  } = req.body;

  const gallery = galleryString.split('%%%').map(path => {
    if (path.indexOf('/img/products/') < 0) {
      return `/img/products/${path}`;
    }

    return path;
  });

  try {
    const foundModel = await UniqueModel.findById(id);

    foundModel.set({
      name: modelName,
      code: modelType + '-' + modelCode,
      description: modelDescription,
      type: modelType,
      category: modelCategory,
      gallery: gallery[0] === '' ? [] : gallery,
      mainImg: mainImage,
      thumbImg: thumbImage,
      available: available,
      mainPage: mainPage,
    });

    const savedModel = await foundModel.save();

    if (!savedModel) {
      req.flash('err', 'No se ha actualizado el modelo.');
      return res.redirect('/admin/model/unique/edit/' + id);
    }

    req.flash('success', 'Se ha actualizado el modelo con exito.');
    return res.redirect('/admin/model/unique/edit/' + id);
  } catch (err) {
    console.log(err);
    req.flash('err', 'Ha ocurrido un error al intentar actualizar el modelo.');
    res.redirect('/admin/model/edit/' + id);
  }
};

ctrl.removeUniqueModel = async (req, res, next) => {
  try {
    const modelId = req.params['id'];
    const foundModel = await UniqueModel.findById(modelId);
    let removeResult;

    if (foundModel.products.length) {
      removeResult = await Promise.all([
        foundModel.remove(),
        Product.deleteMany({ parentModel: foundModel._id }),
      ]);
    }

    removeResult = await Promise.all([foundModel.remove()]);

    req.flash('deleted', 'El modelo a sido eliminado correctamente');
    return res.redirect('/admin/model/unique/remove');
  } catch (err) {
    console.log(err);
    req.flash('err', 'El modelo no ha podido ser eliminado.');
    return res.redirect('/admin/model/unique/remove');
  }
};

// Unique Products
ctrl.addUniqueProduct = async (req, res, nx) => {
  try {
    const { parentModel, itemCode, weight, size, karat, available, price } =
      req.body;

    const newProduct = new UniqueProduct({
      parentModel,
      weight,
      size,
      karat,
      price,
      available,
    });

    const foundModel = await UniqueModel.findById(parentModel).populate(
      'products'
    );
    const fullItemCode = `${foundModel.code}-${itemCode}`;
    const productOnModel = foundModel.products.find(
      product => product.itemCode === fullItemCode
    );
    newProduct.itemCode = fullItemCode;

    if (productOnModel && productOnModel.available) {
      req.flash('err', 'El codigo de producto ya esta en uso');
      return res.redirect('/admin/product/unique/add');
    }

    if (productOnModel && !productOnModel.available) {
      await Product.findByIdAndDelete(productOnModel._id);
      foundModel.products = foundModel.products.filter(
        product => product.available
      );
      foundModel.products.push(newProduct);
      req.flash('msg', 'Se ha remplazado producto ya no disponible');
    }

    if (!productOnModel) {
      foundModel.products.push(newProduct);
    }

    await Promise.all([
      newProduct.save(),
      foundModel.updateAvailability(foundModel.products),
    ]);

    req.flash('success', true);
    res.redirect('/admin/product/unique/edit/');
  } catch (err) {
    console.log(err);
    nx(err);
  }
};

ctrl.updateUniqueProduct = async (req, res) => {
  const productId = req.params['id'];

  if (!productId) return res.redirect('/admin/product/unique/edit');

  try {
    const { parentModel, itemCode, karat, weight, size, price, available } =
      req.body;

    const foundProduct = await UniqueProduct.findById(productId);
    const foundParentModel = await UniqueModel.findById(
      foundProduct.parentModel
    ).populate('products');

    const newProducts = foundParentModel.products.filter(
      product => product._id !== productId
    );

    foundProduct.set({
      parentModel,
      itemCode: `${foundParentModel.code}-${itemCode}`,
      karat,
      weight,
      size,
      price,
      available,
    });

    newProducts.push(foundProduct);

    await Promise.all([
      foundParentModel.updateAvailability(newProducts),
      foundProduct.save(),
    ]);

    req.flash('success', 'Se ha actualizado el producto correctamente.');
    return res.redirect(`/admin/product/unique/edit/${productId}`);
  } catch (err) {
    console.log(err);
    req.flash('err', `${err._message}`);
    return res.redirect(`/admin/product/unique/edit/${productId}`);
  }
};

ctrl.removeUniqueProduct = async (req, res) => {
  const productId = req.params['id'];

  try {
    const foundProduct = await UniqueProduct.findById(productId);
    const foundParent = await UniqueModel.findById(
      foundProduct.parentModel
    ).populate('products');
    let promiseArray = [foundProduct.remove()];

    if (foundParent) {
      foundParent.products = foundParent.products.filter(
        product => product._id !== productId
      );
      promiseArray.push(
        await foundParent.updateAvailability(foundParent.products)
      );
    }

    await Promise.all(promiseArray);

    req.flash('success', 'El producto fue eliminado correctamente.');
    return res.redirect('/admin/product/unique/search');
  } catch (err) {
    console.dir(err, {
      colors: true,
      showHidden: true,
    });
    return res.status(500).render('pages/error', {
      statusTxt: 'SV_ERR',
      status: 500,
      msg: 'Ha ocurrido un error en el servidor',
      err: err,
    });
  }
};

ctrl.addProductType = async (req, res) => {
  let { name, code } = req.body;
  let reloadOnSave = Boolean(req.query.reloadOnSave);

  const newType = new Producttype({ name: name, code: code.toUpperCase() });

  try {
    await newType.save();

    if (reloadOnSave) {
      req.flash('success', 'Se ha añadido el tipo de prenda exitosamente.');
      return res.redirect('/admin/product/types');
    }

    return res.status(201).json({
      status: 'OK',
      msg: 'Product added',
      typeId: newType._id,
      typeCode: newType.code,
    });
  } catch (err) {
    console.log(err);

    if (reloadOnSave) {
      if (err.code === 11000) {
        req.flash(
          'err',
          `Ha ocurrido un error al guardar el tipo de prenda. El codigo ya esta en uso.`
        );
      } else {
        req.flash('err', 'Ha ocurrido un error en el servidor.');
      }
      return res.redirect('/admin/product/type/add');
    }

    return res.status(500).json({
      status: 'DBERR',
      msg: 'Ha ocurrido un error al guardar el producto',
      err: err,
    });
  }
};

ctrl.updateProductType = async (req, res, next) => {
  const { id } = req.params;
  const { name, code } = req.body;
  const err = req.flash('err')[0];
  const success = req.flash('success')[0];

  if (!id) return res.redirect('/admin/product/types');

  try {
    const foundType = await Producttype.findById(id);

    if (name) foundType.name = name;

    if (code) foundType.code = code.toUpperCase();

    const savedType = await foundType.save();
    let saveResult = true;

    if (name && savedType.name !== name) {
      saveResult = false;
    }

    if (code && savedType.code !== code.toUpperCase()) {
      saveResult = false;
    }

    if (!saveResult) {
      req.flash('err', 'No se ha actualizado el tipo de prenda.');
      return res.redirect(`/admin/product/type/edit/${id}`);
    }

    req.flash('success', 'Se ha actualizado el tipo de prenda exitosamente.');
    return res.redirect('/admin/product/types');
  } catch (err) {
    console.error(err);

    if (err.code === 11000) {
      req.flash(
        'err',
        `Error al actualizar tipo de prenda. El codigo "${code}" ya esta en uso.`
      );
    } else {
      req.flash('err', 'Ha ocurrido un error en el servidor.');
    }
    return res.redirect(`/admin/product/type/edit/${id}`);
  }
};

ctrl.removeProductType = async (req, res, next) => {
  const { id } = req.params;
  const err = req.flash('err')[0];
  const success = req.flash('success')[0];

  if (!id) return res.redirect('/admin/product/types');

  try {
    const removedType = await Producttype.findByIdAndDelete(id);

    if (!removedType) {
      req.flash('err', 'No se ha encontrado un tipo de prenda para eliminar.');
      return res.redirect('/admin/product/types');
    }

    req.flash('success', 'Se ha eliminado el tipo de prenda con exito.');
    return res.redirect('/admin/product/types');
  } catch (err) {
    console.error(err);
    req.flash('err', 'Ha ocurrido un error en el servidor.');
    return res.redirect('/admin/product/types');
  }
};

ctrl.uploadImages = (req, res) => {
  let pathArr = [];
  let nameArr = [];

  for (let file of req.files) {
    let publicPath = `/img/products/${file.filename}`;
    pathArr.push(publicPath);
    nameArr.push(path.basename(file.filename));
  }

  res.status(201).json({
    status: 'OK',
    paths: pathArr,
    names: nameArr,
  });
};

ctrl.uploadImageBulk = (req, res) => {
  res.status(201).json({
    status: 'OK',
    msg: 'Images uploaded',
  });
};

ctrl.deleteImage = async (req, res) => {
  const imgName = req.body.name;
  const model = req.body.model;

  const imgPath = path.join(req.app.get('publicDir'), imgName);

  if (!imgName) return res.json({ status: 'IMAGE_DELETED' });

  try {
    return fs.stat(imgPath, (err, stats) => {
      if (err) {
        console.log(err);
        return res.status(404).json({
          status: 'NO_FILE',
          err: err,
        });
      }

      fs.unlink(imgPath, err => {
        if (err && err.code !== 'ENOENT') {
          console.log(err);

          return res.status(500).json({
            status: 'ERROR_ON_DELETE',
            err: err,
          });
        }

        return res.json({ status: 'IMAGE_DELETED', imgName: imgName });
      });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('pages/error', {
      status: 'DBERR',
      msg: 'Ha ocurrido un error en el servidor',
      err: err,
    });
  }
};

/* Stock Controllers */
// Dates
ctrl.updateWeek = async (req, res) => {
  try {
    const { week } = req.body;
    const updatedDate = await updateCurrentWeek(week);

    if (updatedDate.currentWeek === week) {
      return res.json({
        status: 201,
        statusTxt: 'DATE_UPDATED',
        msg: 'Se ha actualizado la fecha correctamente.',
      });
    }

    return res.json({
      status: 201,
      statusTxt: 'DATE_NOT_UPDATED',
      msg: 'No se ha podido actualizar la fecha.',
    });
  } catch (err) {
    console.error(err);
    res.json({
      status: 201,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor.',
      err: err,
    });
  }
};

ctrl.updateMonth = async (req, res) => {
  try {
    const { month } = req.body;
    const updatedDate = await updateCurrentMonth(month);

    if (updatedDate.currentMonth === month) {
      return res.json({
        status: 201,
        statusTxt: 'DATE_UPDATED',
        msg: 'Se ha actualizado la fecha correctamente.',
      });
    }

    res.json({
      status: 201,
      statusTxt: 'DATE_NOT_UPDATED',
      msg: 'No se ha podido actualizar la fecha.',
    });
  } catch (err) {
    console.error(err);
    res.json({
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor.',
      err: err,
    });
  }
};

// Products & Models
ctrl.fetchProducts = async (req, res, nx) => {
  try {
    const code = req.query['code'];
    const exp = new RegExp(escapeRegex(code));

    const products = await Product.find({
      itemCode: { $regex: exp, $options: 'i' },
    });

    if (!products.length)
      return res.json({
        status: 200,
        statusTxt: 'NOT_FOUND',
        msg: 'No se han encontrado productos con este modelo.',
      });

    return res.json({
      status: 200,
      statusTxt: 'FOUND',
      msg: `Se han encontrado (${products.length}) productos.`,
      products: products,
    });
  } catch (err) {
    console.log(err);
    return res.json({
      status: 500,
      statusTxt: 'SV_ERR',
      msg: err._msg,
    });
  }
};

ctrl.addProduct = async (req, res, nx) => {
  try {
    const { parentModel, itemCode, weight, size, qty, available } = req.body;

    const newProduct = new Product({
      parentModel,
      weight,
      size,
      count: qty,
      available,
    });

    const foundModel = await Model.findById(parentModel).populate('products');
    const fullItemCode = `${foundModel.code}-${itemCode}`;
    const productOnModel = foundModel.products.find(
      product => product.itemCode === fullItemCode
    );
    newProduct.itemCode = fullItemCode;

    if (productOnModel && !productOnModel.available) {
      await Product.findByIdAndDelete(productOnModel._id);
      foundModel.products = foundModel.products.filter(
        product => product.available
      );
      req.flash('msg', 'Se ha remplazado producto ya no disponible');
    }

    if (productOnModel) {
      req.flash('err', 'El codigo de producto ya esta en uso');
      return res.redirect('/admin/product/add');
    }

    await Promise.all([
      newProduct.save(),
      foundModel.updateAvailability(foundModel.products, false),
    ]);

    if (foundModel.populated('products')) foundModel.depopulate('products');

    foundModel.products.push(newProduct._id);

    await foundModel.save();

    req.flash('success', 'Añadido con exito');
    res.redirect('/admin/product/edit/' + newProduct._id);
  } catch (err) {
    console.log(err);
    nx(err);
  }
};

ctrl.updateProduct = async (req, res) => {
  const productId = req.params['id'];

  if (!productId) return res.redirect('/admin/product/edit');

  try {
    const { parentModel, itemCode, weight, size, qty, available } = req.body;

    const foundProduct = await Product.findById(productId);
    const foundParentModel = await Model.findById(
      foundProduct.parentModel
    ).populate('products');

    if (!foundParentModel) {
      req.flash('err', 'No existe el modelo para este producto');
      return res.redirect('/admin/product/edit');
    }

    const newProducts = foundParentModel.products.filter(
      product => product._id !== productId
    );

    foundProduct.set({
      parentModel,
      itemCode: `${foundParentModel.code}-${itemCode}`,
      weight,
      size,
      qty,
      available,
    });

    newProducts.push(foundProduct);

    await Promise.all([
      foundParentModel.updateAvailability(newProducts),
      foundProduct.save(),
    ]);

    req.flash('success', 'Se ha actualizado el producto correctamente.');
    return res.redirect(`/admin/product/edit/${productId}`);
  } catch (err) {
    console.log(err);
    req.flash('err', `${err._message}`);
    return res.redirect(`/admin/product/edit/${productId}`);
  }
};

ctrl.removeProduct = async (req, res) => {
  const productId = req.params['id'];

  try {
    const foundProduct = await Product.findById(productId);
    const foundParent = await Model.findById(foundProduct.parentModel).populate(
      'products'
    );
    let promiseArray = [foundProduct.remove()];

    if (foundParent) {
      foundParent.products = foundParent.products.filter(
        product => product._id !== productId
      );
      foundParent.productCount--;

      promiseArray.push(await foundParent.save());
      promiseArray.push(
        await foundParent.updateAvailability(foundParent.products)
      );
    }

    await Promise.all(promiseArray);

    req.flash('success', 'El producto fue eliminado correctamente.');
    res.redirect('/admin/product/search');
  } catch (err) {
    console.error(err);
    res.status(500).render('pages/error', {
      status: 'DBERR',
      msg: 'Ha ocurrido un error en el servidor',
      err: err,
    });
  }
};

ctrl.addProductBulk = async (req, res) => {
  try {
    const productBulk = JSON.parse(req.file.buffer);
    const models = {};

    for (let product of productBulk) {
      const foundModel = await Model.findOne({ code: product.model }).populate(
        'products',
        'itemCode'
      );
      if (models[foundModel.code]) continue;
      models[foundModel.code] = foundModel;
    }

    let i = 0;

    for (let product of productBulk) {
      const foundModel = models[product.model];
      if (foundModel.products.some(prod => product.itemCode === prod.itemCode))
        continue;

      const newProduct = new Product({
        itemCode: product.itemCode,
        weight: product.weight,
        size: product.long || product.size,
        available: product.isAvailable || product.available,
        parentModel: foundModel._id,
      });

      foundModel.products.push(newProduct._id);
      foundModel.productCount++;
      await Promise.all([foundModel.save(), newProduct.save()]);
      i++;
    }

    return res.status(201).json({
      status: 'PRODUCT_BULK_ADDED',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'DBERR',
      msg: 'Ha ocurrido un error al intentar insertar los productos',
      err: err,
    });
  }
};

ctrl.addModelBulk = async (req, res) => {
  try {
    const modelBulk = JSON.parse(req.file.buffer);
    const modelCodes = [];
    let models = modelBulk.map((model, i) => {
      const newGallery = model.gallery.map(img => {
        return `/img/products/${img.split('.')[0]}.JPG`;
      });
      let [mainImgModel] = model.mainImg.split('-');
      const newMainImg = `/img/products/${mainImgModel}-001.JPG`;
      let [thumbImgModel] = model.thumbImg.split('-');
      const newThumbImg = `/img/products/${thumbImgModel}-001.JPG`;

      return {
        ...model,
        gallery: newGallery,
        mainImg: newMainImg,
        thumbImg: newThumbImg,
      };
    });

    models.forEach(async (model, i) => {
      if (modelCodes.some(code => code === model.model)) return;
      modelCodes.push(model.model);
      const modelQuery = Model.findOne({ code: model.model });
      const prodTypeQuery = Producttype.findOne({ code: model.type });

      const [foundModel, foundType] = await Promise.all([
        modelQuery,
        prodTypeQuery,
      ]);

      if (foundModel) return;
      if (!foundType) return;

      const mainPage = !(Math.floor(Math.random() * (10 - 1) + 1) % 3);

      const newModel = new Model({
        code: model.model || model.code,
        name: model.title,
        description: model.description,
        type: model.type,
        category: model.category,
        gallery: model.gallery,
        mainImg: model.mainImg,
        thumbImg: model.thumbImg,
        mainPage: model.isOnMainPage || mainPage,
        available: model.isAvailable,
        prodCount: 0,
        products: [],
      });

      await newModel.save();
    });

    return res.status(201).json({
      status: 'MODEL_BULK_ADDED',
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      status: 'DBERR',
      msg: 'Ha ocurrido un error al intentar insertar los productos',
      err: err,
    });
  }
};

ctrl.addCurrency = async (req, res) => {
  try {
    const { name, code, buyRate, sellRate } = req.body;

    const newCurrency = new Currency({
      name: name.toUpperCase(),
      code: code.toUpperCase(),
      buyRate: buyRate,
      sellRate: sellRate,
      lastUpdated: new Date(Date.now()).toISOString().split('T')[0],
    });

    const saveResult = await newCurrency.save();

    saveResult && req.flash('success', 'Se ha añadido la nueva moneda.');
    !saveResult && req.flash('err', 'No se ha podido agregar la nueva moneda.');

    return res.redirect('/admin/minerals');
  } catch (err) {
    console.log(err);
    req.flash(
      'err',
      'No se ha podido agregar la nueva moneda. Ha ocurrido un error en el servidor.'
    );
    return res.redirect('/admin/currency/add');
  }
};

ctrl.updateCurrency = async (req, res) => {
  try {
    const { buyRate, sellRate } = req.body;
    const id = req.params['id'];
    let set = {
      lastUpdated: new Date(Date.now()).toISOString().split('T')[0],
    };

    if (buyRate) set.buyRate = buyRate;
    if (sellRate) set.sellRate = sellRate;

    const updateResult = await Currency.findByIdAndUpdate(id, {
      $set: set,
    });

    if (!updateResult) {
      console.log('err');
      req.flash(
        'err',
        'No se han podido actualizar los precios. No se ha encontrado la moneda'
      );
      return res.redirect('/admin/minerals');
    }

    req.flash('success', 'Se han actualizado los precios correctamente');
    return res.redirect('/admin/minerals');
  } catch (err) {
    console.log(err);
    req.flash('err', 'No se han podido actualizar los precios');
    return res.redirect('/admin/minerals');
  }
};

ctrl.removeCurrency = async (req, res) => {
  try {
    const id = req.params['id'];
    const removeResult = await Currency.findByIdAndDelete(id);

    if (!removeResult) {
      console.log('err');
      req.flash(
        'err',
        'No se ha podido eliminar la moneda. No se ha encontrado.'
      );
      return res.redirect('/admin/minerals');
    }

    req.flash('success', 'La moneda ha sido eliminada con exito.');
    return res.redirect('/admin/minerals');
  } catch (err) {
    console.log(err);
    req.flash('err', `No se ha podido eliminar la moneda.`);
    return res.redirect('/admin/minerals');
  }
};

ctrl.createAdmin = async (req, res) => {
  const { name, pass, displayName } = req.body;

  const newAdmin = new Admin({
    name,
    pass,
    displayName,
  });

  if (!name || !pass || !displayName) {
    req.flash('errMsg', 'No se proporcionaron crendenciales.');
    return req.redirect('/admin/create-admin');
  }

  try {
    await newAdmin.save();

    return res.status(201).json({
      status: 'CREATED',
    });
  } catch (err) {
    return res.status(500).json({
      status: 'ERR',
      err: err,
    });
  }
};

ctrl.updateAdmin = async (req, res) => {
  // const { id } = req.params;
  const data = req.body;

  const admin = await Admin.findOne({ name: data?.name });

  if (!admin)
    return res.json({
      status: 'NOT_FOUND',
    });

  admin.set(data);

  try {
    await admin.save();
  } catch (err) {
    return res.status(500).json({
      status: 'DB_ERROR',
      error: err,
    });
  }

  return res.json({
    status: 'OK',
    admin: {
      ...admin.toJSON(),
      pass: undefined,
    },
  });
};

/* Stock Controllers */

// Prices
ctrl.setGoldPrice = async (req, res) => {
  try {
    let foundProduct = await Productprice.findOne({ name: 'gold' });

    if (!foundProduct) {
      foundProduct = new Productprice({
        name: 'gold',
      });
    }

    foundProduct.value = req.body.price;

    await foundProduct.save();

    res.redirect('/admin/prices/set/gold');
  } catch (err) {
    console.log(err);
    return res.status(500).render('pages/error', {
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor.',
      err: err,
    });
  }
};

ctrl.setGoldKaratPrice = async (req, res) => {
  const id = req.params['id'].toUpperCase();
  const newPrice = +req.body.newPrice;
  let findName;

  switch (id) {
    case '10K':
      findName = 'gold10K';
      break;
    case '14K':
      findName = 'gold14K';
      break;
    case '18K':
      findName = 'gold18K';
      break;
    default:
      return res.redirect('/admin/prices/set/gold');
  }

  try {
    let foundPrice = await Productprice.findOne({ name: findName });

    if (!foundPrice) {
      foundPrice = new Productprice({ name: findName });
    }

    foundPrice.value = newPrice;

    await foundPrice.save();

    req.flash('success', 'Se ha actualizado el precio correctamente');
    return res.redirect('/admin/prices/set/gold');
  } catch (err) {
    console.log(err);
    req.flash('err', 'Ha ocurrido un error en el servidor');
    return res.redirect('/admin/prices/set/gold');
  }
};

ctrl.setSilverPrice = async (req, res) => {
  try {
    let foundProduct = await Productprice.findOne({ name: 'silver' });

    if (!foundProduct) {
      foundProduct = new Productprice({
        name: 'silver',
      });
    }

    foundProduct.value = req.body.price;

    await foundProduct.save();

    res.redirect('/admin/prices/set/silver');
  } catch (err) {
    console.log(err);
    return res.status(500).render('pages/error', {
      status: 500,
      statusTxt: 'SV_ERR',
      msg: 'Ha ocurrido un error en el servidor.',
      err: err,
    });
  }
};

/* Mineral Controllers */
ctrl.updateMineralRates = async (req, res) => {
  try {
    const apiRes = await updateMetalRates();
    console.log(apiRes);

    req.flash('success', 'Se han actualizado los precios correctamente.');
    return res.redirect('/admin/minerals');
  } catch (err) {
    console.log(err);
    req.flash('err', 'Error al actualizar los precios.');
    return req.redirect('/admin/minerals');
  }
};

/* Fees Controllers */
ctrl.renderShippingFees = async (req, res) => {
  const fees = await Shippingfee.find().sort({ value: 1 }).lean();

  return res.render('pages/admin/shippingFees', {
    fees,
  });
};

ctrl.createShippingFee = async (req, res) => {
  const { fee: value, uplimit: upperLimit, lowlimit: lowerLimit } = req.body;

  const fee = new Shippingfee({
    value,
    upperLimit,
    lowerLimit,
  });

  try {
    await fee.save();

    req.flash(
      'success',
      `Se registro correctamente la tarifa de $${priceToString(
        value
      )} para compras entre $${priceToString(lowerLimit)} y ${priceToString(
        upperLimit
      )}`
    );
  } catch (ex) {
    console.log(ex);
    req.flash(
      'error',
      'Hubo un error al intentar guardar el registro en la base de datos'
    );
  }

  return res.redirect('/admin/shipping-fees');
};

ctrl.getShippingFee = async (req, res) => {
  const { value } = req.query;
  let fee;

  try {
    fee = await Shippingfee.findFeeForValue(value);
  } catch (ex) {
    return res.status(500).json({
      status: 'SV_ERROR',
      message: `Ocurrio un error interno en el servidor.`,
      err: ex,
    });
  }

  return res.json({
    status: 'OK',
    fee,
  });
};

/* Comment Management */
ctrl.sendCommentMail = async (req, res) => {
  const { id } = req.params;
  let sale, accessToken;

  try {
    [sale, accessToken] = await Promise.all([
      Sale.findById(id).lean(),
      oAuth2Client.getAccessToken(),
    ]);
  } catch (error) {
    console.log(error);
    req.flash('error', 'Ocurrio un error desconocido');
    return res.status(500).redirect('/admin/sale/' + id);
  }

  if (!sale) {
    req.flash('error', `No se encontró venta con id ${id}`);
    return res.status(404).redirect('/admin/sales');
  }

  const customerEmail = sale.customer.email;

  if (!customerEmail) {
    req.flash(
      'error',
      `El cliente no cuenta con una dirección de correo electronico`
    );
    return res.status(400).redirect('/admin/sale/' + id);
  }

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

  const mailOptions = {
    from: `El Kilate Joyeria | ${
      process.env.STORE_MAIL || 'elkilatej@gmail.com'
    }`,
    to:
      process.env.NODE_ENV?.toLowerCase() === 'production'
        ? customerEmail
        : 'vladwithb@gmail.com',
    subject: '¡Compartenos tu opinión!',
    text: `Desde el Kilate agradecemos tu preferencia y nos interesa saber tu opinión de nuestros productos.
Si tienes un minuto, entra en este enlace y envianos lo que piensas: https://elkilate.com/comentarios/nuevo/${sale._id}`,
    html: genCommentMailHTMLContent(),
  };

  let sendResult;

  try {
    sendResult = await mailTransporter.sendMail(mailOptions);
  } catch (error) {
    console.log(error);
    req.flash(
      'error',
      `Ocurrio un error al enviar el correo electrónico. Intente de nuevo más tarde.`
    );
    return res.status(500).redirect('/admin/sale/' + id);
  }

  if (sendResult.accepted.length === 0) {
    req.flash(
      'error',
      `No se pudo enviar el correo electrónico a ${sale.customer.email}`
    );
    return res.status(500).redirect('/admin/sale/' + id);
  }

  req.flash('success', `Se envió el correo electrónico exitosamente.`);
  return res.redirect('/admin/sale/' + id);

  function genCommentMailHTMLContent() {
    return `<h1>Hola, ${sale.customer.name} ${sale.customer.lastname}</h1>
    <p>Desde el Kilate agradecemos tu preferencia y nos interesa saber tu opinión de nuestros productos.</p>
    <p>Si tienes un minuto, has <a href="https://elkilate.com/comentarios/nuevo/${sale._id}">click aquí</a> para enviarnos lo que piensas.</p>
    `;
  }
};

ctrl.renderComments = async (req, res) => {
  const { success, error } = req.query;
  const comments = await Comment.paginate(
    {},
    {
      sort: { date: -1 },
      lean: true,
    }
  );

  comments.docs.forEach(c => {
    c.summary = c.content.slice(0, 60) + '...';
  });

  return res.render('pages/admin/comments', {
    newComments: comments.docs.filter(c => !c.approved && !c.rejected),
    approvedComments: comments.docs.filter(c => c.approved),
    rejectedComments: comments.docs.filter(c => c.rejected),
    allComments: comments.docs,
    success: success ? String(success) : null,
    error: error ? String(error) : null,
  });
};

ctrl.approveComment = async (req, res) => {
  const { id } = req.params;

  const comment = await Comment.findById(id);

  if (!comment) {
    return res.status(404).json({
      status: 'NOT_FOUND',
      message: `No se encontró comentario con id ${id}`,
    });
  }

  comment.set({
    approved: true,
    rejected: false,
  });

  try {
    await comment.save();

    return res.json({
      status: 'OK',
      message: `Se aprobó exitosamente el comentario.`,
    });
  } catch (ex) {
    return res.status(500).json({
      status: 'SV_ERROR',
      message: `Ocurrio un error en el servidor, intente de nuevo más tarde.`,
    });
  }
};

ctrl.rejectComment = async (req, res) => {
  const { id } = req.params;

  const comment = await Comment.findById(id);

  if (!comment) {
    return res.status(404).json({
      status: 'NOT_FOUND',
      message: `No se encontró comentario con id ${id}`,
    });
  }

  comment.set({
    approved: false,
    rejected: true,
  });

  try {
    await comment.save();

    return res.json({
      status: 'OK',
      message: `Se rechazó exitosamente el comentario.`,
    });
  } catch (ex) {
    return res.status(500).json({
      status: 'SV_ERROR',
      message: `Ocurrio un error en el servidor, intente de nuevo más tarde.`,
    });
  }
};

ctrl.removeComment = async (req, res) => {
  const { id } = req.params;

  const comment = await Comment.findById(id);

  if (!comment) {
    return res.status(404).json({
      status: 'NOT_FOUND',
      message: `No se encontró comentario con id ${id}`,
    });
  }

  try {
    await comment.delete();

    return res.json({
      status: 'OK',
      message: `Se eliminó exitosamente el comentario.`,
    });
  } catch (ex) {
    return res.status(500).json({
      status: 'SV_ERROR',
      message: `Ocurrio un error en el servidor, intente de nuevo más tarde.`,
    });
  }
};

/* Functions */
function parseImgName(imgPath) {
  return path.basename(imgPath);
}

function parseItemCode(itemCode, get) {
  itemCode = itemCode.split('-');
  switch (get) {
    case 'code':
      return itemCode[2];
    case 'model':
      return itemCode[1];
    case 'type':
      return itemCode[0];
    case 'typeAndModel':
      return `${itemCode[0]}-${itemCode[1]}`;
    case 'typeModelAndCode':
      return `${itemCode[0]}-${itemCode[1]}-${itemCode[2]}`;
    default:
      return `${itemCode[0]}-${itemCode[1]}-${itemCode[2]}`;
  }
}

function escapeRegex(txt) {
  return txt.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

module.exports = ctrl;
