let rateOunce = (+document.getElementById('priceBox').dataset['rateOunce']).toFixed(2);
let rateGram = (+document.getElementById('priceBox').dataset['rateGram']).toFixed(2);
let rateKilo = (+document.getElementById('priceBox').dataset['rateKilo']).toFixed(2);
let rateUSD = (+document.getElementById('priceBox').dataset['rateUsd']).toFixed(2);

let currentCurrency = 'MXN';
let currentWeightUnit = 'oz';

const buyBlock = document.getElementById('buyRate');
const sellBlock = document.getElementById('sellRate');

buyBlock.innerHTML = "$ " + (+rateGram).toLocaleString();
sellBlock.innerHTML = "$ " + (+(rateGram * .7).toFixed(2)).toLocaleString();

const currencySelect = document.getElementById('currencySelect');
const weightUnitSelect = document.getElementById('weightUnitSelect');


const handleSelectChange = (e) => {
  currentWeightUnit = weightUnitSelect.value;
  currentCurrency = currencySelect.value;

  switch (currentWeightUnit) {
    case 'oz':
      if (currentCurrency === 'USD') {
        buyBlock.innerHTML = "$ " + (+(rateOunce * rateUSD).toFixed(2)).toLocaleString();
        sellBlock.innerHTML = "$ " + (+(rateOunce * rateUSD * .7).toFixed(2)).toLocaleString();
      } else {
        buyBlock.innerHTML = "$ " + (+rateOunce).toLocaleString();
        sellBlock.innerHTML = "$ " + (+(rateOunce * .7).toFixed(2)).toLocaleString();
      }
      break;
    case 'g':
      if (currentCurrency === 'USD') {
        buyBlock.innerHTML = "$ " + (+(rateGram * rateUSD).toFixed(2)).toLocaleString();
        sellBlock.innerHTML = "$ " + (+(rateGram * rateUSD * .7).toFixed(2)).toLocaleString();
      } else {
        buyBlock.innerHTML = "$ " + (+rateGram).toLocaleString();
        sellBlock.innerHTML = "$ " + (+(rateGram * .7).toFixed(2)).toLocaleString();
      }
      break;
    case 'kg':
      if (currentCurrency === 'USD') {
        buyBlock.innerHTML = "$ " + (+(rateKilo * rateUSD).toFixed(2)).toLocaleString();
        sellBlock.innerHTML = "$ " + (+(rateKilo * rateUSD * .7).toFixed(2)).toLocaleString();
      } else {
        buyBlock.innerHTML = "$ " + (+rateKilo).toLocaleString();
        sellBlock.innerHTML = "$ " + (+(rateKilo * .7).toFixed(2)).toLocaleString();
      }
      break;
    default:
      return;
  }
}

currencySelect.addEventListener('change', handleSelectChange);

weightUnitSelect.addEventListener('change', handleSelectChange);

/* Funcionalidad del cotizador */


/* Toast Functionality */
const toastElement = document.querySelector('.toast');
const dismissToastBtn = toastElement.querySelector('.toast__dismiss');

dismissToastBtn.addEventListener('click', function(e) {
  console.log('clicked');

  toastElement.classList.remove('visible');
  toastElement.addEventListener('transitionend', function(e) {
    this.remove();
  })
});
