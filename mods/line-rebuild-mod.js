(function(){
  const MOD_ID = 'line-rebuild-mod';
  const MOD_NAME = 'Line Rebuild';
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

  // --- Image load ---
  function loadImageFromSrc(src){
    imgLoaded = false;
    img.onload = () => { imgLoaded = true; console.log(`${MOD_NAME}: image loaded`, src); };
    img.onerror = () => { imgLoaded = false; console.warn(`${MOD_NAME}: failed to load image`, src); };
    img.crossOrigin = 'Anonymous';
    img.src = src;
  }
  function loadFile(file){
    if(!file) return;
    try{ if(currentObjectUrl) URL.revokeObjectURL(currentObjectUrl); }catch(e){}
    currentObjectUrl = URL.createObjectURL(file);
    loadImageFromSrc(currentObjectUrl);
  }

  // --- Utilities ---
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function getScaledCanvas(imgEl, maxDim){
    const origW = imgEl.naturalWidth || imgEl.width;
    const origH = imgEl.naturalHeight || imgEl.height;
    const scale = Math.min(1, maxDim / Math.max(origW, origH));
    const w = Math.max(1, Math.round(origW * scale));
    const h = Math.max(1, Math.round(origH * scale));
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const octx = off.getContext('2d');
    octx.drawImage(imgEl, 0, 0, w, h);
    return { canvas: off, ctx: octx, w, h, scale, origW, origH };
  }

  function getGrayscale(octx, w, h){
    const d = octx.getImageData(0,0,w,h).data;
    const g = new Float32Array(w*h);
    for(let i=0,p=0;i<d.length;i+=4,p++){
      g[p] = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
    }
    return g;
  }

  function sobelMagnitude(gray, w, h){
    const mag = new Float32Array(w*h);
    for(let y=1;y<h-1;y++){
      for(let x=1;x<w-1;x++){
        const i = y*w + x;
        const gx =
          -1*gray[i-w-1] + 1*gray[i-w+1] +
          -2*gray[i-1]     + 2*gray[i+1] +
          -1*gray[i+w-1] + 1*gray[i+w+1];
        const gy =
           1*gray[i-w-1] + 2*gray[i-w] + 1*gray[i-w+1] +
          -1*gray[i+w-1] -2*gray[i+w] -1*gray[i+w+1];
        mag[i] = Math.hypot(gx, gy);
      }
    }
    return mag;
  }

  function thresholdFromMag(mag, w, h, thresh){
    let max = 0;
    for(let i=0;i<mag.length;i++) if(mag[i] > max) max = mag[i];
    if(max === 0) max = 1;
    const bin = new Uint8Array(w*h);
    const t = clamp(thresh / 255, 0, 1);
    for(let i=0;i<mag.length;i++) bin[i] = (mag[i] / max >= t) ? 1 : 0;
    return bin;
  }

  // Zhang-Suen thinning (reasonably optimized)
  function zhangSuenThin(bin, w, h){
    const img = new Uint8Array(bin);
    const idx = (x,y) => y*w + x;
    let changed = true;
    const neighbors = (x,y) => {
      return [
        img[idx(x, y-1)], img[idx(x+1, y-1)], img[idx(x+1, y)],
        img[idx(x+1, y+1)], img[idx(x, y+1)], img[idx(x-1, y+1)],
        img[idx(x-1, y)], img[idx(x-1, y-1)]
      ];
    };
    function A(p){
      let cnt=0;
      for(let i=0;i<8;i++){ if(p[i]===0 && p[(i+1)%8]===1) cnt++; }
      return cnt;
    }
    function B(p){ return p.reduce((s,v)=>s+v,0); }

    while(changed){
      changed = false;
      const toRemove = [];
      // step 1
      for(let y=1;y<h-1;y++){
        for(let x=1;x<w-1;x++){
          const i = idx(x,y);
          if(!img[i]) continue;
          const p = neighbors(x,y);
          const b = B(p), a = A(p);
          if(b >= 2 && b <= 6 && a === 1 && (p[0]*p[2]*p[4] === 0) && (p[2]*p[4]*p[6] === 0)) toRemove.push(i);
        }
      }
      if(toRemove.length){
        changed = true;
        for(const i of toRemove) img[i]=0;
      }
      const toRemove2 = [];
      // step 2
      for(let y=1;y<h-1;y++){
        for(let x=1;x<w-1;x++){
          const i = idx(x,y);
          if(!img[i]) continue;
          const p = neighbors(x,y);
          const b = B(p), a = A(p);
          if(b >= 2 && b <= 6 && a === 1 && (p[0]*p[2]*p[6] === 0) && (p[0]*p[4]*p[6] === 0)) toRemove2.push(i);
        }
      }
      if(toRemove2.length){
        changed = true;
        for(const i of toRemove2) img[i]=0;
      }
    }
    return img;
  }

  // Trace skeleton into polylines (walk from endpoints and loops)
  function traceSkeleton(skel, w, h, minLen){
    const visited = new Uint8Array(w*h);
    const idx = (x,y) => y*w + x;
    const offsets = [-w-1, -w, -w+1, -1, 1, w-1, w, w+1];

    function degree(i){
      let d=0;
      for(const off of offsets){
        const ni = i + off;
        if(ni>=0 && ni<w*h && skel[ni]) d++;
      }
      return d;
    }

    const paths = [];

    // endpoints first
    for(let y=1;y<h-1;y++){
      for(let x=1;x<w-1;x++){
        const i = idx(x,y);
        if(!skel[i] || visited[i]) continue;
        if(degree(i) === 1){
          const path = [];
          let cur = i, prev = -1, safety = 0;
          while(cur !== -1 && !visited[cur] && safety++ < w*h){
            visited[cur] = 1;
            path.push([cur % w, Math.floor(cur / w)]);
            // find next neighbor not prev
            let next = -1;
            for(const off of offsets){
              const ni = cur + off;
              if(ni < 0 || ni >= w*h) continue;
              if(ni === prev) continue;
              if(skel[ni]) { next = ni; break; }
            }
            prev = cur;
            cur = next;
            if(cur !== -1 && degree(cur) > 2){ // junction - include and stop
              visited[cur] = 1;
              path.push([cur % w, Math.floor(cur / w)]);
              break;
            }
          }
          if(path.length >= minLen) paths.push(path);
        }
      }
    }

    // remaining pixels -> loops/branches
    for(let i=0;i<w*h;i++){
      if(!skel[i] || visited[i]) continue;
      const path = [];
      let cur = i, prev = -1, safety = 0;
      while(cur !== -1 && !visited[cur] && safety++ < w*h){
        visited[cur] = 1;
        path.push([cur % w, Math.floor(cur / w)]);
        let next = -1;
        for(const off of offsets){
          const ni = cur + off;
          if(ni < 0 || ni >= w*h) continue;
          if(ni === prev) continue;
          if(skel[ni] && !visited[ni]) { next = ni; break; }
        }
        if(next === -1){
          for(const off of offsets){
            const ni = cur + off;
            if(ni < 0 || ni >= w*h) continue;
            if(skel[ni]) { next = ni; break; }
          }
        }
        prev = cur;
        cur = next;
      }
      if(path.length >= minLen) paths.push(path);
    }

    return paths;
  }

  // Chaikin smoothing
  function chaikin(points, iterations){
    if(points.length < 3) return points.slice();
    let pts = points.slice();
    for(let it=0; it<iterations; it++){
      const np = [];
      np.push(pts[0]);
      for(let i=0;i<pts.length-1;i++){
        const p0 = pts[i], p1 = pts[i+1];
        const q = [0.75*p0[0] + 0.25*p1[0], 0.75*p0[1] + 0.25*p1[1]];
        const r = [0.25*p0[0] + 0.75*p1[0], 0.25*p0[1] + 0.75*p1[1]];
        np.push(q); np.push(r);
      }
      np.push(pts[pts.length-1]);
      pts = np;
    }
    return pts;
  }

  function renderPathsToCanvas(paths, w, h, options){
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const octx = out.getContext('2d');
    octx.clearRect(0,0,w,h);
    octx.lineCap = 'round';
    octx.lineJoin = 'round';
    octx.strokeStyle = options.strokeStyle || '#000';
    octx.globalAlpha = options.alpha || 1;
    for(const path of paths){
      if(path.length < 2) continue;
      octx.beginPath();
      octx.lineWidth = options.lineWidth || 1;
      octx.moveTo(path[0][0]+0.5, path[0][1]+0.5);
      for(let i=1;i<path.length;i++) octx.lineTo(path[i][0]+0.5, path[i][1]+0.5);
      octx.stroke();
    }
    return out;
  }

  // --- pipeline ---
  function rebuildPipeline(options = {}){
    if(!imgLoaded){ console.warn(`${MOD_NAME}: image not loaded`); return null; }
    const maxDim = options.maxDim || 900;
    // allow thresholds in range -30..100 (default 30) for finer control
    const thresh = clamp((options.threshold !== undefined ? options.threshold : 30), -30, 100);
    const minLen = Math.max(4, options.minLen || 6);
    const smoothIters = clamp(options.smoothIters || 2, 0, 4);
    const lineWidth = options.lineWidth || 1;
    const strokeStyle = options.color || '#000';

    const meta = getScaledCanvas(img, maxDim);
    const gray = getGrayscale(meta.ctx, meta.w, meta.h);
    const mag = sobelMagnitude(gray, meta.w, meta.h);
    const bin = thresholdFromMag(mag, meta.w, meta.h, thresh);
    const skel = zhangSuenThin(bin, meta.w, meta.h);
    const rawPaths = traceSkeleton(skel, meta.w, meta.h, minLen);

    const smoothPaths = rawPaths.map(p => chaikin(p, smoothIters));
    const outCanvas = renderPathsToCanvas(smoothPaths, meta.w, meta.h, { lineWidth, strokeStyle });

    return { outCanvas, meta, paths: smoothPaths };
  }

  // draw to main canvas (center or cursor)
  function stampResult(res, atX, atY){
    if(!res) return;
    const drawW = res.meta.w;
    const drawH = res.meta.h;
    const x = (typeof atX === 'number') ? atX - drawW/2 : (canvas.width/2 - drawW/2);
    const y = (typeof atY === 'number') ? atY - drawH/2 : (canvas.height/2 - drawH/2);
    ctx.save();
    ctx.drawImage(res.outCanvas, x, y, drawW, drawH);
    ctx.restore();
  }

  // --- UI (clean, handlers named for cleanup) ---
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.right = '12px';
  panel.style.bottom = '12px';
  panel.style.padding = '8px';
  panel.style.background = 'rgba(16,16,16,0.9)';
  panel.style.color = '#fff';
  panel.style.zIndex = 2147483646;
  panel.style.fontSize = '13px';
  panel.style.borderRadius = '8px';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.gap = '6px';
  panel.innerHTML = `
    <div style="font-weight:600">${MOD_NAME}</div>
    <input id="lr_file" type="file" accept="image/*" style="width:220px"/>
    <div style="display:flex;gap:6px;align-items:center">
      <input id="lr_path" type="text" placeholder="relative path or URL" style="width:140px"/>
      <button id="lr_load">Load</button>
    </div>
    <!-- threshold range changed to allow negative values -->
    <label>Threshold: <input id="lr_thresh" type="range" min="-30" max="100" value="30" style="width:140px"/> <span id="lr_thresh_val">30</span></label>
    <label>Min stroke len: <input id="lr_minlen" type="number" value="6" style="width:64px"/></label>
    <label>Smooth iters: <input id="lr_smooth" type="number" value="2" min="0" max="4" style="width:64px"/></label>
    <label>Line width: <input id="lr_lw" type="number" value="1" step="0.5" style="width:64px"/></label>
    <label>Color: <input id="lr_color" type="color" value="#000000"/></label>
    <div style="display:flex;gap:6px">
      <button id="lr_rebuild">Rebuild & Stamp (center)</button>
      <button id="lr_stamp_cursor">Stamp at Cursor</button>
      <button id="lr_close">Close</button>
    </div>
    <div style="font-size:11px;opacity:0.8">Creates longer, smoothed connected strokes from image edges.</div>
  `;
  document.body.appendChild(panel);

  const fileInput = panel.querySelector('#lr_file');
  const pathInput = panel.querySelector('#lr_path');
  const loadBtn = panel.querySelector('#lr_load');
  const threshRange = panel.querySelector('#lr_thresh');
  const threshVal = panel.querySelector('#lr_thresh_val');
  const minlenInput = panel.querySelector('#lr_minlen');
  const smoothInput = panel.querySelector('#lr_smooth');
  const lwInput = panel.querySelector('#lr_lw');
  const colorInput = panel.querySelector('#lr_color');
  const rebuildBtn = panel.querySelector('#lr_rebuild');
  const stampCurBtn = panel.querySelector('#lr_stamp_cursor');
  const closeBtn = panel.querySelector('#lr_close');

  function onFileChange(e){ const f = fileInput.files && fileInput.files[0]; if(f) loadFile(f); }
  function onLoadClick(){ const v = pathInput.value.trim(); if(v) loadImageFromSrc(v); }
  function onThreshInput(){ threshVal.textContent = threshRange.value; }
  let lastMouse = { x: canvas.width/2, y: canvas.height/2 };
  function onCanvasMouseMove(e){
    const r = canvas.getBoundingClientRect();
    lastMouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    lastMouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  }

  async function onRebuildClick(){ 
    const res = rebuildPipeline({
      maxDim: 900,
      threshold: parseInt(threshRange.value,10),
      minLen: parseInt(minlenInput.value,10),
      smoothIters: parseInt(smoothInput.value,10),
      lineWidth: parseFloat(lwInput.value),
      color: colorInput.value
    });
    if(res) stampResult(res);
  }
  async function onStampCursorClick(){
    const res = rebuildPipeline({
      maxDim: 900,
      threshold: parseInt(threshRange.value,10),
      minLen: parseInt(minlenInput.value,10),
      smoothIters: parseInt(smoothInput.value,10),
      lineWidth: parseFloat(lwInput.value),
      color: colorInput.value
    });
    if(res) stampResult(res, lastMouse.x, lastMouse.y);
  }
  function onCloseClick(){ panel.style.display = 'none'; }

  fileInput.addEventListener('change', onFileChange);
  loadBtn.addEventListener('click', onLoadClick);
  threshRange.addEventListener('input', onThreshInput);
  canvas.addEventListener('mousemove', onCanvasMouseMove);
  rebuildBtn.addEventListener('click', onRebuildClick);
  stampCurBtn.addEventListener('click', onStampCursorClick);
  closeBtn.addEventListener('click', onCloseClick);

  // register modloader
  const cleanupName = 'lineRebuildModCleanup';
  window.loadedMods = window.loadedMods || [];
  if(!window.loadedMods.find(m => m.id === MOD_ID)) window.loadedMods.push({ id: MOD_ID, name: MOD_NAME, cleanupName, enabled: true });

  // cleanup
  window[cleanupName] = function(){
    try{ fileInput.removeEventListener('change', onFileChange); }catch(e){}
    try{ loadBtn.removeEventListener('click', onLoadClick); }catch(e){}
    try{ threshRange.removeEventListener('input', onThreshInput); }catch(e){}
    try{ canvas.removeEventListener('mousemove', onCanvasMouseMove); }catch(e){}
    try{ rebuildBtn.removeEventListener('click', onRebuildClick); }catch(e){}
    try{ stampCurBtn.removeEventListener('click', onStampCursorClick); }catch(e){}
    try{ closeBtn.removeEventListener('click', onCloseClick); }catch(e){}
    try{ if(currentObjectUrl) URL.revokeObjectURL(currentObjectUrl); }catch(e){}
    try{ if(panel && panel.parentNode) panel.parentNode.removeChild(panel); }catch(e){}
    try{ delete window[cleanupName]; }catch(e){}
    try{ window.loadedMods = (window.loadedMods || []).filter(m => m.id !== MOD_ID); }catch(e){}
    console.log(`${MOD_NAME}: cleaned up`);
  };

  window.__lineRebuildMod = {
    cleanup: window[cleanupName],
    loadFromPath: loadImageFromSrc,
    loadFromFile: loadFile,
    rebuild: rebuildPipeline
  };

  console.log(`${MOD_NAME} loaded`);
})();