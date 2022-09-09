document.addEventListener('DOMContentLoaded', () => {
  const mapDisplay = document.getElementById('map-display');
  const branchCards = document.querySelectorAll('.suc__branch');

  branchCards.forEach((card) => {
    card.addEventListener('click', function () {
      const mapSrc = this.dataset['mapSrc'];

      mapDisplay.src = mapSrc;
    });
  });
});
