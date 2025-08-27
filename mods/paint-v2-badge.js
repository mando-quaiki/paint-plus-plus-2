(function(){
  const MOD_ID = 'paint-v2-badge';
  const MOD_NAME = 'Paint V2 Badge';
  if(window.__mods_loaded && window.__mods_loaded.includes(MOD_ID)) return;
  window.__mods_loaded = window.__mods_loaded || [];
  window.__mods_loaded.push(MOD_ID);

  const badgeText = 'V2';
  const badgeClass = 'ppp-v2-badge';

  // create stylesheet for badge
  const style = document.createElement('style');
  style.textContent = `
    .${badgeClass} {
      display:inline-block;
      margin-left:6px;
      padding:2px 6px;
      font-size:11px;
      font-weight:700;
      color:#fff;
      background:#e91e63;
      border-radius:8px;
      vertical-align:middle;
      box-shadow:0 2px 6px rgba(0,0,0,0.25);
      font-family:Arial, sans-serif;
    }
    .${badgeClass}.small { padding:1px 5px; font-size:10px; border-radius:6px; background:#ff5722; }
  `;
  document.head.appendChild(style);

  function makeBadge(cls = '') {
    const s = document.createElement('span');
    s.className = `${badgeClass} ${cls}`.trim();
    s.textContent = badgeText;
    s.setAttribute('aria-hidden','true');
    return s;
  }

  // 1) append after elements containing text "PAint" (case-sensitive) - first matches in header
  function appendNextToText() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null);
    const added = [];
    while(walker.nextNode()){
      const el = walker.currentNode;
      if(el.children.length === 0 && typeof el.textContent === 'string' && el.textContent.includes('PAint')){
        // avoid adding multiple badges
        if(el.dataset.pppV2Added) continue;
        try{
          const badge = makeBadge();
          el.appendChild(badge);
          el.dataset.pppV2Added = '1';
          added.push(badge);
        }catch(e){}
      }
    }
    return added;
  }

  // 2) next to #logo image (create small badge overlay)
  function badgeNearLogo(){
    const logo = document.getElementById('logo');
    if(!logo) return null;
    // if image, create container
    if(!logo.parentElement || logo.parentElement.classList.contains('ppp-logo-wrap')) {
      // already wrapped
      const wrap = logo.parentElement;
      if(!wrap.querySelector('.' + badgeClass)){
        const b = makeBadge('small');
        b.style.position = 'absolute';
        b.style.right = '6px';
        b.style.bottom = '6px';
        wrap.style.position = wrap.style.position || 'relative';
        wrap.appendChild(b);
        return b;
      }
      return null;
    }
    const wrap = document.createElement('div');
    wrap.className = 'ppp-logo-wrap';
    wrap.style.display = 'inline-block';
    wrap.style.position = 'relative';
    logo.replaceWith(wrap);
    wrap.appendChild(logo);
    const b = makeBadge('small');
    b.style.position = 'absolute';
    b.style.right = '6px';
    b.style.bottom = '6px';
    wrap.appendChild(b);
    return b;
  }

  // 3) update <title>
  function updateTitle(){
    const t = document.querySelector('title');
    if(!t) return;
    if(!t.dataset.pppV2Modified && t.textContent.includes('PAint')){
      t.textContent = t.textContent.replace(/PAint/g, 'PAint ' + badgeText);
      t.dataset.pppV2Modified = '1';
    }
  }

  // run insertion (retry a few times in case DOM still loading)
  let tries = 0;
  const maxTries = 6;
  const interval = setInterval(()=>{
    tries++;
    appendNextToText();
    badgeNearLogo();
    updateTitle();
    if(tries >= maxTries) clearInterval(interval);
  }, 250);

  // expose cleanup
  const cleanupName = 'paintV2BadgeCleanup';
  window[cleanupName] = function(){
    try{ clearInterval(interval); }catch(e){}
    try{ document.head.removeChild(style); }catch(e){}
    // remove badges added via dataset
    document.querySelectorAll('[data-ppp-v2-added]').forEach(el=>{
      const b = el.querySelector('.' + badgeClass);
      if(b) b.remove();
      delete el.dataset.pppV2Added;
    });
    // unwrap logo if wrapped
    const wrap = document.querySelector('.ppp-logo-wrap');
    if(wrap && wrap.parentElement){
      const logo = wrap.querySelector('#logo');
      if(logo) wrap.replaceWith(logo);
      else wrap.remove();
    }
    // remove any floating badges
    document.querySelectorAll('.' + badgeClass).forEach(b=>{
      // keep ones that might be part of other mods? remove those with our style only
      try{ b.remove(); }catch(e){}
    });
    try{ delete window[cleanupName]; }catch(e){}
    window.loadedMods = (window.loadedMods || []).filter(m => m.id !== MOD_ID);
    console.log(`${MOD_NAME}: cleaned up`);
  };

  // register modloader entry
  window.loadedMods = window.loadedMods || [];
  if(!window.loadedMods.find(m => m.id === MOD_ID)) window.loadedMods.push({ id: MOD_ID, name: MOD_NAME, cleanupName, enabled: true });

  console.log(`${MOD_NAME} loaded`);
})();