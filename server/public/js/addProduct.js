document.addEventListener('DOMContentLoaded', async () => {
  /* 
    Update itemCode field
    on parentModel selection
  */
  const parentModel = document.getElementById('parentModel');
  const itemCode = document.getElementById('itemCode');
  const modelCode = document.getElementById('modelCode');

  /* 
    On parent model selection clear itemCode field
    and uptade modelCode tag
  */
  parentModel.addEventListener('change', function (e) {
    itemCode.value = '';
    modelCode.innerHTML = `${this.selectedOptions[0].dataset['code']}-`
  });
});
