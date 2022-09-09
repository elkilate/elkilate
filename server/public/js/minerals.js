document.addEventListener('DOMContentLoaded', async () => {

  /* Update mineral rates */
  /* const updateRatesBtn = document.getElementById('updateRatesBtn');

  updateRatesBtn.addEventListener('click', async () => {
    try {
      let svRes = await (await fetch('/admin/minerals/update', {
        method: 'POST',
        body: JSON.stringify({ body: 'body' })
      })).json();

      if (svRes.statusTxt !== 'RATES_UPDATED') return alert(`No se han podido actualizar los precios`);
      console.log(svRes)
      location.reload();
    } catch (err) {
      console.error(err);
      alert('Ha ocurrido un error de conexion. Intente de nuevo mas tarde.')
    }
  }) */
});
