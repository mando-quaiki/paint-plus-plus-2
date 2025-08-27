(function(){
  const MOD_ID = 'robux-joke';
  const MOD_NAME = 'Robux Joke (no password)';
  if(window.__mods_loaded && window.__mods_loaded.includes(MOD_ID)) return;
  window.__mods_loaded = window.__mods_loaded || [];
  window.__mods_loaded.push(MOD_ID);

  // -- UI --
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.left = '12px';
  panel.style.bottom = '12px';
  panel.style.padding = '8px';
  panel.style.background = 'rgba(0,0,0,0.8)';
  panel.style.color = 'white';
  panel.style.zIndex = 2147483646;
  panel.style.fontSize = '13px';
  panel.style.borderRadius = '8px';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.gap = '6px';
  panel.innerHTML = `
    <div style="font-weight:600">Robux Joke</div>
    <input id="rj_nick" placeholder="Wpisz nick (żart)" style="width:180px;padding:6px;border-radius:4px;border:1px solid #444"/>
    <div style="display:flex;gap:6px">
      <button id="rj_give">Dodaj 100R</button>
      <button id="rj_close">Zamknij</button>
    </div>
    <div style="font-size:11px;opacity:0.8">To tylko żart — brak logowania/hasła.</div>
  `;
  document.body.appendChild(panel);

  // toast
  function showToast(message){
    const t = document.createElement('div');
    t.style.position = 'fixed';
    t.style.left = '50%';
    t.style.top = '20px';
    t.style.transform = 'translateX(-50%)';
    t.style.background = 'linear-gradient(90deg,#ffd54f,#ff8a65)';
    t.style.color = '#111';
    t.style.padding = '12px 18px';
    t.style.borderRadius = '8px';
    t.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
    t.style.zIndex = 2147483647;
    t.style.fontWeight = '700';
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(()=> { t.style.transition = 'opacity 400ms'; t.style.opacity = '0'; }, 1600);
    setTimeout(()=> { try{ t.remove(); }catch(e){} }, 2100);
  }

  // confetti (small, lightweight)
  function burstConfetti(){
    const c = document.createElement('div');
    c.style.position = 'fixed';
    c.style.left = '50%';
    c.style.top = '10%';
    c.style.transform = 'translateX(-50%)';
    c.style.pointerEvents = 'none';
    c.style.zIndex = 2147483647;
    document.body.appendChild(c);
    const colors = ['#ff3b30','#ff9500','#ffd60a','#32d74b','#0a84ff','#5e5ce6'];
    for(let i=0;i<18;i++){
      const s = document.createElement('div');
      s.style.position = 'absolute';
      s.style.width = s.style.height = (6 + Math.floor(Math.random()*8)) + 'px';
      s.style.background = colors[Math.floor(Math.random()*colors.length)];
      s.style.left = (Math.random()*120 - 60) + 'px';
      s.style.top = '0px';
      s.style.opacity = '0.95';
      s.style.borderRadius = '2px';
      s.style.transform = `translateY(0) rotate(${Math.random()*360}deg)`;
      s.style.transition = `transform 900ms cubic-bezier(.2,.8,.2,1), top 900ms linear, opacity 900ms linear`;
      c.appendChild(s);
      // animate
      requestAnimationFrame(()=> {
        s.style.top = (150 + Math.random()*200) + 'px';
        s.style.transform = `translateY(0) rotate(${Math.random()*720 - 360}deg) translateY(${150 + Math.random()*120}px)`;
        s.style.opacity = '0';
      });
    }
    setTimeout(()=> { try{ c.remove(); }catch(e){} }, 1100);
  }

  // handler
  const giveBtn = panel.querySelector('#rj_give');
  const closeBtn = panel.querySelector('#rj_close');
  const nickInput = panel.querySelector('#rj_nick');

  function handleGive(){
    const nick = (nickInput.value || '').trim() || 'Użytkownik';
    showToast(`100R zostało dodane do konta ${nick}`);
    burstConfetti();
  }
  giveBtn.addEventListener('click', handleGive);
  closeBtn.addEventListener('click', ()=> panel.style.display = 'none');

  // quick keyboard: Enter in input
  function keyHandler(e){
    if(e.key === 'Enter' && document.activeElement === nickInput){
      e.preventDefault();
      handleGive();
    }
  }
  window.addEventListener('keydown', keyHandler);

  // register for modloader UI (optional)
  const cleanupName = 'robuxJokeCleanup';
  window.loadedMods = window.loadedMods || [];
  if(!window.loadedMods.find(m => m.id === MOD_ID)){
    window.loadedMods.push({ id: MOD_ID, name: MOD_NAME, cleanupName, enabled: true });
  }

  // cleanup
  window[cleanupName] = function(){
    try{ giveBtn.removeEventListener('click', handleGive); }catch(e){}
    try{ closeBtn.removeEventListener('click', ()=>{}); }catch(e){}
    try{ window.removeEventListener('keydown', keyHandler); }catch(e){}
    try{ if(panel && panel.parentNode) panel.parentNode.removeChild(panel); }catch(e){}
    try{ delete window[cleanupName]; }catch(e){}
    // remove from loadedMods
    try{ window.loadedMods = (window.loadedMods || []).filter(m => m.id !== MOD_ID); }catch(e){}
    console.log(`${MOD_NAME}: cleaned up`);
  };

  console.log(`${MOD_NAME} loaded — żart, bez hasła.`);
})();