document.addEventListener('DOMContentLoaded', async () => {
  const loadMoreBtn = document.getElementById('loadMore');
  let fetchSkip = 10;
  let limit = 10;

  loadMoreBtn.addEventListener('click', async () => {
    const productContainer = document.getElementById('productListContainer');
    const nomoreTag = document.getElementById('nomoreTag');

    const svRes = await (await fetch(`/admin/models/fetch?skip=${fetchSkip}&limit=${limit}`, {
      method: 'GET'
    })).json();

    switch (svRes.statusTxt) {
      case 'FOUND':
        fetchSkip += 10;
        console.log(svRes.models);
        break;
      case 'NO_MORE_MODELS':
        console.log('No more models to fetch')
        nomoreTag.classList.add('show');
        break;
      case 'SV_ERR':
        break;
      default:
        break;
    }

  });
});

function modelToHTML(model) {
  return(
  `
  <li class=
  `);
}
