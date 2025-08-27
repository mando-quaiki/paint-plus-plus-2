(function(){
  const MOD_ID = 'surreal-stamp-mod';
  const MOD_NAME = 'Surreal Stamp';
  if(window.__mods_loaded && window.__mods_loaded.includes(MOD_ID)) return;
  window.__mods_loaded = window.__mods_loaded || [];
  window.__mods_loaded.push(MOD_ID);

  const canvas = document.getElementById('canvas');
  if(!canvas){
    console.warn(`${MOD_NAME}: canvas not found`);
    return;
  }
  const ctx = canvas.getContext('2d');

  // --- helpers ---
  const rand = (a,b) => a + Math.random()*(b-a);
  const irand = (a,b) => Math.floor(rand(a,b+1));
  const randColor = (a=0.4) => `hsla(${irand(0,360)},${irand(60,100)}%,${irand(40,70)}%,${a})`;

  function drawOrganicBlob(ctx, x, y, w, h, color){
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand(-0.5,0.5));
    ctx.scale(w/100, h/100);
    ctx.beginPath();
    const steps = 6 + irand(0,5);
    for(let i=0;i<steps;i++){
      const theta = (i/steps) * Math.PI*2;
      const r = 28 + Math.sin(i*1.3)*12 + rand(-8,8);
      const px = Math.cos(theta)*r;
      const py = Math.sin(theta)*r;
      if(i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawBezierWeb(ctx, x, y, maxR){
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = Math.max(1, Math.round(maxR/25));
    for(let i=0;i<6;i++){
      ctx.beginPath();
      ctx.moveTo(0,0);
      const cx1 = rand(-maxR, maxR);
      const cy1 = rand(-maxR, maxR);
      const cx2 = rand(-maxR, maxR);
      const cy2 = rand(-maxR, maxR);
      const ex = rand(-maxR, maxR);
      const ey = rand(-maxR, maxR);
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, ex, ey);
      ctx.strokeStyle = `hsla(${irand(0,360)}, ${irand(40,90)}%, ${irand(30,70)}%, ${rand(0.3,0.9)})`;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSplotches(ctx, areaX, areaY, areaW, areaH){
    const count = 8 + irand(4,12);
    for(let i=0;i<count;i++){
      const x = rand(areaX, areaX+areaW);
      const y = rand(areaY, areaY+areaH);
      const r = rand(6, Math.min(areaW, areaH)/6);
      ctx.beginPath();
      ctx.fillStyle = randColor(rand(0.35,0.85));
      ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function drawFloatingRects(ctx, cx, cy, size){
    const n = 4 + irand(0,6);
    for(let i=0;i<n;i++){
      ctx.save();
      const w = rand(size*0.2, size*0.9);
      const h = rand(size*0.1, size*0.6);
      const x = cx + rand(-size, size);
      const y = cy + rand(-size, size);
      ctx.translate(x,y);
      ctx.rotate(rand(-1,1));
      ctx.fillStyle = randColor(rand(0.5,0.95));
      ctx.fillRect(-w/2, -h/2, w, h);
      ctx.restore();
    }
  }

  // --- main composition ---
  function generateSurreal(opts = {}){
    const centerX = (typeof opts.x === 'number') ? opts.x : canvas.width/2;
    const centerY = (typeof opts.y === 'number') ? opts.y : canvas.height/2;
    const baseSize = Math.min(canvas.width, canvas.height) * (opts.scale || 0.6);

    // subtle background vignette
    const g = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    g.addColorStop(0, `hsla(${irand(200,320)},${irand(20,40)}%,${irand(95,99)}%,${rand(0.15,0.35)})`);
    g.addColorStop(1, `hsla(${irand(0,60)},${irand(20,40)}%,${irand(90,98)}%,${rand(0.12,0.28)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // layered translucent blobs
    for(let i=0;i<6;i++){
      drawOrganicBlob(ctx,
        centerX + rand(-baseSize*0.6, baseSize*0.6),
        centerY + rand(-baseSize*0.6, baseSize*0.6),
        baseSize * rand(0.3, 1.1),
        baseSize * rand(0.25, 0.9),
        randColor(rand(0.18, 0.6))
      );
    }

    // web of beziers
    ctx.globalCompositeOperation = (Math.random() < 0.6) ? 'lighter' : 'overlay';
    drawBezierWeb(ctx, centerX + rand(-baseSize*0.2, baseSize*0.2), centerY + rand(-baseSize*0.2, baseSize*0.2), baseSize*0.8);

    // splotches and small strokes
    ctx.globalCompositeOperation = 'source-over';
    drawSplotches(ctx, centerX-baseSize, centerY-baseSize, baseSize*2, baseSize*2);

    // floating rectangles / surreal architecture
    drawFloatingRects(ctx, centerX, centerY, baseSize);

    // accent rings
    for(let i=0;i<3;i++){
      ctx.beginPath();
      ctx.lineWidth = 2 + i*2;
      ctx.strokeStyle = randColor(rand(0.5,0.9));
      ctx.ellipse(centerX + rand(-baseSize*0.2, baseSize*0.2), centerY + rand(-baseSize*0.2, baseSize*0.2), baseSize*(0.3+i*0.25), baseSize*(0.18+i*0.18), rand(-0.6,0.6), 0, Math.PI*2);
      ctx.stroke();
    }

    // tiny noisy lines
    ctx.globalCompositeOperation = 'multiply';
    for(let i=0;i<30;i++){
      ctx.beginPath();
      ctx.moveTo(centerX + rand(-baseSize, baseSize), centerY + rand(-baseSize, baseSize));
      ctx.lineTo(centerX + rand(-baseSize, baseSize), centerY + rand(-baseSize, baseSize));
      ctx.strokeStyle = `hsla(${irand(0,360)},${irand(30,90)}%,${irand(20,70)}%,${rand(0.08,0.5)})`;
      ctx.lineWidth = Math.max(0.5, rand(0.3,2));
      ctx.stroke();
    }

    // small focal element (eye-like)
    ctx.globalCompositeOperation = 'screen';
    ctx.save();
    ctx.translate(centerX + rand(-baseSize*0.15, baseSize*0.15), centerY + rand(-baseSize*0.15, baseSize*0.15));
    ctx.beginPath();
    ctx.ellipse(0,0, baseSize*0.12, baseSize*0.07, 0, 0, Math.PI*2);
    ctx.fillStyle = randColor(0.95);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0,0, baseSize*0.04, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(10,10,10,0.9)';
    ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }

  // --- UI ---
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.right = '12px';
  panel.style.bottom = '12px';
  panel.style.padding = '8px';
  panel.style.background = 'rgba(0,0,0,0.75)';
  panel.style.color = '#fff';
  panel.style.zIndex = 2147483646;
  panel.style.fontSize = '13px';
  panel.style.borderRadius = '8px';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.gap = '6px';
  panel.innerHTML = `
    <div style="font-weight:600;margin-bottom:4px">${MOD_NAME}</div>
    <div style="display:flex;gap:6px;align-items:center">
      <button id="ss_generate">Generate Surreal</button>
      <button id="ss_at_cursor">At Cursor</button>
      <button id="ss_close">Close</button>
    </div>
    <div style="font-size:11px;opacity:0.8">Generuje warstwowy, proceduralny obraz</div>
  `;
  document.body.appendChild(panel);

  const genBtn = panel.querySelector('#ss_generate');
  const atCursorBtn = panel.querySelector('#ss_at_cursor');
  const closeBtn = panel.querySelector('#ss_close');

  genBtn.addEventListener('click', ()=> generateSurreal({}));
  let lastMouse = { x: canvas.width/2, y: canvas.height/2 };
  canvas.addEventListener('mousemove', e=>{
    const r = canvas.getBoundingClientRect();
    lastMouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    lastMouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  atCursorBtn.addEventListener('click', ()=> generateSurreal({ x: lastMouse.x, y: lastMouse.y, scale: 0.45 }));

  closeBtn.addEventListener('click', ()=> panel.style.display = 'none');

  // register in modloader list
  const cleanupName = 'surrealStampCleanup';
  window.loadedMods = window.loadedMods || [];
  if(!window.loadedMods.find(m => m.id === MOD_ID)) window.loadedMods.push({ id: MOD_ID, name: MOD_NAME, cleanupName, enabled: true });

  // cleanup
  window[cleanupName] = function(){
    try{ genBtn.removeEventListener('click', ()=>{}); }catch(e){}
    try{ atCursorBtn.removeEventListener('click', ()=>{}); }catch(e){}
    try{ canvas.removeEventListener('mousemove', ()=>{}); }catch(e){}
    try{ if(panel && panel.parentNode) panel.parentNode.removeChild(panel); }catch(e){}
    try{ window.loadedMods = (window.loadedMods || []).filter(m => m.id !== MOD_ID); }catch(e){}
    try{ delete window[cleanupName]; }catch(e){}
    console.log(`${MOD_NAME}: cleaned up`);
  };

  window.__surrealStampMod = {
    cleanup: window[cleanupName],
    generate: generateSurreal
  };

  console.log(`${MOD_NAME} loaded`);
})();