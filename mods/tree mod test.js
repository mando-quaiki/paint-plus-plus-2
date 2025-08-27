(function(){
  const canvas = document.getElementById('canvas');
  if(!canvas){
    console.warn('tree-mod: canvas not found');
    return;
  }
  const ctx = canvas.getContext('2d');

  function drawTreeText(x, y){
    ctx.save();
    // styl tekstu — możesz zmienić kolor/rozmiar
    ctx.fillStyle = '#0b6623';
    ctx.font = '48px sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('tree', x, y);
    ctx.restore();
  }

  function onClick(e){
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawTreeText(x, y);
  }

  function onKey(e){
    if(e.key && e.key.toLowerCase() === 't'){
      drawTreeText(Math.max(10, canvas.width/2 - 60), canvas.height/2);
    }
  }

  canvas.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);

  // funkcja sprzątająca — wywołaj ręcznie lub rozszerz modloader, żeby ją uruchamiał przy usuwaniu
  window.treeModCleanup = function(){
    canvas.removeEventListener('click', onClick);
    window.removeEventListener('keydown', onKey);
    console.log('tree-mod: cleanup done');
    try{ delete window.treeModCleanup; }catch(e){}
  };

  console.log('tree-mod loaded — click canvas to draw "tree", press T to draw at center');
})();