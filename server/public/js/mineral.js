const prevControl = document.querySelector('.selector__control--l');
const nextControl = document.querySelector('.selector__control--r');

const mineralNames = document.querySelectorAll('.selector__name');
const mineralTables = document.querySelectorAll('.price__table');

const setRates = (code, buyRate) => {
  let currentBuyBlock = document.getElementById(`${code}_buy`);
  currentBuyBlock.innerHTML = `$ ${(+buyRate).toLocaleString()} MXN`;
};

let currentMetal = 0;
let nextMetal = 1;
let prevMetal = -1;

mineralNames[currentMetal].classList.add('active');
mineralTables[currentMetal].classList.add('active');

mineralTables.forEach((table) => {
  let currentCurrency = table.id;
  let unitSelect = document.getElementById(`${currentCurrency}_select`);
  let buyRate = (+table.dataset['ratePerGram']).toFixed(2);

  setRates(currentCurrency, buyRate);

  unitSelect.addEventListener('change', (e) => {
    const select = e.target;
    const unit = select.value;
    let buyRate;
    switch (unit) {
      case 'oz':
        buyRate = (+table.dataset['ratePerOunce']).toFixed(2);
        break;
      case 'gr':
        buyRate = (+table.dataset['ratePerGram']).toFixed(2);
        break;
      case 'kg':
        buyRate = (+table.dataset['ratePerKilo']).toFixed(2);
        break;
      default:
        break;
    }

    setRates(currentCurrency, buyRate);
  });
});

prevControl.addEventListener('click', (e) => {
  if (prevMetal == -1) {
    return;
  }

  mineralNames[currentMetal].classList.remove('active');
  mineralNames[prevMetal].classList.add('active');

  mineralTables[currentMetal].classList.remove('active');
  mineralTables[prevMetal].classList.add('active');

  currentMetal = prevMetal;
  prevMetal--;
  nextMetal--;
});

nextControl.addEventListener('click', (e) => {
  if (nextMetal == mineralNames.length) {
    return;
  }

  mineralNames[currentMetal].classList.remove('active');
  mineralNames[nextMetal].classList.add('active');

  mineralTables[currentMetal].classList.remove('active');
  mineralTables[nextMetal].classList.add('active');

  currentMetal = nextMetal;
  prevMetal++;
  nextMetal++;
});

/* Toast Functionality */
const toastElement = document.querySelector('.toast');
const dismissToastBtn = toastElement.querySelector('.toast__dismiss');

if (toastElement) {
  toastElement.classList.add('visible');
}

dismissToastBtn.addEventListener('click', function (e) {
  console.log('clicked');

  toastElement.classList.remove('visible');
  toastElement.addEventListener('transitionend', function (e) {
    this.remove();
  });
});
