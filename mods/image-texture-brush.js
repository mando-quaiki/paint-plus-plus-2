(function(){
  const MOD_ID = 'image-texture-brush';
  const MOD_NAME = 'Image Texture Brush';
  if(window.__mods_loaded && window.__mods_loaded.includes(MOD_ID)) return;
  window.__mods_loaded = window.__mods_loaded || [];
  window.__mods_loaded.push(MOD_ID);

  const canvas = document.getElementById('canvas');
  if(!canvas){ console.warn(`${MOD_NAME}: main canvas (#canvas) not found`); return; }
  const ctx = canvas.getContext('2d');

  // state
  let textureImg = null;
  let textureReady = false;
  let textureCanvas = null;
  let painting = false;
  let lastPos = null;
  let spacing = 12; // px
  let brushSize = 64;
  let opacity = 1;
  let blendMode = 'source-over';
  let tile = false;
  let rotationJitter = 0;
  let scaleJitter = 0;
  let flow = 1.0; // multiply alpha
  let previewCanvas = null;

  // helpers
  const $ = sel => panel.querySelector(sel);
  function createOffscreenFromImage(img, targetSize){
    const c = document.createElement('canvas');
    const s = Math.max(1, Math.round(targetSize));
    c.width = s; c.height = s;
    const g = c.getContext('2d');
    g.clearRect(0,0,s,s);
    // draw image centered and scaled to fit
    const ratio = Math.min(s / img.naturalWidth, s / img.naturalHeight);
    const w = img.naturalWidth * ratio;
    const h = img.naturalHeight * ratio;
    g.drawImage(img, (s-w)/2, (s-h)/2, w, h);
    return c;
  }
  function mapToCanvas(clientX, clientY){
    const r = canvas.getBoundingClientRect();
    const x = (clientX - r.left) * (canvas.width / r.width);
    const y = (clientY - r.top) * (canvas.height / r.height);
    return { x, y };
  }
  function distance(a,b){ const dx = a.x-b.x, dy = a.y-b.y; return Math.hypot(dx,dy); }
  function randomRange(v){ return 1 + (Math.random()*2-1)*v; }

  // painting core: stamp texture at position with options
  function stampAt(pos){
    if(!textureReady || !textureCanvas) return;
    const s = brushSize * randomRange(scaleJitter);
    const half = s/2;
    const rot = (Math.random()*2-1) * rotationJitter * Math.PI/180;
    ctx.save();
    ctx.globalAlpha = opacity * flow;
    ctx.globalCompositeOperation = blendMode;
    ctx.translate(pos.x, pos.y);
    ctx.rotate(rot);
    ctx.drawImage(textureCanvas, -half, -half, s, s);
    ctx.restore();
  }

  // brush stroke: stamp along line with spacing
  function strokeFromTo(a, b){
    if(distance(a,b) < 0.5){
      stampAt(a); return;
    }
    const total = distance(a,b);
    const steps = Math.max(1, Math.floor(total / spacing));
    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const p = { x: a.x + (b.x - a.x)*t, y: a.y + (b.y - a.y)*t };
      stampAt(p);
    }
  }

  // UI
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.right = '12px';
  panel.style.top = '80px';
  panel.style.width = '260px';
  panel.style.padding = '10px';
  panel.style.background = 'rgba(12,12,12,0.9)';
  panel.style.color = '#eee';
  panel.style.zIndex = 2147483646;
  panel.style.borderRadius = '8px';
  panel.style.fontFamily = 'Arial, sans-serif';
  panel.innerHTML = `
    <div style="font-weight:700;margin-bottom:8px">${MOD_NAME}</div>
    <input id="itb_file" type="file" accept="image/*" style="width:100%"/>
    <div style="display:flex;gap:6px;margin-top:6px">
      <label style="font-size:12px">Size</label>
      <input id="itb_size" type="range" min="8" max="512" value="${brushSize}" style="flex:1"/>
      <span id="itb_size_val" style="width:38px;text-align:right">${brushSize}</span>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-top:6px">
      <label style="font-size:12px">Spacing</label>
      <input id="itb_spacing" type="range" min="2" max="128" value="${spacing}" style="flex:1"/>
      <span id="itb_spacing_val" style="width:38px;text-align:right">${spacing}</span>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-top:6px">
      <label style="font-size:12px">Opacity</label>
      <input id="itb_opacity" type="range" min="0" max="1" step="0.01" value="${opacity}" style="flex:1"/>
      <span id="itb_opacity_val" style="width:38px;text-align:right">${opacity}</span>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-top:6px">
      <label style="font-size:12px">Blend</label>
      <select id="itb_blend" style="flex:1">
        <option value="source-over">Normal</option>
        <option value="multiply">Multiply</option>
        <option value="screen">Screen</option>
        <option value="overlay">Overlay</option>
        <option value="lighter">Lighter</option>
      </select>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-top:6px">
      <label><input id="itb_tile" type="checkbox"/> Tile</label>
      <label style="margin-left:auto">Rot jitter <input id="itb_rot" type="range" min="0" max="180" value="0" style="width:90px"/></label>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-top:6px">
      <label style="font-size:12px">Scale jitter</label>
      <input id="itb_scale" type="range" min="0" max="0.7" step="0.01" value="0" style="flex:1"/>
    </div>
    <div style="display:flex;gap:6px;margin-top:8px">
      <button id="itb_paint" style="flex:1">Brush</button>
      <button id="itb_stamp" style="flex:1">Stamp</button>
    </div>
    <div style="display:flex;gap:6px;margin-top:8px">
      <button id="itb_preview" style="flex:1">Preview</button>
      <button id="itb_close" style="flex:1">Close</button>
    </div>
    <div id="itb_preview_wrap" style="margin-top:8px;height:72px;display:flex;align-items:center;justify-content:center;background:#0b0b0b;border-radius:6px">
      <canvas id="itb_preview_canvas" width="64" height="64" style="max-width:100%;height:64px"></canvas>
    </div>
    <div style="font-size:11px;opacity:0.8;margin-top:6px">Load an image texture, adjust size/spacing and paint on canvas. Tile will repeat the texture stamp.</div>
  `;
  document.body.appendChild(panel);

  previewCanvas = panel.querySelector('#itb_preview_canvas');
  const fileInput = panel.querySelector('#itb_file');
  const sizeRange = panel.querySelector('#itb_size');
  const sizeVal = panel.querySelector('#itb_size_val');
  const spacingRange = panel.querySelector('#itb_spacing');
  const spacingVal = panel.querySelector('#itb_spacing_val');
  const opacityRange = panel.querySelector('#itb_opacity');
  const opacityVal = panel.querySelector('#itb_opacity_val');
  const blendSelect = panel.querySelector('#itb_blend');
  const tileCheckbox = panel.querySelector('#itb_tile');
  const rotRange = panel.querySelector('#itb_rot');
  const scaleRange = panel.querySelector('#itb_scale');
  const paintBtn = panel.querySelector('#itb_paint');
  const stampBtn = panel.querySelector('#itb_stamp');
  const previewBtn = panel.querySelector('#itb_preview');
  const closeBtn = panel.querySelector('#itb_close');

  fileInput.addEventListener('change', ()=>{
    const f = fileInput.files && fileInput.files[0];
    if(!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = ()=>{
      textureImg = img;
      textureReady = true;
      textureCanvas = createOffscreenFromImage(img, brushSize);
      updatePreview();
      try{ URL.revokeObjectURL(url); }catch(e){}
    };
    img.onerror = ()=>{ console.warn(`${MOD_NAME}: failed to load texture`); textureReady = false; };
    img.crossOrigin = 'Anonymous';
    img.src = url;
  });

  sizeRange.addEventListener('input', ()=> {
    brushSize = parseInt(sizeRange.value,10);
    sizeVal.textContent = brushSize;
    if(textureImg) textureCanvas = createOffscreenFromImage(textureImg, brushSize);
    updatePreview();
  });
  spacingRange.addEventListener('input', ()=> {
    spacing = parseInt(spacingRange.value,10);
    spacingVal.textContent = spacing;
  });
  opacityRange.addEventListener('input', ()=> {
    opacity = parseFloat(opacityRange.value);
    opacityVal.textContent = opacity.toFixed(2);
  });
  blendSelect.addEventListener('change', ()=> blendMode = blendSelect.value);
  tileCheckbox.addEventListener('change', ()=> tile = tileCheckbox.checked);
  rotRange.addEventListener('input', ()=> rotationJitter = parseFloat(rotRange.value));
  scaleRange.addEventListener('input', ()=> scaleJitter = parseFloat(scaleRange.value));

  paintBtn.addEventListener('click', ()=> {
    painting = false;
    panel.querySelectorAll('button').forEach(b=>b.disabled=false);
    paintBtn.disabled = true;
    // enable brush mode: mouse events will paint while mouse down
  });
  stampBtn.addEventListener('click', ()=> {
    // single stamp at center or last cursor
    const rect = canvas.getBoundingClientRect();
    const cx = canvas.width/2;
    const cy = canvas.height/2;
    if(tile && textureCanvas){
      // tile full canvas
      ctx.save(); ctx.globalAlpha = opacity * flow; ctx.globalCompositeOperation = blendMode;
      const pat = ctx.createPattern(textureCanvas, 'repeat');
      ctx.fillStyle = pat;
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.restore();
    } else {
      stampAt({ x: cx, y: cy });
    }
  });

  previewBtn.addEventListener('click', updatePreview);
  closeBtn.addEventListener('click', ()=> panel.style.display = 'none');

  function updatePreview(){
    const pctx = previewCanvas.getContext('2d');
    pctx.clearRect(0,0,previewCanvas.width, previewCanvas.height);
    if(!textureReady || !textureCanvas) return;
    const s = previewCanvas.width;
    pctx.save();
    pctx.globalAlpha = opacity;
    pctx.drawImage(textureCanvas, (s-brushSize)/2, (s-brushSize)/2, brushSize, brushSize);
    pctx.restore();
  }

  // painting interactions
  let brushMode = true; // toggle: when paintBtn clicked, user holds mouse -> paint
  let isPainting = false;
  function onCanvasDown(e){
    if(!textureReady) return;
    if(e.button !== 0) return;
    isPainting = true;
    lastPos = mapToCanvas(e.clientX, e.clientY);
    stampAt(lastPos);
    canvas.style.cursor = 'crosshair';
    e.preventDefault();
  }
  function onCanvasMove(e){
    if(!isPainting) return;
    const pos = mapToCanvas(e.clientX, e.clientY);
    strokeFromTo(lastPos, pos);
    lastPos = pos;
    e.preventDefault();
  }
  function onCanvasUp(e){
    if(isPainting){
      isPainting = false;
      lastPos = null;
      canvas.style.cursor = '';
      e.preventDefault();
    }
  }

  canvas.addEventListener('mousedown', onCanvasDown);
  window.addEventListener('mousemove', onCanvasMove);
  window.addEventListener('mouseup', onCanvasUp);

  // keyboard: space to toggle tile/brush quickly
  function keyHandler(e){
    if(e.key === 't') { tile = !tile; tileCheckbox.checked = tile; }
    if(e.key === 'p') { // preview
      updatePreview();
    }
  }
  window.addEventListener('keydown', keyHandler);

  // register cleanup
  const cleanupName = 'imageTextureBrushCleanup';
  window.loadedMods = window.loadedMods || [];
  if(!window.loadedMods.find(m => m.id === MOD_ID)) window.loadedMods.push({ id: MOD_ID, name: MOD_NAME, cleanupName, enabled: true });

  window[cleanupName] = function(){
    try{ canvas.removeEventListener('mousedown', onCanvasDown); }catch(e){}
    try{ window.removeEventListener('mousemove', onCanvasMove); }catch(e){}
    try{ window.removeEventListener('mouseup', onCanvasUp); }catch(e){}
    try{ window.removeEventListener('keydown', keyHandler); }catch(e){}
    try{ if(panel && panel.parentNode) panel.parentNode.removeChild(panel); }catch(e){}
    try{ textureImg = null; textureCanvas = null; }catch(e){}
    try{ window.loadedMods = (window.loadedMods || []).filter(m => m.id !== MOD_ID); }catch(e){}
    try{ delete window[cleanupName]; }catch(e){}
    console.log(`${MOD_NAME}: cleaned up`);
  };

  window.__imageTextureBrush = {
    cleanup: window[cleanupName],
    setTextureFromUrl(url){ const img = new Image(); img.crossOrigin='Anonymous'; img.onload=()=>{ textureImg=img; textureReady=true; textureCanvas=createOffscreenFromImage(img, brushSize); updatePreview(); }; img.src=url; },
    setSize(s){ brushSize = s; sizeRange.value = s; sizeVal.textContent = s; if(textureImg) textureCanvas = createOffscreenFromImage(textureImg, brushSize); updatePreview(); }
  };

  updatePreview();
  console.log(`${MOD_NAME} loaded`);
})();