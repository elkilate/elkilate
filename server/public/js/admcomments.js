document.addEventListener('DOMContentLoaded', async () => {
  const comments = document.querySelectorAll('.comment');
  const commentBlocks = document.querySelectorAll('.comment-content');

  comments.forEach((comment) => {
    comment.addEventListener('click', function (e) {
      const commentBlock = this.children[1];

      commentBlock.classList.add('show');
    });
  });

  commentBlocks.forEach((block) => {
    block.addEventListener('click', function (e) {
      e.stopPropagation();

      this.classList.remove('show');
    });
  });

  const approveBtns = document.querySelectorAll('.approve-btn');
  const rejectBtns = document.querySelectorAll('.reject-btn');
  const deleteBtns = document.querySelectorAll('.delete-btn');

  approveBtns.forEach((btn) => {
    btn.addEventListener('click', async function () {
      const commentId = this.dataset['id'];

      (
        await fetch(`/admin/comments/approve/${commentId}`, {
          method: 'PUT',
        })
      )
        .json()
        .then(function (res) {
          if (res.status !== 'OK')
            return location.assign('/admin/comments?error=' + res.message);
          return location.assign('/admin/comments?success=' + res.message);
        });
    });
  });

  rejectBtns.forEach((btn) => {
    btn.addEventListener('click', async function () {
      const commentId = this.dataset['id'];

      (
        await fetch(`/admin/comments/reject/${commentId}`, {
          method: 'PUT',
        })
      )
        .json()
        .then(function (res) {
          if (res.status !== 'OK')
            return location.assign('/admin/comments?error=' + res.message);
          return location.assign('/admin/comments?success=' + res.message);
        });
    });
  });

  deleteBtns.forEach((btn) => {
    btn.addEventListener('click', async function () {
      const commentId = this.dataset['id'];

      (
        await fetch(`/admin/comments/delete/${commentId}`, {
          method: 'PUT',
        })
      )
        .json()
        .then(function (res) {
          if (res.status !== 'OK')
            return location.assign('/admin/comments?error=' + res.message);
          return location.assign('/admin/comments?success=' + res.message);
        });
    });
  });
});
