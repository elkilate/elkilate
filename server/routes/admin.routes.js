const Router = require('express').Router();
const passport = require('passport');
const path = require('path');
const multer = require('multer');

const {
  renderAdmin,
  renderSignin,
  renderSignup,
  renderProducts,
  renderMinerals,
  renderAddProduct,
  addProductType,
  uploadImages,
  deleteImage,
  addProduct,
  updateProduct,
  renderUpdateProduct,
  renderRemoveProduct,
  removeProduct,
  addProductBulk,
  uploadImageBulk,
  createAdmin,
  addModelBulk,
  renderSetGoldPrice,
  renderSetSilverPrice,
  setGoldPrice,
  setSilverPrice,
  renderStock,
  updateMonth,
  updateWeek,
  renderAddModel,
  renderModels,
  addModel,
  renderRemoveModel,
  renderSearchModel,
  renderUpdateModel,
  renderSale,
  renderSales,
  renderSearchSale,
  renderRemoveSale,
  renderSearchSaleByDate,
  renderAddCurrency,
  addCurrency,
  renderSearchProduct,
  removeModel,
  updateModel,
  updateMineralRates,
  fetchModels,
  updateCurrency,
  removeCurrency,
  fetchProducts,
  saleDelivered,
  saleRefunded,
  saleRemove,
  renderRemoveAllModels,
  removeAllModels,
  renderAddProductType,
  renderProductTypes,
  renderUpdateProductType,
  renderRemoveProductType,
  updateProductType,
  removeProductType,
  setGoldKaratPrice,
  renderAddUniqueModel,
  addUniqueModel,
  renderUpdateUniqueModel,
  renderRemoveUniqueModel,
  renderSearchUniqueModel,
  updateUniqueModel,
  removeUniqueModel,
  renderAddUniqueProduct,
  renderUpdateUniqueProduct,
  renderRemoveUniqueProduct,
  renderSearchUniqueProduct,
  addUniqueProduct,
  updateUniqueProduct,
  removeUniqueProduct,
  renderAllModels,
  renderShippingFees,
  createShippingFee,
  renderInvoices,
  renderInvoice,
  invoiceDelivered,
  renderComments,
  approveComment,
  rejectComment,
  removeComment,
  sendCommentMail,
  updateAdmin,
} = require('../controllers/admin.controller');
const { updateMetalRates } = require('../middlewares/helpers');

// Multer Storage Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // path.join(__dirname, '..', 'public', 'img', 'products')
    const publicDir = req.app.get('publicDir');
    cb(null, path.join(publicDir, 'img', 'products'));
  },
  filename: (req, file, cb) => {
    const fileName = path.basename(
      file.originalname,
      path.extname(file.originalname)
    );
    cb(null, fileName.split(' ').join('-') + `-${Date.now()}` + '.JPG');
  },
});
const bulkStorage = multer.memoryStorage();

const upload = multer({
  storage /* limits: { files: 5, fileSize: 500000000, fieldSize: 5000000 } */,
});
const bulkImgUpload = multer({ storage: storage });
const bulkProductUpload = multer({ storage: bulkStorage });

const bulkUpload = multer({ storage: multer.memoryStorage() });

/* Render Routes */
// Index
Router.get('/', renderAdmin);

// Stock
Router.get('/stock', renderStock);

// Stock (Sales)
Router.get('/sales', renderSales);

Router.get('/sale/search', renderSearchSale);

Router.get('/sale/search-date', renderSearchSaleByDate);

Router.get('/sale/:id', renderSale);

// Stock (Models)
Router.get('/models', renderModels);

Router.get('/models/all', renderAllModels);

Router.get('/models/remove-all', renderRemoveAllModels);

Router.get('/model/add', renderAddModel);

Router.get(['/model/edit/:id', '/model/edit'], renderUpdateModel);

Router.get(['/model/remove/:id', '/model/remove'], renderRemoveModel);

Router.get('/model/search', renderSearchModel);

// Stock (Products)
Router.get('/products', renderProducts);

Router.get('/product/types', renderProductTypes);

Router.get('/product/type/add', renderAddProductType);

Router.get('/product/type/edit/:id', renderUpdateProductType);

Router.get('/product/type/remove/:id', renderRemoveProductType);

Router.get('/product/add', renderAddProduct);

Router.get(['/product/edit/:id', '/product/edit'], renderUpdateProduct);

Router.get(['/product/delete/:id', '/product/delete'], renderRemoveProduct);

Router.get('/product/search', renderSearchProduct);

// Stock (Uniques Models)
Router.get('/models/unique');

Router.get('/model/unique/add', renderAddUniqueModel);

Router.get(
  ['/model/unique/edit', '/model/unique/edit/:id'],
  renderUpdateUniqueModel
);

Router.get(
  ['/model/unique/remove', '/model/unique/remove/:id'],
  renderRemoveUniqueModel
);

Router.get('/model/unique/search', renderSearchUniqueModel);

// Stock (Unique Products)
Router.get('/product/unique/add', renderAddUniqueProduct);

Router.get(
  ['/product/unique/edit', '/product/unique/edit/:id'],
  renderUpdateUniqueProduct
);

Router.get(
  ['/product/unique/delete', '/product/unique/delete/:id'],
  renderRemoveUniqueProduct
);

Router.get('/product/unique/search', renderSearchUniqueProduct);

// Stock (Prices)
Router.get('/prices/set/gold', renderSetGoldPrice);

Router.get('/prices/set/silver', renderSetSilverPrice);

// Minerals & Currencies
Router.get('/minerals', renderMinerals);

Router.get('/currency/add', renderAddCurrency);

// Authentication
Router.get('/signup', renderSignup);

/* END Render Routes */

/* Stock Routes */
// Date Routes
Router.post('/date/update/week', updateWeek);

Router.post('/date/update/month', updateMonth);

// Sales Routes
Router.put('/sale/:id/delivered', saleDelivered);

Router.put('/sale/:id/refunded', saleRefunded);

Router.delete('/sale/:id/remove', saleRemove);

// Model Routes
Router.get('/models/fetch', fetchModels);

Router.delete('/models/remove-all', removeAllModels);

Router.post('/model/add', addModel);

Router.patch('/model/update/:id', updateModel);

Router.delete('/model/remove/:id', removeModel);

// Product Routes
Router.get('/products/fetch', fetchProducts);

Router.post('/product/add', addProduct);

Router.patch('/product/update/:id', updateProduct);

Router.delete('/product/delete/:id', removeProduct);

Router.post('/add-product-type', addProductType);

// Bulk upload (Not production ready)
Router.post('/add-product-bulk', bulkUpload.single('json'), addProductBulk);

Router.post('/add-model-bulk', bulkUpload.single('json'), addModelBulk);

// Unique Model Routes
Router.post('/model/unique/add', addUniqueModel);

Router.patch('/model/unique/update/:id', updateUniqueModel);

Router.delete('/model/unique/remove/:id', removeUniqueModel);

// Unique Product Routes
Router.post('/product/unique/add', addUniqueProduct);

Router.patch('/product/unique/update/:id', updateUniqueProduct);

Router.delete('/product/unique/delete/:id', removeUniqueProduct);

// Product Types Routes
Router.post('/product/type/add', addProductType);

Router.patch('/product/type/edit/:id', updateProductType);

Router.delete('/product/type/remove/:id', removeProductType);

// Image Routes
Router.post('/upload-images', upload.array('gallery'), uploadImages);

Router.post(
  '/upload-images-bulk',
  bulkImgUpload.array('imgBulk'),
  uploadImageBulk
);

Router.delete('/delete-image', deleteImage);

// Price Routes
Router.post('/prices/set/gold', setGoldPrice);

Router.patch('/prices/set/gold/:id', setGoldKaratPrice);

Router.post('/prices/set/silver', setSilverPrice);

// Invoicing Routes
Router.get('/invoices', renderInvoices);

Router.get('/invoice/:id', renderInvoice);

Router.put('/invoice/:id/delivered', invoiceDelivered);

/* Mineral & Currency Routes */
Router.post('/minerals/update-rates', updateMineralRates);

Router.post('/currency/add', addCurrency);

Router.patch('/currency/update/:id', updateCurrency);

Router.delete('/currency/remove/:id', removeCurrency);

/* Users Routes */
Router.post('/create-admin', createAdmin);

Router.put('/update-admin', updateAdmin);

// Register users
/* Router.post('/signup', passport.authenticate('local.signup', {
  successRedirect: '/admin',
  failureRedirect: '/iniciar-sesion',
  failureFlash: true
})); */

/* Fees Routes */
Router.get('/shipping-fees', renderShippingFees);

Router.post('/shipping-fee', createShippingFee);

/* Comment Management */
Router.post('/comments/mail/:id', sendCommentMail);

Router.get('/comments', renderComments);

Router.put('/comments/approve/:id', approveComment);

Router.put('/comments/reject/:id', rejectComment);

Router.delete('/comments/delete/:id', removeComment);

module.exports = Router;
