// Pełny modloader: load z URL/pliku, ON/OFF, remove, collapse panel, stan w localStorage
window.loadedMods = window.loadedMods || [];

function createScriptNode(src, id, onload, onerror){
  const script = document.createElement('script');
  script.src = src;
  script.async = false;
  script.dataset.modId = id;
  if(onload) script.addEventListener('load', onload);
  if(onerror) script.addEventListener('error', onerror);
  return script;
}

function addModToList(mod){
  const ul = document.getElementById('mods-list');
  if(!ul) return;

  // update existing
  let li = document.getElementById('mod-' + mod.id);
  if(li){
    const chk = li.querySelector('input[type="checkbox"]');
    if(chk) chk.checked = !!mod.enabled;
    const txt = li.querySelector('.mod-name');
    if(txt) txt.textContent = mod.name;
    return;
  }

  li = document.createElement('li');
  li.id = 'mod-' + mod.id;

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = !!mod.enabled;
  toggle.title = 'On/Off';
  toggle.style.marginRight = '6px';
  toggle.addEventListener('change', () => {
    if(toggle.checked) enableMod(mod.id);
    else disableMod(mod.id);
  });
  li.appendChild(toggle);

  const nameSpan = document.createElement('span');
  nameSpan.className = 'mod-name';
  nameSpan.textContent = mod.name;
  li.appendChild(nameSpan);

  const btn = document.createElement('button');
  btn.textContent = 'Usuń';
  btn.style.marginLeft = '8px';
  btn.addEventListener('click', () => unloadMod(mod.id));
  li.appendChild(btn);

  ul.appendChild(li);
}

function setStatus(text, isError){
  const el = document.getElementById('mod-status');
  if(!el) return;
  el.style.color = isError ? 'red' : 'green';
  el.textContent = text;
}

function internalRegisterMod(mod){
  window.loadedMods.push(mod);
  addModToList(mod);
}

// enable: create <script> and append
function enableMod(id){
  const mod = window.loadedMods.find(m => m.id === id);
  if(!mod) return;
  if(mod.enabled) return;

  const onload = () => setStatus('Mod załadowany: ' + mod.name);
  const onerror = () => setStatus('Błąd ładowania moda: ' + mod.name, true);

  if(mod.file && !mod.blobUrl){
    mod.blobUrl = URL.createObjectURL(mod.file);
    mod.src = mod.blobUrl;
  }

  const script = createScriptNode(mod.src, id, onload, onerror);
  document.body.appendChild(script);
  mod.node = script;
  mod.enabled = true;
  addModToList(mod);
}

// disable: remove <script>, try call cleanup function if present
function disableMod(id){
  const mod = window.loadedMods.find(m => m.id === id);
  if(!mod) return;
  if(!mod.enabled) return;

  try {
    if(mod.cleanupName && typeof window[mod.cleanupName] === 'function'){
      window[mod.cleanupName]();
    } else {
      // best-effort: call any global func ending with "Cleanup" (may call unrelated ones)
      for(const key in window){
        if(/cleanup$/i.test(key) && typeof window[key] === 'function'){
          try { window[key](); } catch(e){}
        }
      }
    }
  } catch(e){}

  if(mod.node && mod.node.parentNode) mod.node.parentNode.removeChild(mod.node);
  mod.node = null;
  mod.enabled = false;
  addModToList(mod);
  setStatus('Mod wyłączony: ' + mod.name);
}

function loadModByUrl(url){
  if(!url || !url.trim().endsWith('.js')){
    setStatus('Podaj poprawny URL do pliku .js', true);
    return;
  }
  const id = Date.now().toString(36);
  const src = url;
  const mod = { id, name: url, src, node: null, blobUrl: null, file: null, enabled: false, cleanupName: null };
  internalRegisterMod(mod);
  enableMod(id);
}

function loadModFromFile(file){
  if(!file || !file.name.endsWith('.js')){
    setStatus('Wybierz plik .js', true);
    return;
  }
  const id = Date.now().toString(36);
  const blobUrl = URL.createObjectURL(file);
  const src = blobUrl;
  const mod = { id, name: file.name, src, node: null, blobUrl, file, enabled: false, cleanupName: null };
  internalRegisterMod(mod);
  enableMod(id);
}

function unloadMod(id){
  const idx = window.loadedMods.findIndex(m => m.id === id);
  if(idx === -1) return;
  const mod = window.loadedMods[idx];

  try {
    if(mod.cleanupName && typeof window[mod.cleanupName] === 'function') window[mod.cleanupName]();
  } catch(e){}

  if(mod.node && mod.node.parentNode) mod.node.parentNode.removeChild(mod.node);
  if(mod.blobUrl){
    try{ URL.revokeObjectURL(mod.blobUrl); } catch(e){}
  }
  const li = document.getElementById('mod-' + id);
  if(li && li.parentNode) li.parentNode.removeChild(li);
  window.loadedMods.splice(idx,1);
  setStatus('Mod usunięty: ' + mod.name);
}

document.addEventListener('DOMContentLoaded', () => {
  const urlBtn = document.getElementById('load-mod-btn');
  const fileBtn = document.getElementById('load-mod-file-btn');
  const fileInput = document.getElementById('mod-file');
  const urlInput = document.getElementById('mod-url');

  if(urlBtn && urlInput) urlBtn.addEventListener('click', () => loadModByUrl(urlInput.value.trim()));

  if(fileBtn && fileInput) {
    fileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if(f) loadModFromFile(f);
      else setStatus('Nie wybrano pliku', true);
      fileInput.value = '';
    });
  }

  // COLLAPSE / EXPAND dla panelu modów
  const modsPanel = document.getElementById('modsPanel');
  const modsToggle = document.getElementById('modsToggle');
  if (modsPanel && modsToggle) {
    const collapsed = localStorage.getItem('modsPanelCollapsed') === '1';
    if (collapsed) {
      modsPanel.classList.add('collapsed');
      modsPanel.setAttribute('aria-hidden', 'true');
      modsToggle.setAttribute('aria-pressed', 'false');
    } else {
      modsPanel.classList.remove('collapsed');
      modsPanel.setAttribute('aria-hidden', 'false');
      modsToggle.setAttribute('aria-pressed', 'true');
    }
    modsToggle.addEventListener('click', () => {
      modsPanel.classList.toggle('collapsed');
      const now = modsPanel.classList.contains('collapsed');
      localStorage.setItem('modsPanelCollapsed', now ? '1' : '0');
      modsPanel.setAttribute('aria-hidden', String(now));
      modsToggle.setAttribute('aria-pressed', String(!now));
    });
  }
});