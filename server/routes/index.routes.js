const Router = require('express').Router();

const {
  renderIndex,
  renderGold,
  renderStore,
  renderSingle,
  renderMinery,
  renderCart,
  renderCheckout,
  renderPaymentSuccess,
  renderPaymentCancelled,
  renderSignUp,
  renderSignIn,
  signIn,
  renderSearch,
  renderTerms,
  renderPrivacy,
  renderSuccs,
  renderNewComment,
  renderComments,
} = require('../controllers/index.controller');

Router.get('/', renderIndex);

// Desactivada por petición del cliente
// Router.get('/oro', renderGold);

// Desactivada por petición del cliente
// Router.get('/mineria', renderMinery);

Router.get('/joyeria', renderStore);

Router.get('/articulo/:id', renderSingle);

Router.get('/buscar', renderSearch);

Router.get('/carrito', renderCart);

Router.get('/carrito/pago', renderCheckout);

Router.get('/carrito/pago/realizado', renderPaymentSuccess);

Router.get('/carrito/pago/cancelado', renderPaymentCancelled);

Router.get(['/comentarios', '/comentarios/:p'], renderComments);

Router.get('/comentarios/nuevo/:id', renderNewComment);

Router.get('/terminos', renderTerms);

Router.get('/aviso-privacidad', renderPrivacy);

Router.get('/sucursales', renderSuccs);

Router.get('/iniciar-sesion', renderSignIn);

Router.get('/salir', (req, res, next) => {
  req.logOut();
  res.redirect('/');
});

Router.post('/iniciar-sesion', signIn);

module.exports = Router;
