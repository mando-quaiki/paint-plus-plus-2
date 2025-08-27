// ...existing code...
(function(){
  const canvas = document.getElementById('canvas');
  if(!canvas){ console.warn('colorize-image-mod: canvas not found'); return; }
  const ctx = canvas.getContext('2d');

  // -- ustawienia --
  let randomizeHue = true;
  let hueOffset = 0; // stopnie, używane jeśli randomizeHue == false
  let minSize = 40;
  let maxSize = 220;
  let useRotation = true;

  // obraz i źródło (może być blob url)
  const img = new Image();
  let imgLoaded = false;
  let currentObjectUrl = null;

  function randRange(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
  function randHue(){ return Math.floor(Math.random()*361)-180; } // -180..180

  function loadImageFromSrc(src){
    imgLoaded = false;
    img.onload = ()=> { imgLoaded = true; console.log('colorize-image-mod: image loaded', src); };
    img.onerror = ()=> { imgLoaded = false; console.warn('colorize-image-mod: failed to load image', src); };
    img.src = src;
  }

  function loadFile(file){
    if(!file) return;
    if(currentObjectUrl){ URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
    currentObjectUrl = URL.createObjectURL(file);
    loadImageFromSrc(currentObjectUrl);
  }

  // konwersje RGB <-> HSL
  function rgbToHsl(r,g,b){
    r/=255; g/=255; b/=255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h=0, s=0, l=(max+min)/2;
    if(max !== min){
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch(max){
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  function hslToRgb(h,s,l){
    let r,g,b;
    if(s === 0){
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hue2rgb = (p, q, t) => {
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1/6) return p + (q - p) * 6 * t;
        if(t < 1/2) return q;
        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // Zmiana odcienia obrazu: przesunięcie hue o givenDegrees
  function applyHueShiftToImageCanvas(offCtx, w, h, degrees){
    const imgData = offCtx.getImageData(0,0,w,h);
    const data = imgData.data;
    const shift = (degrees / 360); // fraction
    for(let i = 0; i < data.length; i += 4){
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      // zachowaj przezroczystość bez zmian
      if(a === 0) continue;
      const [h0, s0, l0] = rgbToHsl(r,g,b);
      let hNew = (h0 + shift) % 1;
      if(hNew < 0) hNew += 1;
      // konwersja HSL->RGB
      const q = l0 < 0.5 ? l0 * (1 + s0) : l0 + s0 - l0 * s0;
      const p = 2 * l0 - q;
      const hue2rgb = (p,q,t) => {
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1/6) return p + (q - p) * 6 * t;
        if(t < 1/2) return q;
        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      let rr, gg, bb;
      if(s0 === 0){
        rr = gg = bb = l0;
      } else {
        rr = hue2rgb(p, q, hNew + 1/3);
        gg = hue2rgb(p, q, hNew);
        bb = hue2rgb(p, q, hNew - 1/3);
      }
      data[i]   = Math.round(rr * 255);
      data[i+1] = Math.round(gg * 255);
      data[i+2] = Math.round(bb * 255);
    }
    offCtx.putImageData(imgData, 0, 0);
  }

  // tworzy canvas z obrazem i aplikuje przesunięcie odcienia
  function createHueShiftedCanvas(degrees, w, h){
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const octx = off.getContext('2d');
    octx.clearRect(0,0,w,h);
    octx.drawImage(img, 0, 0, w, h);
    applyHueShiftToImageCanvas(octx, w, h, degrees);
    return off;
  }

  function drawAt(x, y){
    if(!imgLoaded){ console.warn('colorize-image-mod: image not loaded yet'); return; }
    const size = randRange(minSize, maxSize);
    const w = size;
    const h = Math.round(size * (img.height / img.width || 1));
    const degrees = randomizeHue ? randHue() : hueOffset;
    const shifted = createHueShiftedCanvas(degrees, w, h);

    ctx.save();
    ctx.translate(x, y);
    if(useRotation){
      const angle = (Math.random()*60 - 30) * Math.PI/180;
      ctx.rotate(angle);
    }
    ctx.drawImage(shifted, -w/2, -h/2, w, h);
    ctx.restore();
  }

  // handlers (przechowywane by poprawnie usuwać)
  const onClick = function(e){
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawAt(x, y);
  };

  canvas.addEventListener('click', onClick);

  // -- prosty panel źródła obrazu i ustawień --
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.right = '12px';
  panel.style.bottom = '12px';
  panel.style.padding = '8px';
  panel.style.background = 'rgba(255,255,255,0.95)';
  panel.style.border = '1px solid rgba(0,0,0,0.12)';
  panel.style.zIndex = 9999;
  panel.style.fontSize = '12px';
  panel.style.borderRadius = '6px';
  panel.innerHTML = `
    <div style="margin-bottom:6px"><strong>Hue Stamp Mod</strong></div>
    <div style="margin-bottom:6px">
      <input id="cim_file" type="file" accept="image/*" style="width:180px"/>
    </div>
    <div style="margin-bottom:6px">
      <input id="cim_path" type="text" placeholder="relative path or URL (optional)" style="width:180px"/>
      <button id="cim_load" style="margin-left:6px">Load</button>
    </div>
    <div style="margin-bottom:6px;display:flex;gap:6px;align-items:center">
      <label><input id="cim_random_hue" type="checkbox" checked/> losowy odcień</label>
      <input id="cim_hue" type="range" min="-180" max="180" value="0" style="width:120px" title="hue offset (degrees)"/>
      <span id="cim_hue_val" style="min-width:36px;text-align:right">0°</span>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-top:6px">
      <label>Rozmiar: <input id="cim_min" type="number" value="${minSize}" style="width:60px"/> - <input id="cim_max" type="number" value="${maxSize}" style="width:60px"/></label>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-top:6px">
      <label><input id="cim_rotation" type="checkbox" checked/> losowy obrót</label>
      <button id="cim_close" style="margin-left:6px">Close</button>
    </div>
  `;
  document.body.appendChild(panel);

  const fileInput = panel.querySelector('#cim_file');
  const pathInput = panel.querySelector('#cim_path');
  const loadBtn = panel.querySelector('#cim_load');
  const randomHueChk = panel.querySelector('#cim_random_hue');
  const hueRange = panel.querySelector('#cim_hue');
  const hueVal = panel.querySelector('#cim_hue_val');
  const minInput = panel.querySelector('#cim_min');
  const maxInput = panel.querySelector('#cim_max');
  const rotationChk = panel.querySelector('#cim_rotation');
  const closeBtn = panel.querySelector('#cim_close');

  function fileChangeHandler(){
    const f = fileInput.files && fileInput.files[0];
    if(f) loadFile(f);
  }
  function loadHandler(){
    const v = pathInput.value.trim();
    if(!v) return;
    loadImageFromSrc(v);
  }
  function randomHueHandler(){ randomizeHue = !!randomHueChk.checked; }
  function hueChangeHandler(){ hueOffset = parseInt(hueRange.value,10)||0; hueVal.textContent = hueOffset + '°'; }
  function sizeChangeHandler(){
    const mi = parseInt(minInput.value,10) || minSize;
    const ma = parseInt(maxInput.value,10) || maxSize;
    minSize = Math.max(1, Math.min(mi, ma));
    maxSize = Math.max(minSize, ma);
    minInput.value = minSize; maxInput.value = maxSize;
  }
  function rotationHandler(){ useRotation = !!rotationChk.checked; }
  function closeHandler(){ panel.style.display = 'none'; }

  fileInput.addEventListener('change', fileChangeHandler);
  loadBtn.addEventListener('click', loadHandler);
  randomHueChk.addEventListener('change', randomHueHandler);
  hueRange.addEventListener('input', hueChangeHandler);
  minInput.addEventListener('change', sizeChangeHandler);
  maxInput.addEventListener('change', sizeChangeHandler);
  rotationChk.addEventListener('change', rotationHandler);
  closeBtn.addEventListener('click', closeHandler);

  // -- API i cleanup --
  const cleanupName = 'colorizeImageModCleanup';
  window[cleanupName] = function(){
    canvas.removeEventListener('click', onClick);
    fileInput.removeEventListener('change', fileChangeHandler);
    loadBtn.removeEventListener('click', loadHandler);
    randomHueChk.removeEventListener('change', randomHueHandler);
    hueRange.removeEventListener('input', hueChangeHandler);
    minInput.removeEventListener('change', sizeChangeHandler);
    maxInput.removeEventListener('change', sizeChangeHandler);
    rotationChk.removeEventListener('change', rotationHandler);
    closeBtn.removeEventListener('click', closeHandler);
    try{ if(currentObjectUrl) URL.revokeObjectURL(currentObjectUrl); }catch(e){}
    try{ document.body.removeChild(panel); }catch(e){}
    try{ delete window[cleanupName]; }catch(e){ window[cleanupName] = undefined; }
    console.log('colorize-image-mod: cleaned up');
  };

  window.__colorizeImageMod = {
    cleanup: window[cleanupName],
    setOptions(opts = {}) {
      if(typeof opts.randomizeHue === 'boolean') { randomizeHue = opts.randomizeHue; randomHueChk.checked = randomizeHue; }
      if(typeof opts.hueOffset === 'number') { hueOffset = opts.hueOffset; hueRange.value = hueOffset; hueVal.textContent = hueOffset + '°'; }
      if(typeof opts.minSize === 'number') { minSize = opts.minSize; minInput.value = minSize; }
      if(typeof opts.maxSize === 'number') { maxSize = opts.maxSize; maxInput.value = maxSize; }
      if(typeof opts.useRotation === 'boolean') { useRotation = opts.useRotation; rotationChk.checked = useRotation; }
      if(typeof opts.imageSrc === 'string') loadImageFromSrc(opts.imageSrc);
    },
    setImageByFile(file){ loadFile(file); }
  };

  // ustaw początkną wartość widocznego hue
  hueChangeHandler();

  console.log('hue-stamp-mod loaded — wybierz plik lub ścieżkę w panelu, potem kliknij canvas by wstemplować obraz z przesunięciem odcienia.');
})();