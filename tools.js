// Wybór narzędzia
document.querySelectorAll(".tool").forEach(btn => 
  btn.addEventListener("click", e => { currentTool = e.target.dataset.tool; })
);

// Kolor pędzla
document.getElementById("colorPicker").addEventListener("input", e => { currentColor = e.target.value; });

// Rozmiar pędzla
document.getElementById("brushSize").addEventListener("input", e => { brushSize = e.target.value; });

// Czyszczenie płótna
document.getElementById("clearBtn").addEventListener("click", () => {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveHistory();
});

// Zapis PNG
document.getElementById("savePngBtn").addEventListener("click", () => {
  let a = document.createElement("a");
  a.href = canvas.toDataURL();
  a.download = "nina-paint.png";
  a.click();
});

// Cofanie / ponawianie
document.getElementById("undoBtn").addEventListener("click", undo);
document.getElementById("redoBtn").addEventListener("click", redo);

// Nowe płótno
document.getElementById("newCanvasBtn").addEventListener("click", () => {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveHistory();
});

// Wczytywanie obrazu
document.getElementById("openImageBtn").addEventListener("click", () => {
  document.getElementById("openImageInput").click();
});
document.getElementById("openImageInput").addEventListener("change", e => {
  let file = e.target.files[0];
  if (!file) return;
  let img = new Image();
  img.onload = () => { 
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height); 
    saveHistory();
  };
  img.src = URL.createObjectURL(file);
});
