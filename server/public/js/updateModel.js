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
    galleryTitle.value = this.value + '-' + modelCode;
  });

  modelCode.addEventListener('input', function (e) {
    galleryTitle.value = typeCode.value + '-' + this.value;
  });

  /* 
    Get initial values for modelGallery
    add click event listener for image deletion
  */
  const uploadImagesForm = document.getElementById('uploadImagesForm');
  const imageDisplay = document.getElementById('imageDisplay');
  const thumbImageSelect = document.getElementById('thumbImage');
  const mainImageSelect = document.getElementById('mainImage');
  const toggleModalBtn = document.getElementById('toggleModal');
  const galleryInput = document.getElementById('gallery');
  const galleryString = document.getElementById('galleryString');
  const galleryData = new FormData();
  const imgElements = document.querySelectorAll('.gallery__img');

  imgElements.forEach(async (img) => {
    img.addEventListener(
      'click',
      await handleImageClick(
        imageDisplay,
        mainImageSelect,
        thumbImageSelect,
        toggleModalBtn
      )
    );
    let imgName = img.src.split('/');
    productToAdd.modelGallery.push(imgName[imgName.length - 1]);
  });

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
          alt: svRes.names[i],
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
            toggleModalBtn,
            mainImageSelect,
            optElem,
            thumbImageSelect
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

      galleryString.value = productToAdd.modelGallery.reduce(
        (acc, path, i, arr) => {
          if (i + 1 === arr.length) {
            return acc + path;
          }
          return acc + path + '%%%';
        },
        ''
      );
    } catch (err) {
      console.log(err);
      return alert(err);
    }
  });

  /* Handle image element click (Removes image element and deletes file from server) */
  async function handleImageClick(imgDisplay, imgElem, toggleModalBtn) {
    const params = arguments;
    return async function deleteImageHandler(e) {
      const confirmed = confirm('¿Desea eliminar realmente la imagen?');

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

        switch (svRes.status) {
          case 'IMAGE_DELETED':
            return handleImageRemoveSuccess(params, imgName, imgDisplay, svRes);
          case 'IMAGE_SHARED':
            return handleImageRemoveSuccess(params, imgName, imgDisplay, svRes);
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

  function appendOptionToSelect(target, opt) {
    target.appendChild(opt);
  }

  function handleImageRemoveSuccess(params, imgName, imgDisplay) {
    const mainSelect = document.getElementById('mainImage');
    const thumbSelect = document.getElementById('thumbImage');
    const imgElement = document.querySelector(`[alt="${imgName}"]`);
    const galleryInput = document.getElementById('galleryString');
    let mainOpt, thumbOpt, firstMainOption, firstThumbOption;
    let gallery = galleryInput.value.split('%%%');

    gallery = gallery.filter((path) => path !== imgName);

    galleryInput.value = gallery.reduce((acc, path, i) => {
      if (i + 1 === gallery.length) {
        return acc + path;
      }
      return acc + path + '%%%';
    }, '');

    mainOpt = Array(...mainSelect.options).find((opt) => {
      if (opt.dataset['first']) return false;

      return opt.value === imgName;
    });

    thumbOpt = Array(...thumbSelect.options).find((opt) => {
      if (opt.dataset['first']) return false;

      return opt.value === imgName;
    });

    if (mainSelect.options[0].dataset['first']) {
      firstMainOption = mainSelect.options[0];
    }

    if (thumbSelect.options[0].dataset['first']) {
      firstThumbOption = thumbSelect.options[0];
    }

    imgElement.remove();

    if (firstMainOption?.value === mainOpt.value) {
      mainSelect.removeChild(firstMainOption);
      mainSelect.removeChild(mainOpt);
    } else {
      mainSelect.removeChild(mainOpt);
    }

    if (firstThumbOption?.value === thumbOpt.value) {
      thumbSelect.removeChild(firstThumbOption);
      thumbSelect.removeChild(thumbOpt);
    } else {
      thumbSelect.removeChild(thumbOpt);
    }

    if (imgDisplay.children.length === 1) {
      params[3].hidden = false;
    }

    productToAdd.modelGallery = productToAdd.modelGallery.filter((img) => {
      let imgN = img.split('/');
      imgN = imgN[imgN.length - 1];
      // console.log(imgN, imgName)
      return imgN !== imgName;
    });
  }
});
