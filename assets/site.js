(() => {
  'use strict';
  const menu = document.querySelector('.menu-toggle');
  const nav = document.getElementById('mobile-nav');
  function closeMenu() { menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Abrir menu'); nav.hidden = true; }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu'); nav.hidden = !open;
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !nav.hidden) { closeMenu(); menu.focus(); } });
  window.matchMedia('(min-width: 851px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  const slides = [...document.querySelectorAll('.gallery-slide')];
  const gallery = document.querySelector('.gallery');
  const select = document.getElementById('gallery-select');
  const dialog = document.querySelector('.photo-dialog');
  const large = document.getElementById('photo-large');
  const title = document.getElementById('photo-title');
  let current = 0;
  // Manual navigation only: images never move while a visitor is reading.
  function showPhoto(index, announce = true) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    select.value = String(current);
    const count = String(current + 1).padStart(2, '0') + ' / ' + slides.length;
    document.querySelector('.gallery-count').textContent = count;
    if (announce) document.querySelector('.gallery-status').textContent = slides[current].dataset.title + '. Foto ' + (current + 1) + ' de ' + slides.length + '.';
    if (dialog.open) updateEnlarged();
  }
  function updateEnlarged() {
    const photo = slides[current].querySelector('img');
    large.src = photo.src; large.alt = photo.alt;
    title.textContent = slides[current].dataset.title;
    document.querySelector('.photo-dialog-count').textContent = 'Foto ' + (current + 1) + ' de ' + slides.length;
  }
  document.querySelector('.gallery-prev').addEventListener('click', () => showPhoto(current - 1));
  document.querySelector('.gallery-next').addEventListener('click', () => showPhoto(current + 1));
  select.addEventListener('change', () => showPhoto(Number(select.value)));
  slides.forEach((slide, index) => slide.querySelector('button').addEventListener('click', () => {
    showPhoto(index); updateEnlarged(); dialog.showModal(); document.body.classList.add('photo-opened'); document.querySelector('.photo-close').focus();
  }));
  document.querySelector('.photo-close').addEventListener('click', () => dialog.close());
  document.querySelector('.photo-prev').addEventListener('click', () => showPhoto(current - 1));
  document.querySelector('.photo-next').addEventListener('click', () => showPhoto(current + 1));
  dialog.addEventListener('close', () => {
    document.body.classList.remove('photo-opened');
    // The original trigger can become hidden after browsing enlarged photos.
    slides[current].querySelector('button').focus({preventScroll:true});
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  function galleryKeys(event) {
    if (event.target.tagName === 'SELECT') return;
    let index;
    if (event.key === 'ArrowRight') index = current + 1;
    if (event.key === 'ArrowLeft') index = current - 1;
    if (event.key === 'Home') index = 0;
    if (event.key === 'End') index = slides.length - 1;
    if (index !== undefined) {
      event.preventDefault();
      const wasPhoto = event.target.closest('.photo-open');
      showPhoto(index);
      if (wasPhoto) slides[current].querySelector('button').focus({preventScroll:true});
    }
  }
  gallery.addEventListener('keydown', galleryKeys);
  dialog.addEventListener('keydown', galleryKeys);
  document.getElementById('current-year').textContent = new Date().getFullYear();
  // Update installed app caches without registering new marketing visitors.
  if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration('./').then(registration => {
    if (registration) return registration.update();
  }).catch(() => {});
})();

