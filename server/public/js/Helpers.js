/* Add attributes to HTML element */
export const addAttributes = (element, attrObj) => {
  for (let attr in attrObj) {
    if (attr == 'class') {
      attrObj[attr].forEach((cl) => {
        element.classList.add(cl);
      });
    } else {
      attrObj.hasOwnProperty(attr) && element.setAttribute(attr, attrObj[attr]);
    }
  }
};

/**
 *  Create a custom HTML Element
 *
 * @param {String} - The type of the element to create
 * @param {Any} - An object with the attributes to append to the element created
 * @param {String[] | Any[]} - The children to append to the element created
 *
 * @returns {HTMLElement}
 */
export const createCustomElement = (type, attributes, children) => {
  let customElement = document.createElement(type);
  if (children && children.length > 0)
    children.forEach((child) => {
      if (child.nodeType && (child.nodeType === 1 || child.nodeType === 11)) {
        customElement.appendChild(child);
      } else {
        customElement.innerHTML += child;
      }
    });
  addAttributes(customElement, attributes);
  return customElement;
};

/*
 * Constructs and prints on Screen a modal
 */
export const printModal = (props) => {
  // Assign the wrapper element to a constant for easier handling
  const wrapper = props.wrapper || document.getElementById('modalWrapper');
  // When the outside of the modal is clicked, close it
  wrapper.onclick = (e) => {
    const elementClicked = e.target;
    if (elementClicked === wrapper) {
      modalClose.click();
    }
  };

  // Create each part of the modal
  /* Header Elements */
  const modalTitle = createCustomElement('p', { class: ['h--2'] }, [
    props.title,
  ]);
  const modalClose = createCustomElement(
    'p',
    { title: 'Cerrar', class: ['close'] },
    [`&times;`]
  );
  const modalHeader = createCustomElement('div', { class: ['modal__header'] }, [
    modalTitle,
    modalClose,
  ]);

  /* Body Elements */
  const modalBody = createCustomElement('div', { class: ['modal__body'] });

  switch (props.modalType) {
    case 'CART_ACTION':
      const modalCount = createCustomElement(
        'span',
        { class: ['modal__count'] },
        [props.count]
      );
      modalTitle.appendChild(modalCount);

      const item = props.item;
      const label = createCustomElement('p', { class: ['modal__label'] }, [
        props.msg,
      ]);
      const card = createCustomElement('div', { class: ['modal__card'] });

      const thumbnail = createCustomElement('img', {
        class: ['modal__img'],
        src: item.thumbImg,
        alt: item.title,
      });
      const title = createCustomElement(
        'div',
        { class: ['modal__item-title'] },
        [item.title]
      );
      const price = createCustomElement(
        'div',
        { class: ['modal__item-price'] },
        [`$ ${priceToString(item.itemPrice || item.price)}`]
      );

      card.appendChild(thumbnail);
      card.appendChild(title);
      card.appendChild(price);

      modalBody.appendChild(label);
      modalBody.appendChild(card);
      break;
    case 'CONTACT_FORM':
      break;
    case 'NO_ENOUGH_STOCK':
      break;
    default:
      break;
  }

  /* Footer Elements */
  const modalFooter = createCustomElement('div', { class: ['modal__footer'] });

  if (props.modalType === 'CART_ACTION') {
    const acceptBtn = createCustomElement(
      'button',
      { id: 'btnAccept', class: ['modal__btn', 'modal__btn--accept'] },
      [props.acceptText || 'Continuar comprando']
    );
    const gotoBtn =
      props.goto &&
      createCustomElement(
        'button',
        {
          class: ['modal__btn', 'modal__btn--goto'],
          'data-goto': `${props.goto}`,
        },
        ['Ir al Carrito']
      );

    gotoBtn &&
      gotoBtn.addEventListener('click', function (e) {
        let goto = this.dataset['goto'];

        window.location.pathname = goto;
      });
    acceptBtn.addEventListener('click', (e) => {
      modalClose.click();
    });

    gotoBtn && modalFooter.appendChild(gotoBtn);
    modalFooter.appendChild(acceptBtn);
  }

  // Create Modal Node
  const modal = createCustomElement(
    'div',
    {
      class: ['modal'],
    },
    [modalHeader, modalBody, modalFooter]
  );

  // Append Modal to wrapper
  wrapper.appendChild(modal);

  modalClose.addEventListener('click', (e) => {
    wrapper.classList.remove('show');
    wrapper.removeChild(modal);
  });

  // Make Wrapper Visible
  wrapper.classList.add('show');
  /* wrapper.addEventListener('click', e => {
    const elementClicked = e.target;
    if (elementClicked === wrapper) {
      modalClose.click();
    }
  }); */

  return { modal, wrapper };
};

export function displayFormErrors(form) {
  for (const field of form) {
    field.oninput = checkFieldValidity;

    const errorMsgTag =
      field.type == 'checkbox'
        ? field.nextElementSibling.nextElementSibling
        : field.nextElementSibling;
    let fieldValidity = field.validity;
    if (fieldValidity.valueMissing) {
      errorMsgTag.innerHTML = 'Debes llenar este campo';
      continue;
    } else if (fieldValidity.typeMismatch) {
      switch (field.type) {
        case 'email':
          errorMsgTag.innerHTML = 'Debes ingresar un email valido';
          continue;
        default:
          errorMsgTag.innerHTML = 'Revisa este campo por favor';
          continue;
      }
    } else if (fieldValidity.badInput) {
      switch (field.type) {
        case 'number':
          errorMsgTag.innerHTML = 'Este campo solo acepta numeros';
          continue;
        default:
          errorMsgTag.innerHTML = 'Revisa este campo por favor';
          continue;
      }
    }
  }
}

export function checkFieldValidity(evt) {
  const field = evt.target;
  const errorMsgTag =
    field.type == 'checkbox'
      ? field.nextElementSibling.nextElementSibling
      : field.nextElementSibling;

  if (field.checkValidity()) return (errorMsgTag.innerHTML = '&nbsp;');
}

export function handleFetchErrors(response) {
  console.log(response.err);
  response.msg && alert(response.msg);
}

/**
 *  Add a 'Zoom on Hover' to a Slide element from
 * single product view's slider
 *
 * @param {HTMLDivElement} slideElmt - The element to which the zoom logic will be added
 */
export function zoomGalleryImage(slideElmt, lensSize = 90) {
  if (!(window.screen.width > 800)) return;

  const [img, zoomView] = slideElmt.children;

  let cx,
    cy,
    imgMx = getComputedStyle(img).marginLeft,
    imgMy = getComputedStyle(img).marginTop;

  cx = zoomView.offsetWidth / lensSize;
  cy = zoomView.offsetHeight / lensSize;

  zoomView.style.backgroundImage = `url('${img.src}')`;
  zoomView.style.backgroundSize = `${img.offsetWidth * cx}px ${
    img.offsetHeight * cy
  }px`;

  img.onmouseover = showLens;
  img.onmousemove = moveLens;
  img.onmouseout = hideLens;

  img.ontouchmove = moveLens;
  img.ontouchstart = showLens;
  img.ontouchend = hideLens;

  function moveLens(e) {
    e.preventDefault();

    const pos = getCursorPos(e);
    let x = pos.x - lensSize;
    let y = pos.y - lensSize;

    let zvLeft = x + 'px',
      zvTop = y + 'px',
      bgPosX = x * cx + lensSize,
      bgPosY = y * cy + lensSize;

    if (imgMx && imgMx !== '0px' && imgMx !== 'auto') {
      let mxValue = +imgMx.split('px')[0];
      zvLeft = x + mxValue + 'px';
    }

    if (imgMy && imgMy !== '0px' && imgMy !== 'auto') {
      let myValue = +imgMy.split('px')[0];
      zvTop = x + myValue + 'px';
    }
    /*prevent the lens from being positioned outside the image:*/
    if (x > img.width - zoomView.offsetWidth / lensSize) {
      zvLeft = img.width - zoomView.offsetWidth / lensSize;
    }
    if (x < 0) {
      zvLeft = 0;
    }
    if (y > img.height - zoomView.offsetHeight) {
      zvTop = img.height - zoomView.offsetHeight;
    }
    if (y < 0) {
      zvTop = 0;
    }

    /*set the position of the lens:*/
    zoomView.style.left = zvLeft;
    zoomView.style.top = zvTop;
    zoomView.style.backgroundPosition = `-${bgPosX}px -${bgPosY}px`;
  }

  function getCursorPos(e) {
    let a,
      x = 0,
      y = 0;
    e = e || window.event;

    /*get the x and y positions of the image:*/
    a = img.getBoundingClientRect();
    /*calculate the cursor's x and y coordinates, relative to the image:*/
    x = e.pageX - a.left;
    y = e.pageY - a.top;

    /*consider any page scrolling:*/
    x = x - window.pageXOffset;
    y = y - window.pageYOffset;

    return { x, y };
  }

  function showLens() {
    zoomView.classList.add('show');
  }

  function hideLens() {
    zoomView.classList.remove('show');
  }
}

/**
 *
 * @param {HTMLElement} img - The relative HTML element
 * @param {MouseEvent} e - The mouse event
 * @returns {{number, number}}
 */
export function getCursorRelPos(img, e) {
  let p,
    x = 0,
    y = 0;

  p = img.getBoundingClientRect();

  x = e.pageX - p.left;
  y = e.pageY - p.top;

  x = x - window.pageXOffset;
  y = y - window.pageYOffset;

  return { x, y };
}

/**
 * Makes an image zoomable
 *
 * @param {HTMLImageElement} img - The DOM element of the image to be zoom
 * @param {Number} lensSize - The size of the area to be displayed (in pixels)
 */
export function zoomStoreImage(img, lensSize = 90) {
  // Zoom display element
  const zoomView = document.createElement('div');

  zoomView.classList.add('zoomable__display');

  img.parentElement.insertBefore(zoomView, img);

  let cx = zoomView.offsetWidth / lensSize, // Ratio between area to be zoomed and the display of the zoomed img (Horizontal)
    cy = zoomView.offsetHeight / lensSize; // Ratio between area to be zoomed and the display of the zoomed img (Vertical)

  zoomView.style.backgroundImage = `url('${img.height}')`;
  zoomView.style.backgroundSize = `${img.width * cx}px ${img.height * cy}px`;

  img.onmouseenter = showZoomView(zoomView);
  img.onmousemove = moveLens(img, zoomView);
  img.onmouseleave = hideZoomView(zoomView);
}

// Make

export function zoomImages(imgSelector = '.zoomable') {
  const imgs = document.querySelectorAll(imgSelector);

  imgs.forEach((img) => {
    zoomStoreImage(img);
  });
}

/**
 *
 * @param {HTMLImageElement} img - DOM element of the image being zoomed
 * @param {HTMLDivElement} zoomView - Div element where the zoomed image will be displayed
 * @param {Number} - The size of the area being zoomed in px
 *
 * @returns An eventhandler function for the mousemove event
 */
function moveLens(img, zoomView, lensSize, cx, cy) {
  return function mousemoveHandler(e) {
    e.preventDefault();

    const pos = getCursorPos(e);
    let x = pos.x - lensSize,
      y = pos.y - lensSize;

    /*prevent the lens from being positioned outside the image:*/
    if (x > img.width - lensSize) {
      x = img.width - lensSize;
    }
    if (x < 0) {
      x = 0;
    }
    if (y > img.height - lensSize) {
      y = img.height - lensSize;
    }
    if (y < 0) {
      y = 0;
    }

    zoomView.style.left = x;
    zoomView.style.top = y;

    zoomView.style.backgroundPosition = `-${x * cx}px -${y * cy}px`;
  };
}

function showZoomView(zoomView) {
  return (e) => {
    zoomView.classList.add('show');
  };
}

function hideZoomView(zoomView) {
  return (e) => {
    zoomView.classList.remove('show');
  };
}

export function priceToString(n) {
  if (!n || +n === NaN) return 'NaN';
  const [i, d] = n.toFixed(2).split('.');

  return `${(+i).toLocaleString()}.${d}`;
}
