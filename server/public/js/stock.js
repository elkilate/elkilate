document.addEventListener('DOMContentLoaded', async () => {

  /* Product fetch per model */
  const modelElements = document.querySelectorAll('.model');
  const productContainer = document.getElementById('productContainer');

  modelElements.forEach(element => {
    const code = element.dataset['code'];
    element.addEventListener('click', async function (e) {
      const noSelectionTag = document.querySelector('.noSelection');
      if (noSelectionTag) noSelectionTag.hidden = true;
      const modelTag = document.getElementById('modelTag');
      modelTag.innerHTML = code;

      const svRes = await (await fetch(`/admin/products/fetch?code=${code}`)).json();

      const html = svRes.products.reduce((acc, product) => acc + productToHTML(product), '');

      productContainer.innerHTML = html;
    });
  });

  /* Stock selector tab click handler */
  const stockSelectors = document.querySelectorAll('.stk-selector');
  const stockDisplays = document.querySelectorAll('.stk-display');

  stockSelectors.forEach(function(selector) {
    selector.addEventListener('click', function(e) {
      e.preventDefault();
      const targetStock = this.dataset['targetStock'];
      const targetDisplay = document.querySelector(`[data-stock="${targetStock}"]`);
      const activeSelector = document.querySelector('.stk-selector.active');
      const activeDisplay = document.querySelector('.stk-display.active');

      activeDisplay.classList.remove('active');
      activeSelector.classList.remove('active');
      targetDisplay.classList.add('active');
      this.classList.add('active');
    });
  });
});

function productToHTML(product) {
  return `
  <div class="stkStock__product mb-3 product">
    <a href="/admin/product/edit/${product._id}" class="code">${product.itemCode}</a>
    <div class="qty"><div class="title">Cantidad:</div> ${product.count}</div>
    <div class="wg"><div class="title">Peso:</div> ${product.weight}gr</div>
    <div class="sz"><div class="title">Longitud:</div> ${product.size}cm</div>
    <div class="available">${product.available ? 'Disponible' : 'No disponible'}</div>
  </div>
  `;
}
