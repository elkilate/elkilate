document.addEventListener('DOMContentLoaded', async () => {
  /* Radio button deselect */
  const nonExactBtns = document.getElementsByName('nonExact');

  nonExactBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      const wasChecked = this.dataset['wasChecked'];
      // console.log(wasChecked);

      if (wasChecked === 'true') {
        this.checked = false;
      }

      this.dataset['wasChecked'] = this.checked;
    })
  })
});
