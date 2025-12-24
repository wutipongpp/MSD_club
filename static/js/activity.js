document.querySelectorAll('.activity-title').forEach(title => {
  title.addEventListener('click', () => {
    const card = title.closest('.activity-card');
    const fullText = card.querySelector('.full-text');
    const shortText = card.querySelector('.short-text');

    fullText.classList.toggle('hidden');
    shortText.classList.toggle('hidden');
  });
});

