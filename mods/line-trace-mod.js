(function(){
  const MOD_ID = 'line-trace-mod';
  const MOD_NAME = 'Line Trace';
  if(window.__mods_loaded && window.__mods_loaded.includes(MOD_ID)) return;
  window.__mods_loaded = window.__mods_loaded || [];
  window.__mods_loaded.push(MOD_ID);

  const canvas = document.getElementById('canvas');
  if(!canvas){ console.warn(`${MOD_NAME}: canvas not found`); return; }
  const ctx = canvas.getContext('2d');

  // state
  const img = new Image();
  let imgLoaded = false;
  let currentObjectUrl = null;

  function loadImageFromSrc(src){
    imgLoaded = false;
    img.onload = ()=> { imgLoaded = true; console.log(`${MOD_NAME}: image loaded`, src); };
    img.onerror = ()=> { imgLoaded = false; console.warn(`${MOD_NAME}: failed to load image`, src); };
    img.src = src;
  }
  function loadFile(file){
    if(!file) return;
    if(currentObjectUrl){ try{ URL.revokeObjectURL(currentObjectUrl);}catch(e){} currentObjectUrl = null; }
    currentObjectUrl = URL.createObjectURL(file);
    loadImageFromSrc(currentObjectUrl);
  }

  // --- edge detection (Sobel) + simple horizontal/vertical runs -> thin lines ---
  function getGrayscale(data, w, h){
    const gray = new Float32Array(w * h);
    for(let i=0, p=0; i < data.length; i+=4, p++){
      // luminosity
      gray[p] = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    }
    return gray;
  }

  function sobelEdges(gray, w, h){
    const edges = new Uint8Array(w*h);
    // kernels
    for(let y=1; y<h-1; y++){
      for(let x=1; x<w-1; x++){
        const idx = y*w + x;
        // Gx
        const gx = (
          -1*gray[idx - w - 1] + 1*gray[idx - w + 1] +
          -2*gray[idx - 1]       + 2*gray[idx + 1] +
          -1*gray[idx + w - 1]  + 1*gray[idx + w + 1]
        );
        // Gy
        const gy = (
           1*gray[idx - w - 1] + 2*gray[idx - w] + 1*gray[idx - w + 1] +
          -1*gray[idx + w - 1] -2*gray[idx + w] -1*gray[idx + w + 1]
        );
        const mag = Math.hypot(gx, gy);
        edges[idx] = mag; // keep raw magnitude (will threshold later)
      }
    }
    return edges;
  }

  // create a stroked line-art canvas from image with params
  function createLineArtCanvas(imgEl, opts = {}){
    const maxDim = opts.maxDim || 600; // limit work size
    const origW = imgEl.naturalWidth || imgEl.width;
    const origH = imgEl.naturalHeight || imgEl.height;
    const scale = Math.min(1, maxDim / Math.max(origW, origH));
    const w = Math.max(1, Math.round(origW * scale));
    const h = Math.max(1, Math.round(origH * scale));
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d');
    octx.clearRect(0,0,w,h);
    octx.drawImage(imgEl, 0, 0, w, h);

    const imgData = octx.getImageData(0,0,w,h);
    const gray = getGrayscale(imgData.data, w, h);
    const rawEdges = sobelEdges(gray, w, h);

    // normalize magnitudes to 0..255
    let max = 0;
    for(let i=0;i<rawEdges.length;i++) if(rawEdges[i] > max) max = rawEdges[i];
    const norm = new Uint8Array(rawEdges.length);
    if(max === 0) max = 1;
    for(let i=0;i<rawEdges.length;i++) norm[i] = Math.min(255, Math.round((rawEdges[i] / max) * 255));

    // threshold
    const threshold = (typeof opts.threshold === 'number') ? opts.threshold : 90; // 0..255
    const edgeMask = new Uint8Array(w*h);
    for(let i=0;i<norm.length;i++) edgeMask[i] = (norm[i] >= threshold) ? 1 : 0;

    // produce a canvas with thin strokes by drawing horizontal and vertical runs
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const o2 = out.getContext('2d');
    o2.clearRect(0,0,w,h);
    o2.lineWidth = Math.max(0.5, (opts.lineWidth || 1));
    o2.lineCap = 'round';
    o2.lineJoin = 'round';
    o2.strokeStyle = (opts.strokeStyle || '#000');

    // horizontal runs
    for(let y=0;y<h;y++){
      let runStart = -1;
      for(let x=0;x<w;x++){
        if(edgeMask[y*w + x]){
          if(runStart === -1) runStart = x;
        } else {
          if(runStart !== -1){
            o2.beginPath();
            // .5 to draw crisp 1px lines on integer canvas
            o2.moveTo(runStart + 0.5, y + 0.5);
            o2.lineTo((x-1) + 0.5, y + 0.5);
            o2.stroke();
            runStart = -1;
          }
        }
      }
      if(runStart !== -1){
        o2.beginPath();
        o2.moveTo(runStart + 0.5, y + 0.5);
        o2.lineTo((w-1) + 0.5, y + 0.5);
        o2.stroke();
      }
    }

    // vertical runs (adds more continuity)
    for(let x=0;x<w;x++){
      let runStart = -1;
      for(let y=0;y<h;y++){
        if(edgeMask[y*w + x]){
          if(runStart === -1) runStart = y;
        } else {
          if(runStart !== -1){
            o2.beginPath();
            o2.moveTo(x + 0.5, runStart + 0.5);
            o2.lineTo(x + 0.5, (y-1) + 0.5);
            o2.stroke();
            runStart = -1;
          }
        }
      }
      if(runStart !== -1){
        o2.beginPath();
        o2.moveTo(x + 0.5, runStart + 0.5);
        o2.lineTo(x + 0.5, (h-1) + 0.5);
        o2.stroke();
      }
    }

    return { canvas: out, originalSize: { w: origW, h: origH }, scaledSize: { w, h }, scale };
  }

  // draw the generated line art onto main canvas at x,y (center)
  function stampLineArtAt(x, y, art){
    const w = art.canvas.width;
    const h = art.canvas.height;
    ctx.save();
    ctx.translate(x, y);
    ctx.drawImage(art.canvas, -w/2, -h/2, w, h);
    ctx.restore();
  }

  // --- UI panel ---
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.right = '12px';
  panel.style.bottom = '12px';
  panel.style.padding = '8px';
  panel.style.background = 'rgba(0,0,0,0.78)';
  panel.style.color = '#fff';
  panel.style.zIndex = 2147483646;
  panel.style.fontSize = '13px';
  panel.style.borderRadius = '8px';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.gap = '6px';
  panel.innerHTML = `
    <div style="font-weight:600;margin-bottom:4px">${MOD_NAME}</div>
    <input id="lt_file" type="file" accept="image/*" style="width:200px"/>
    <div style="display:flex;gap:6px;align-items:center">
      <input id="lt_path" type="text" placeholder="relative path or URL" style="width:140px"/>
      <button id="lt_load">Load</button>
    </div>
    <label style="display:flex;gap:6px;align-items:center">
      <span>Threshold</span>
      <input id="lt_thresh" type="range" min="10" max="220" value="90" style="width:120px"/>
      <span id="lt_thresh_val" style="min-width:36px;text-align:right">90</span>
    </label>
    <label style="display:flex;gap:6px;align-items:center">
      <span>Line color</span>
      <input id="lt_color" type="color" value="#000000"/>
    </label>
    <div style="display:flex;gap:6px">
      <button id="lt_trace">Trace & Stamp (center)</button>
      <button id="lt_stamp_cursor">Stamp at Cursor</button>
      <button id="lt_close">Close</button>
    </div>
    <div style="font-size:11px;opacity:0.85">Load an image, adjust threshold, then click to stamp thin-line drawing.</div>
  `;
  document.body.appendChild(panel);

  const fileInput = panel.querySelector('#lt_file');
  const pathInput = panel.querySelector('#lt_path');
  const loadBtn = panel.querySelector('#lt_load');
  const threshRange = panel.querySelector('#lt_thresh');
  const threshVal = panel.querySelector('#lt_thresh_val');
  const colorInput = panel.querySelector('#lt_color');
  const traceBtn = panel.querySelector('#lt_trace');
  const stampCursorBtn = panel.querySelector('#lt_stamp_cursor');
  const closeBtn = panel.querySelector('#lt_close');

  fileInput.addEventListener('change', ()=> {
    const f = fileInput.files && fileInput.files[0];
    if(f) loadFile(f);
  });
  loadBtn.addEventListener('click', ()=> {
    const v = pathInput.value.trim();
    if(!v) return;
    loadImageFromSrc(v);
  });
  threshRange.addEventListener('input', ()=> { threshVal.textContent = threshRange.value; });

  let lastMouse = { x: canvas.width/2, y: canvas.height/2 };
  canvas.addEventListener('mousemove', e=>{
    const r = canvas.getBoundingClientRect();
    lastMouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    lastMouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });

  async function handleTraceAndStamp(atCursor = false){
    if(!imgLoaded){ console.warn(`${MOD_NAME}: image not loaded`); return; }
    // create line art with user options
    const art = createLineArtCanvas(img, { threshold: parseInt(threshRange.value,10), lineWidth: 1, strokeStyle: colorInput.value, maxDim: 700 });
    // stamp center or cursor
    const x = atCursor ? lastMouse.x : (canvas.width / 2);
    const y = atCursor ? lastMouse.y : (canvas.height / 2);
    stampLineArtAt(x, y, art);
  }

  traceBtn.addEventListener('click', ()=> handleTraceAndStamp(false));
  stampCursorBtn.addEventListener('click', ()=> handleTraceAndStamp(true));
  closeBtn.addEventListener('click', ()=> panel.style.display = 'none');

  // register in modloader
  const cleanupName = 'lineTraceModCleanup';
  window.loadedMods = window.loadedMods || [];
  if(!window.loadedMods.find(m => m.id === MOD_ID)) window.loadedMods.push({ id: MOD_ID, name: MOD_NAME, cleanupName, enabled: true });

  // cleanup
  window[cleanupName] = function(){
    try{ fileInput.removeEventListener('change', ()=>{}); }catch(e){}
    try{ loadBtn.removeEventListener('click', ()=>{}); }catch(e){}
    try{ threshRange.removeEventListener('input', ()=>{}); }catch(e){}
    try{ traceBtn.removeEventListener('click', ()=>{}); }catch(e){}
    try{ stampCursorBtn.removeEventListener('click', ()=>{}); }catch(e){}
    try{ canvas.removeEventListener('mousemove', ()=>{}); }catch(e){}
    try{ if(currentObjectUrl) URL.revokeObjectURL(currentObjectUrl); }catch(e){}
    try{ if(panel && panel.parentNode) panel.parentNode.removeChild(panel); }catch(e){}
    try{ delete window[cleanupName]; }catch(e){}
    try{ window.loadedMods = (window.loadedMods || []).filter(m => m.id !== MOD_ID); }catch(e){}
    console.log(`${MOD_NAME}: cleaned up`);
  };

  window.__lineTraceMod = {
    cleanup: window[cleanupName],
    loadFromPath: loadImageFromSrc,
    loadFromFile: loadFile,
    trace: () => handleTraceAndStamp(false)
  };

  console.log(`${MOD_NAME}: ready`);
})();