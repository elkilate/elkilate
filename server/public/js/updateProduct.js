document.addEventListener('DOMContentLoaded', async e => {
  async function handleImageClick(imgDisplay, imgElem, toggleModalBtn) {
    const params = arguments;
    return async function deleteImageHandler(e) {
      const imgName = this.alt;
      const typeCode = document.getElementById('productType').value;
      const productModel = document.getElementById('productModel').value;
      try {
        const svRes = await (await fetch('/admin/delete-image', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: imgName, model: `${typeCode}-${productModel}` })
        })).json();

        if (svRes.status === 'ERRDEL') {
          console.log(svRes.err);
          return alert(`Ha ocurrido un error en el servidor.\nCODE: ${svRes.status}`);
        }

        console.log(svRes.status);

        switch (svRes.status) {
          case 'IMAGE_DELETED':
            return handleImageRemoveSuccess(params, imgName, imgDisplay, svRes);
          case 'IMAGE_SHARED':
            return handleImageRemoveSuccess(params, imgName, imgDisplay, svRes);
          case 'NO_FILE' || 'ERROR_ON_DELETE':
            console.log(svRes.err);
            return alert(`Ha ocurrido un error en el servidor.\nERRCODE: ${svRes.status}`);
          default:
            console.log(svRes.err);
            return alert(`Ha ocurrido un error en el servidor.\nERRCODE: ${svRes.status}`);
        }

      } catch (err) {
        console.log(err);
        return alert('Ha ocurrido un error intentando conectarse al servido\nRevise su conexion a internet.');
      }
    }
  };

  function handleImageRemoveSuccess(params, imgName, imgDisplay) {
    const mainSelect = document.getElementById('mainImage');
    const thumbSelect = document.getElementById('thumbImage');
    let mainOpt, thumbOpt;

    for (let opt of mainSelect.options) {
      if (opt.innerHTML === imgName) {
        mainOpt = opt;
      }
    }

    for (let opt of thumbSelect.options) {
      if (opt.innerHTML === imgName) {
        thumbOpt = opt;
      }
    }

    params[0].removeChild(params[1]);
    mainSelect.removeChild(mainOpt);
    thumbSelect.removeChild(thumbOpt);

    if (imgDisplay.children.length === 1) {
      params[2].hidden = false;
    }

    productToAdd.productGallery = productToAdd.productGallery.filter(img => {
      let imgN = img.split('/');
      imgN = imgN[imgN.length - 1];
      console.log(imgN, imgName)
      return imgN !== imgName;
    });
    console.log(productToAdd.productGallery);
  };
});
