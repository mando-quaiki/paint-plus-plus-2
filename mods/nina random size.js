(function(){
  const canvas = document.getElementById('canvas');
  if(!canvas){
    console.warn('nina-mod: canvas not found');
    return;
  }
  const ctx = canvas.getContext('2d');

  // Ustawienia domyślne — możesz zmieniać ręcznie lub wystawić UI w modloaderze
  let minSize = 20;
  let maxSize = 140;
  let randomColor = true;
  let useRotation = true;
  const text = 'Nina';

  function randRange(a,b){ return Math.floor(Math.random() * (b - a + 1)) + a; }
  function randColor(){ return `rgb(${randRange(0,255)},${randRange(0,255)},${randRange(0,255)})`; }

  function drawNina(x, y){
    const size = Math.max(6, randRange(minSize, maxSize));
    const color = randomColor ? randColor() : (document.getElementById('colorPicker')?.value || '#222222');
    const angle = useRotation ? (Math.random() * 60 - 30) * Math.PI/180 : 0;

    ctx.save();
    ctx.translate(x, y);
    if(angle) ctx.rotate(angle);
    ctx.font = `${size}px "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // lekki kontur by było czytelne na jasnym tle
    ctx.lineWidth = Math.max(2, Math.round(size / 20));
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  function onClick(e){
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawNina(x, y);
  }

  canvas.addEventListener('click', onClick);

  // expose cleanup + simple API do debugu/konfiguracji z konsoli
  const cleanupName = 'ninaModCleanup';
  window[cleanupName] = function(){
    canvas.removeEventListener('click', onClick);
    try{ delete window[cleanupName]; }catch(e){ window[cleanupName] = undefined; }
    console.log('nina-mod: cleaned up');
  };

  window.__ninaClickMod = {
    cleanup: window[cleanupName],
    setOptions(opts = {}) {
      if(typeof opts.minSize === 'number') minSize = opts.minSize;
      if(typeof opts.maxSize === 'number') maxSize = opts.maxSize;
      if(typeof opts.randomColor === 'boolean') randomColor = opts.randomColor;
      if(typeof opts.useRotation === 'boolean') useRotation = opts.useRotation;
    },
    getOptions() { return { minSize, maxSize, randomColor, useRotation }; }
  };

  console.log('nina-mod loaded — click canvas to spawn "Nina"');
})();