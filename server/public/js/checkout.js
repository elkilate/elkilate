import {
  printModal,
  displayFormErrors,
  handleFetchErrors,
  priceToString,
} from './Helpers.js';

document.addEventListener('DOMContentLoaded', async () => {
  const { pk } = await (await fetch('/api/get-stripe-pk')).json();
  const stripe = Stripe(pk);
  let isShipmentFree = false;

  /* Shipment selection */
  const cpInput = document.getElementById('postalCode');
  const subtotalTag = document.getElementById('subTotal');
  const shipFee = document.getElementById('shipfee-tag');
  const totalTag = document.getElementById('total');
  const discount = +document.getElementById('discount').dataset['value'];

  let finalTotal = +subtotalTag.dataset.value - discount;

  totalTag.textContent = `$ ${priceToString(finalTotal)}`;

  cpInput.addEventListener('input', function (e) {
    const value = +this.value;
    const pickPurchaseChk = document.getElementById('pickUp');
    const shipTimeTag = document.getElementById('ship-time');
    const shipfeeTag = document.getElementById('shipmentfee');

    const subtotalValue = +subtotalTag.dataset.value;
    const shipFeeValue = +shipFee.dataset.value;

    if (value >= 34000 && value <= 34299) {
      isShipmentFree = false;
      totalTag.textContent = `$ ${priceToString(subtotalValue - discount)}`;
      pickPurchaseChk.disabled = false;

      shipTimeTag.parentElement.hidden = true;
      shipfeeTag.classList.add('hidden');
    } else {
      isShipmentFree = true;
      totalTag.textContent = `$ ${priceToString(
        subtotalValue + shipFeeValue - discount
      )}`;
      pickPurchaseChk.disabled = true;

      shipTimeTag.parentElement.hidden = false;
      shipfeeTag.classList.remove('hidden');
    }
  });

  /* Invoicing toggling */
  const invoicingChk = document.getElementById('invoice');
  const invoicingForm = document.getElementById('invoice-form');

  invoicingChk.addEventListener('input', function (e) {
    const value = this.checked;

    if (value) {
      invoicingForm.classList.remove('hidden');
      invoicingForm.querySelectorAll('.form__control').forEach((inp) => {
        inp.required = true;
      });
    } else {
      invoicingForm.classList.add('hidden');
      invoicingForm.querySelectorAll('.form__control').forEach((inp) => {
        inp.removeAttribute('required');
      });
    }
  });

  const checkoutForm = document.forms['checkoutForm'];
  let saleId = '';
  let wasSaleCreated = false;

  /* Customer information & initialization of the Sale Intent */
  checkoutForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!this.querySelector('#acceptAgreement').checkValidity())
      return alert('Debes aceptar los terminos y condiciones para continuar.');
    if (!this.checkValidity()) return displayFormErrors(this);

    const formInputs = this.querySelectorAll('.form__control');
    let newSaleBody = {};

    formInputs.forEach((inp) => {
      if (!inp.value || inp.value.length <= 0) return;

      let name = inp.name,
        value = inp.value;

      if (inp.type === 'checkbox') value = inp.checked;

      newSaleBody[name] = value;
    });

    newSaleBody = {
      ...newSaleBody,
      shipment: isShipmentFree,
    };

    const response = await (
      await fetch('/api/sale/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSaleBody),
      })
    ).json();

    if (response.statusTxt !== 'OK') return handleFetchErrors(response);
    else {
      this.classList.add('hidden');
      wasSaleCreated = true;
      saleId = response.saleId;
      document.querySelectorAll('.item__del').forEach((btn) => {
        btn.hidden = true;
      });

      return document.querySelector('#payMethod').classList.remove('hidden');
    }
  });

  /* Stripe Payment */
  const sElements = stripe.elements();

  const createStripePaymentIntent = async () => {
    return await (
      await fetch('/api/payment-intents/stripe', {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ saleId: saleId }),
      })
    ).json();
  };

  const payWithCard = (stripe, card, clientSecret) => {
    loading(true);

    stripe
      .confirmCardPayment(clientSecret, {
        payment_method: {
          card,
        },
      })
      .then(async (res) => {
        if (res.error) return showError(res.error.message);

        console.log(res);
        await finalizeSale(res.paymentIntent.id);
      });
  };

  const initStripeElements = (data) => {
    const style = {
      base: {
        color: '#32325d',
        fontFamily: 'Arial, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#32325d',
        },
      },
      invalid: {
        fontFamily: 'Arial, sans-serif',
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    };

    const cardElmt = sElements.create('card', { style });
    cardElmt.mount('#card-element');
    cardElmt.on('change', (e) => {
      document.querySelector('.stripePay').disabled = e.empty;
      document.querySelector('#card-error').textContent = e.error
        ? e.error.message
        : '';
    });

    const stripePaymentForm = document.getElementById('payment-form');
    stripePaymentForm.addEventListener('submit', function (e) {
      e.preventDefault();

      payWithCard(stripe, cardElmt, data.clientSecret);
    });
  };

  const finalizeSale = async function (paymentIntentId) {
    loading(false);

    const response = await (
      await fetch('/api/sale/finish/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intentId: paymentIntentId, saleId: saleId }),
      })
    ).json();

    window.removeEventListener('beforeunload', handleUserLeave);

    if (response.status !== 'OK') return handleFetchErrors(response);

    const popup = document.getElementById('confirmation-popup');

    popup.querySelector('#total').textContent = `$${priceToString(
      response.total
    )}`;

    const redirectLink = `/carrito/pago/realizado?saleId=${saleId}`;

    popup.querySelector('.popup__link').setAttribute('href', redirectLink);

    popup.classList.add('show');

    setTimeout(() => {
      window.location.assign(redirectLink);
    }, 5000);
  };

  const showError = function (msg) {
    loading(false);
    const errTag = document.querySelector('#card-error');
    errTag.textContent = msg;
    setTimeout(() => {
      errTag.textContent = '';
    }, 4500);
  };

  /* Spinner display on payment form submit */
  const loading = (isLoading = true) => {
    if (isLoading) {
      document.querySelector('.stripePay').disabled = true;
      document.querySelector('#spinner').classList.remove('hidden');
      document.querySelector('#button-text').classList.add('hidden');
    } else {
      document.querySelector('.stripePay').disabled = false;
      document.querySelector('#spinner').classList.add('hidden');
      document.querySelector('#button-text').classList.remove('hidden');
    }
  };

  /* Paypal Functionality */
  const paypalPaymentForm = document.getElementById('paypalMethod');

  paypalPaymentForm.addEventListener('submit', function (e) {
    this['saleId'].value = saleId;

    window.removeEventListener('beforeunload', handleUserLeave);
  });
  /* Paypal Functionality END */

  /* Payment method selection */
  const payMethodSelect = document.getElementById('payMethod');

  payMethodSelect.addEventListener('change', async function (e) {
    const opt = this.value === 'null' ? null : this.value;
    const paymentForm = document.getElementById('payment-form');
    const paypalWrapper = document.getElementById('paypalMethod');

    switch (opt) {
      case 'paypal':
        paymentForm.classList.remove('selected');
        paypalWrapper.classList.add('selected');
        break;
      case 'card':
        initStripeElements(await createStripePaymentIntent());
        paypalWrapper.classList.remove('selected');
        paymentForm.classList.add('selected');
        break;
      default:
        paypalWrapper.classList.remove('selected');
        paymentForm.classList.remove('selected');
    }
  });

  /* Remove item */
  const removeBtns = document.querySelectorAll('.item__del');
  removeBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const itemId = btn.dataset['itemId'];

      const res = await (
        await fetch(`/api/remove-from-cart?itemId=${itemId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      ).json();

      if (res.status === 'OK') {
        console.log(res);
        printModal({
          msg: 'El articulo se elimino del carrito.',
          title: 'Pago',
          item: res.item,
          count: res.count,
          modalType: 'CART_ACTION',
          acceptText: 'Aceptar',
        });
        subtotalTag.dataset.value = res.cart.subtotal;
        subtotalTag.textContent = `$ ${priceToString(res.cart.subtotal)}`;

        shipFee.dataset.value = res.cart.shipfee;
        shipFee.textContent = `$ ${priceToString(res.cart.shipfee)}`;

        const discountTag = document.getElementById('discount');
        discountTag.dataset.value = res.cart.discount;
        discountTag.textContent = `-$ ${priceToString(res.cart.discount)}`;

        totalTag.dataset.value = res.cart.total;
        totalTag.textContent = `$ ${
          isShipmentFree
            ? priceToString(res.cart.subtotal - res.cart.discount)
            : priceToString(
                res.cart.subtotal + res.cart.shipfee - res.cart.discount
              )
        }`;
        document
          .querySelector('.ch-summary__body')
          .removeChild(btn.parentElement);
      } else {
        handleFetchErrors(res);
      }
    });
  });

  /* Sale deletion on user leaving page after sale initialized */
  const handleUserLeave = async (e) => {
    if (!wasSaleCreated) return;

    await fetch(`/api/sale?id=${saleId}`, { method: 'DELETE' });
  };

  window.addEventListener('beforeunload', handleUserLeave);
});
