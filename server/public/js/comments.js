document.addEventListener('DOMContentLoaded', () => {
  const popup = document.getElementById('success-popup');

  popup.querySelector('#close').addEventListener('click', function () {
    popup.classList.remove('show');
  });

  if (popup.classList.contains('show')) {
    setTimeout(() => {
      popup.classList.remove('show');
    }, 5000);
  }
});
