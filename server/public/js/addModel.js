import { createCustomElement } from './Helpers.js';
document.addEventListener('DOMContentLoaded', async function () {
  window.imgNames = [];
  const productToAdd = {
    modelGallery: [],
  };
  /* 
    Update Model and ProductCode
    fields on modelType selection
  */
  const typeSelect = document.getElementById('modelType');
  const modelCode = document.getElementById('modelCode');
  const typeCode = document.getElementById('typeCode');
  const galleryTitle = document.getElementById('galleryTitle');

  /* 
    On type selection, reset model and code fields to empty
    and modelCode to '-'
    Also assign typeCode tag the selected type code
  */
  typeSelect.addEventListener('input', function (e) {
    modelCode.value = '';
    typeCode.innerHTML = this.value + '-';
    galleryTitle.value = `${typeSelect.value}-${modelCode.value}`;
  });

  modelCode.addEventListener('input', function (e) {
    galleryTitle.value = `${typeSelect.value}-${modelCode.value}`;
  });

  /* 
    Display images selected on productImgs field
    on imageDisplay element
  */
  const uploadImagesForm = document.getElementById('uploadImagesForm');
  const imageDisplay = document.getElementById('imageDisplay');
  const thumbImageSelect = document.getElementById('thumbImage');
  const mainImageSelect = document.getElementById('mainImage');
  const toggleModalBtn = document.getElementById('toggleModal');
  const galleryInput = document.getElementById('gallery');
  const galleryData = new FormData();

  galleryInput.addEventListener('change', function (e) {
    galleryData.delete('gallery');
    for (let file of this.files) {
      galleryData.append('gallery', file);
    }
  });

  uploadImagesForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const galleryField = galleryData.getAll('gallery');

    if (galleryField < 1)
      return alert('No se puede enviar este formulario vacio.');

    try {
      const svRes = await (
        await fetch('/admin/upload-images', {
          method: 'POST',
          body: galleryData,
        })
      ).json();

      if (svRes.status !== 'OK') return console.log(svRes);
      document.getElementById('closeModal').click();

      let i = 0;
      for (let path of svRes.paths) {
        const imgElem = createCustomElement('img', {
          class: ['img-fluid', 'gallery__img'],
          src: path,
          alt: path,
        });
        const optElem = createCustomElement('option', { value: path }, [
          svRes.names[i],
        ]);
        imageDisplay.appendChild(imgElem);
        appendOptionToSelect(thumbImageSelect, optElem);
        imgNames.push(svRes.names[i]);
        productToAdd.modelGallery.push(path);
        imgElem.addEventListener(
          'click',
          await handleImageClick(
            imageDisplay,
            imgElem,
            mainImageSelect,
            optElem,
            thumbImageSelect,
            toggleModalBtn
          )
        );

        i++;
      }
      i = 0;
      for (let path of svRes.paths) {
        const optElem = createCustomElement('option', { value: path }, [
          svRes.names[i],
        ]);
        appendOptionToSelect(mainImageSelect, optElem);
        i++;
      }
      galleryData.delete('gallery');
      this.reset();
    } catch (err) {
      console.log(err);
      return alert(err);
    }

    async function handleImageClick(imgDisplay, imgElem, toggleModalBtn) {
      const params = arguments;
      return async function deleteImageHandler(e) {
        const confirmed = confirm('¿Realmente desea eliminar la imagen?');

        if (!confirmed) return;

        const imgName = this.alt;
        const typeCode = document.getElementById('modelType').value;
        const modelCode = document.getElementById('modelCode').value;
        try {
          const svRes = await (
            await fetch('/admin/delete-image', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: imgName,
                model: `${typeCode}-${modelCode}`,
              }),
            })
          ).json();

          if (svRes.status === 'ERRDEL') {
            console.log(svRes.err);
            return alert(
              `Ha ocurrido un error en el servidor.\nCODE: ${svRes.status}`
            );
          }

          switch (svRes.status) {
            case 'IMAGE_DELETED':
            case 'IMAGE_SHARED':
              return handleImageRemoveSuccess(
                params,
                imgName,
                imgDisplay,
                svRes
              );
            case 'ERROR_ON_DELETE':
              console.log(svRes.err);
              if (svRes.err.code === 'ENOENT') {
                handleImageRemoveSuccess(params, imgName, imgDisplay, svRes);
                return alert(`La imagen ya no se encuentra en el servidor.`);
              }
              return alert(
                `Ha ocurrido un error en el servidor.\nERRCODE: ${svRes.status}`
              );
            case 'NO_FILE':
              if (svRes.err.code === 'ENOENT') {
                handleImageRemoveSuccess(params, imgName, imgDisplay, svRes);
                return alert(`La imagen ya no se encuentra en el servidor.`);
              }
              return alert(
                `Ha ocurrido un error en el servidor.\nERRCODE: ${svRes.status}`
              );
            default:
              console.log(svRes.err);
              return alert(
                `Ha ocurrido un error en el servidor.\nERRCODE: ${svRes.status}`
              );
          }
        } catch (err) {
          console.log(err);
          return alert(
            'Ha ocurrido un error intentando conectarse al servidor.\nRevise su conexion a internet.'
          );
        }
      };
    }
  });

  function appendOptionToSelect(target, opt) {
    target.appendChild(opt);
  }

  function handleImageRemoveSuccess(params, imgName, imgDisplay) {
    const mainSelect = document.getElementById('mainImage');
    const thumbSelect = document.getElementById('thumbImage');
    const imgElement = document.querySelector(`[alt="${imgName}"]`);
    let mainOpt, thumbOpt;

    console.log(productToAdd.modelGallery);

    for (let opt of mainSelect.options) {
      if (opt.value === imgName) {
        mainOpt = opt;
      }
    }

    for (let opt of thumbSelect.options) {
      if (opt.value === imgName) {
        thumbOpt = opt;
      }
    }

    // params[0].removeChild(params[1]);
    imgElement.remove();
    mainSelect.removeChild(mainOpt);
    thumbSelect.removeChild(thumbOpt);

    productToAdd.modelGallery = productToAdd.modelGallery.filter((img) => {
      let imgN = img.split('/');
      imgN = imgN[imgN.length - 1];

      return imgN !== imgName;
    });
  }

  /* 
    Handle addModelForm submit
  */
  const addModelForm = document.getElementById('addModelForm');

  addModelForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    for (let elem of this.elements) {
      if (elem.type === 'checkbox') {
        productToAdd[elem.id] = elem.checked;
        continue;
      }
      productToAdd[elem.id] = elem.value;
    }

    try {
      const svRes = await (
        await fetch('/admin/model/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productToAdd),
        })
      ).json();

      if (svRes.err) {
        console.log(svRes.err);
        return alert('Ha ocurrido un error en el servidor');
      }

      if (svRes.statusTxt === 'PRODUCT_ADDED') {
        return (window.location.pathname = '/admin/models');
      } else {
        console.log(svRes);
        return alert(`No se ha podido agregar el producto.\n${svRes.msg}`);
      }
    } catch (err) {
      console.log(err);
    }
  });
});
