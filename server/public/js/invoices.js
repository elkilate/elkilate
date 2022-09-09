document.addEventListener('DOMContentLoaded', async () => {
  /* Invoice card */
  const invoice_cards = document.querySelectorAll('.invoice-card');

  invoice_cards.forEach((card) => {
    card.addEventListener('click', function (e) {
      e.preventDefault();

      const id = this.dataset['id'];

      location.assign(`/admin/invoice/${id}`);
    });
  });
});
