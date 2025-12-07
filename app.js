// Slider + TMDB poster fetcher (her kart için rastgele 10 benzersiz poster)
(async function(){
  const NUM_CARDS = 12; // toplam oluşturulacak kart sayısı
  const IMAGES_PER_CARD = 10; // her kart için seçilecek poster sayısı
  const sliderTrack = document.getElementById('slider-track');
  const leftBtn = document.querySelector('.slider-arrow.left');
  const rightBtn = document.querySelector('.slider-arrow.right');
  const windowEl = document.getElementById('slider-window');

  function createCard(images, title, year, href){
    const anchor = document.createElement('a');
    anchor.className = 'card';
    anchor.href = href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.setAttribute('role','listitem');

    const img = document.createElement('img');
    img.src = images[0];
    img.alt = title + ' poster';

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<div class="title">${escapeHtml(title)}</div><div class="year">${year || ''}</div>`;

    // posterleri data attr'ta sakla (galeri vb. için)
    anchor.dataset.images = JSON.stringify(images);

    anchor.appendChild(img);
    anchor.appendChild(meta);
    return anchor;
  }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function shuffle(array){ for(let i = array.length -1; i>0; i--){ const j = Math.floor(Math.random()*(i+1)); [array[i],array[j]]=[array[j],array[i]] } return array; }
  function sampleUnique(arr, n){
    if(n >= arr.length) return shuffle([...arr]).slice(0, n);
    const copy = [...arr];
    return shuffle(copy).slice(0, n);
  }

  // Eğer TMDB yoksa placeholder hazırlığı
  if(!CONFIG || !CONFIG.TMDB_API_KEY || CONFIG.TMDB_API_KEY.includes('REPLACE')){
    const placeholders = [];
    for(let i=1;i<=200;i++) placeholders.push(`https://via.placeholder.com/400x600?text=Poster+${i}`);
    for(let i=0;i<NUM_CARDS;i++){
      const imgs = sampleUnique(placeholders, IMAGES_PER_CARD);
      const href = Math.random()>0.5 ? 'https://e.com' : 'https://a.com';
      const card = createCard(imgs, `Demo Film ${i+1}`, 2020 + (i%5), href);
      sliderTrack.appendChild(card);
    }
    attachArrows();
    return;
  }

  // TMDB akışı: birkaç sayfadan popüler filmleri çekip poster havuzu oluştur
  const API_KEY = CONFIG.TMDB_API_KEY;
  const TMDB_BASE = 'https://api.themoviedb.org/3';
  const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

  async function fetchPopular(page=1){
    const url = `${TMDB_BASE}/movie/popular?api_key=${API_KEY}&language=tr-TR&page=${page}`;
    const r = await fetch(url);
    if(!r.ok) throw new Error('TMDB fetch error: ' + r.status);
    return r.json();
  }

  try{
    const postersPool = []; // {path,title,year}
    const pagesToFetch = 6;
    for(let p=1;p<=pagesToFetch;p++){
      const res = await fetchPopular(p);
      res.results.forEach(m=>{
        if(m.poster_path){
          postersPool.push({path:m.poster_path,title:m.title || m.original_title, year: m.release_date? m.release_date.slice(0,4):''});
        }
      });
    }

    if(postersPool.length === 0) throw new Error('TMDB returned no posters');

    // poster yollarını tam URL haline getir
    const poolUrls = postersPool.map(x => ({ url: IMG_BASE + x.path, title: x.title, year: x.year }));

    // create cards: her kart için pool'dan benzersiz 10 seçim
    for(let i=0;i<NUM_CARDS;i++){
      const chosen = sampleUnique(poolUrls, IMAGES_PER_CARD);
      const imgs = chosen.map(c=>c.url);
      const meta = chosen[0] || {title:`Film ${i+1}`, year:2020};
      const href = Math.random()>0.5 ? 'https://e.com' : 'https://a.com';
      const card = createCard(imgs, meta.title || `Film ${i+1}`, meta.year, href);
      sliderTrack.appendChild(card);
    }

    attachArrows();
  }catch(err){
    console.error('TMDB hata', err);
    // fallback placeholders
    const placeholders = [];
    for(let i=1;i<=200;i++) placeholders.push(`https://via.placeholder.com/400x600?text=Poster+${i}`);
    for(let i=0;i<NUM_CARDS;i++){
      const imgs = sampleUnique(placeholders, IMAGES_PER_CARD);
      const href = Math.random()>0.5 ? 'https://e.com' : 'https://a.com';
      const card = createCard(imgs, `Demo Film ${i+1}`, 2020 + (i%5), href);
      sliderTrack.appendChild(card);
    }
    attachArrows();
  }

  function attachArrows(){
    leftBtn.addEventListener('click', ()=> scrollByCards(-4));
    rightBtn.addEventListener('click', ()=> scrollByCards(4));
    // klavye desteği için Enter ile tetikleme
    leftBtn.addEventListener('keydown', e => { if(e.key === 'Enter') scrollByCards(-4); });
    rightBtn.addEventListener('keydown', e => { if(e.key === 'Enter') scrollByCards(4); });
    // basit dokunmatik sürükleme (mouse/touch)
    addDragToScroll(windowEl, sliderTrack);
  }

  function scrollByCards(n){
    const cards = sliderTrack.querySelectorAll('.card');
    if(!cards.length) return;
    // card genişliğini hesapla (ilk karta göre)
    const cardRect = cards[0].getBoundingClientRect();
    const gap = parseInt(getComputedStyle(sliderTrack).gap) || 16;
    const cardFullWidth = Math.round(cardRect.width + gap);
    // n pozitif: sağa, negatif: sola
    const left = n * cardFullWidth;
    windowEl.scrollBy({ left: left, behavior: 'smooth' });
  }

  // basit drag-to-scroll (desktop + mobile)
  function addDragToScroll(container, track){
    let isDown = false, startX, scrollLeft;
    container.addEventListener('mousedown', (e)=>{
      isDown = true;
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
      container.classList.add('dragging');
    });
    container.addEventListener('mouseleave', ()=>{ isDown=false; container.classList.remove('dragging'); });
    container.addEventListener('mouseup', ()=>{ isDown=false; container.classList.remove('dragging'); });
    container.addEventListener('mousemove', (e)=>{
      if(!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1; // scroll-fastness
      container.scrollLeft = scrollLeft - walk;
    });

    // touch
    container.addEventListener('touchstart', (e)=>{ startX = e.touches[0].pageX - container.offsetLeft; scrollLeft = container.scrollLeft; });
    container.addEventListener('touchmove', (e)=>{ const x = e.touches[0].pageX - container.offsetLeft; const walk = (x - startX) * 1; container.scrollLeft = scrollLeft - walk; });
  }

})();
