// Modules
const express = require('express');
const path = require('path');
const hbs = require('express-handlebars');
const morgan = require('morgan');
const crono = require('node-cron');
const expSession = require('express-session');
const MongoStore = require('connect-mongodb-session')(expSession);
const cookieParser = require('cookie-parser');
const passport = require('passport');
const methOverride = require('method-override');
const flash = require('connect-flash');

// Inits
const app = express();
require('./db');
require('./passport');

/* Routes */
const mainRoutes = require('./routes/index.routes');
const adminRoutes = require('./routes/admin.routes');
const apiRoutes = require('./routes/api.routes');
const stripeWebhookRoutes = require('./routes/stripewh.routes');

/* Helpers */
const {
  isStore,
  calcSalePrice,
  updateMetalRates,
  isAuthenticated,
  updateCurrentMonth,
  updateCurrentWeek,
  getModelAvailableWeight,
  priceToString,
  numberToLocaleDateString,
  cleanUnfinishedSales,
  roundNumber,
  getAppliedPrices,
  numberToNumericDateString,
} = require('./middlewares/helpers');

/* Schedule Metal Rates Updates */
if (process.env.UPDATE_RATES_ENABLED) {
  crono.schedule('0 0 0 * * *', () => {
    updateMetalRates();
    cleanUnfinishedSales();
  });
}
// WARNING! The next line forces the Metal Rates to update on server start
// updateMetalRates();
// WARNING! The next line removes the unfinished sales from the database
// cleanUnfinishedSales();

/* Schedule Week and Month start date update */
if (process.env.UPDATE_DATES_ENABLED) {
  crono.schedule('* * * 1 * *', () => updateCurrentMonth(), {
    timezone: 'America/Mexico_City',
  });
  crono.schedule('* * * * * Mon', () => updateCurrentWeek()),
    {
      timezone: 'America/Mexico_City',
    };
}

// Update dates on server start
updateCurrentMonth();
updateCurrentWeek();

// Settings
app.set('port', process.env.PORT || 3000);
app.set('publicDir', path.join(__dirname, 'public'));
app.set('views', path.join(__dirname, 'views'));
app.engine(
  '.hbs',
  hbs({
    extname: '.hbs',
    defaultLayout: false,
    // layoutsDir: path.join(app.get('views'), 'partials', 'layouts'),
    partialsDir: path.join(app.get('views'), 'partials'),
    helpers: {
      isStore,
      calcSalePrice,
      getModelAvailableWeight,
      priceToString,
      numberToLocaleDateString,
      numberToNumericDateString,
      roundNumber,
      getAppliedPrices,
    },
  })
);
app.set('view engine', '.hbs');

// Use different parser config for stripe webhooks
app.use(
  '/stripe-wbhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookRoutes
);

// Middlewares
app.use(express.json({ limit: '500mb' }));
app.use(
  express.urlencoded({ extended: true, limit: '500mb', parameterLimit: 50000 })
);
app.use(
  cookieParser(process.env.COOKIE_SECRET || 'c007e2711578be94eef809d96074d04f')
);
app.use(methOverride('_method'));
app.use(
  expSession({
    secret: process.env.XSESSION_SECRET || 'c007e2711578be94eef809d96074d04f',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      uri: process.env.DB_URI || 'mongodb://localhost/elkilate',
      collection: 'sessions',
      expires: 1000 * 60 * 60 * 24, //1 Day
      connectionOptions: {
        /* auth: {
                user: 'admin',
                password: '}UD)2Xjn8FcgM-5p'
            },
            authSource: 'admin', */
        useUnifiedTopology: true,
        useNewUrlParser: true,
      },
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: true,
    },
  })
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
// app.use(morgan('dev'));
process.env.NODE_ENV === 'production' && app.use(morgan('common'));

// Global Vars
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.errors = req.flash('error');
  res.locals.err = req.flash('err');

  next();
});

// Routes
app.use('/admin', isAuthenticated, adminRoutes);
app.use('/api', apiRoutes);
app.use(mainRoutes);

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Error Handling
if (process.env.NODE_ENV === 'production') {
  app.use((err, req, res, next) => {
    if (req.headersSent) return next(err);
    res.status(500).render('pages/error', {
      msg: 'Ha ocurrido un error en el servidor',
    });
  });
} else {
  app.use((err, req, res, next) => {
    if (req.headersSent) return next(err);
    console.dir(err);
    res.status(500).render('pages/error', {
      msg: req.flash('msg') || 'Ha ocurrido un error en el servidor',
      err: err,
    });
  });
}

module.exports = app;
