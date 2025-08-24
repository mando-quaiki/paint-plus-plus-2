const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let drawing = false;
let startX, startY;
let currentTool = "brush";
let currentColor = "#222222";
let brushSize = 14;
let history = [], redoStack = [];

ctx.fillStyle = "white";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Tymczasowy canvas do kształtów
let tempCanvas = document.createElement("canvas");
tempCanvas.width = canvas.width;
tempCanvas.height = canvas.height;
let tempCtx = tempCanvas.getContext("2d");

// Historia
function saveHistory() {
  history.push(canvas.toDataURL());
  if (history.length > 50) history.shift();
  redoStack = [];
}

function undo() {
  if (history.length > 0) {
    redoStack.push(canvas.toDataURL());
    let img = new Image();
    img.src = history.pop();
    img.onload = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0);
    };
  }
}

function redo() {
  if (redoStack.length > 0) {
    history.push(canvas.toDataURL());
    let img = new Image();
    img.src = redoStack.pop();
    img.onload = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0);
    };
  }
}

// Narzędzia
function sprayTool(x, y){
  for(let i=0;i<30;i++){
    let offsetX = Math.random()*brushSize*2 - brushSize;
    let offsetY = Math.random()*brushSize*2 - brushSize;
    ctx.fillStyle = currentColor;
    ctx.fillRect(x+offsetX, y+offsetY,1,1);
  }
}

function randomShape(){
  let shape = ["rect","circle","line"][Math.floor(Math.random()*3)];
  let x = Math.random()*canvas.width;
  let y = Math.random()*canvas.height;
  let w = Math.random()*100;
  let h = Math.random()*100;
  let color = `rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255})`;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.random()*5+1;

  switch(shape){
    case "rect": ctx.strokeRect(x,y,w,h); break;
    case "circle":
      ctx.beginPath();
      ctx.arc(x+w/2,y+h/2,Math.sqrt(w*w+h*h)/2,0,Math.PI*2);
      ctx.stroke();
      break;
    case "line":
      ctx.beginPath();
      ctx.moveTo(x,y);
      ctx.lineTo(x+w,y+h);
      ctx.stroke();
      break;
  }
}

let hue = 0;
function rainbowBrush(x,y){
  ctx.strokeStyle = `hsl(${hue},100%,50%)`;
  ctx.lineWidth = brushSize;
  ctx.lineTo(x,y);
  ctx.stroke();
  hue += 2;
  if(hue>360) hue=0;
}

function shufflePixels(x,y,size=50){
  let image = ctx.getImageData(x,y,size,size);
  let data = image.data;
  for(let i=0;i<500;i++){
    let a = Math.floor(Math.random()*(data.length/4));
    let b = Math.floor(Math.random()*(data.length/4));
    for(let c=0;c<4;c++){
      let temp = data[a*4+c];
      data[a*4+c]=data[b*4+c];
      data[b*4+c]=temp;
    }
  }
  ctx.putImageData(image,x,y);
}

// Funkcja startDraw
function startDraw(e){
  if(currentTool==="text"||currentTool==="picker") return;
  drawing = true;
  startX = e.offsetX;
  startY = e.offsetY;
  if(currentTool==="brush"||currentTool==="eraser"){
    ctx.beginPath();
    ctx.moveTo(startX,startY);
    saveHistory();
  } else {
    tempCtx.clearRect(0,0,tempCanvas.width,tempCanvas.height);
    tempCtx.drawImage(canvas,0,0);
    saveHistory();
  }
}

// Funkcja draw
function draw(e){
  if(!drawing) return;
  let x=e.offsetX, y=e.offsetY;

  if(currentTool==="brush"){
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineTo(x,y);
    ctx.stroke();
  } else if(currentTool==="eraser"){
    ctx.strokeStyle="white";
    ctx.lineWidth=brushSize*1.5;
    ctx.lineTo(x,y);
    ctx.stroke();
  } else if(currentTool==="spray"){
    sprayTool(x,y);
  } else if(currentTool==="rainbow"){
    rainbowBrush(x,y);
  } else if(currentTool==="meow"){
    ctx.fillStyle = currentColor;
    ctx.font = `${brushSize*2}px Arial`;
    ctx.fillText("meow", x, y);
  } else {
    // reszta narzędzi (linie, prostokąt, okrąg)
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(tempCanvas,0,0);
    ctx.strokeStyle=currentColor;
    ctx.fillStyle=currentColor;
    ctx.lineWidth=brushSize;
    let w=x-startX, h=y-startY;

    switch(currentTool){
      case "line":
        ctx.beginPath();
        ctx.moveTo(startX,startY);
        ctx.lineTo(x,y);
        ctx.stroke();
        break;
      case "rect": ctx.strokeRect(startX,startY,w,h); break;
      case "circle":
        ctx.beginPath();
        let radius=Math.sqrt(w*w+h*h);
        ctx.arc(startX,startY,radius,0,Math.PI*2);
        ctx.stroke();
        break;
    }
  }
}



// Funkcja endDraw
function endDraw(){ drawing=false; }

// EventListener
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", endDraw);
canvas.addEventListener("mouseleave", endDraw);

// Tekst i Pipeta oraz jednoklikowe narzędzia
canvas.addEventListener("click", e=>{
  if(currentTool==="text"){
    let text=prompt("Wpisz tekst:");
    if(text){
      ctx.fillStyle=currentColor;
      ctx.font=brushSize*2+"px Arial";
      ctx.fillText(text,e.offsetX,e.offsetY);
      saveHistory();
    }
  } else if(currentTool==="picker"){
    let pixel=ctx.getImageData(e.offsetX,e.offsetY,1,1).data;
    currentColor=`rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
    document.getElementById("colorPicker").value = rgbToHex(pixel[0],pixel[1],pixel[2]);
  } else if(currentTool==="randomShape"){
    randomShape();
  } else if(currentTool==="shuffle"){
    shufflePixels(e.offsetX-25,e.offsetY-25,50);
  }
});

// Zmiana narzędzia
document.querySelectorAll(".tool").forEach(btn=>{
  btn.addEventListener("click",()=>{ currentTool=btn.getAttribute("data-tool"); });
});

// Zmiana koloru i rozmiaru
document.getElementById("colorPicker").addEventListener("change", e=>{ currentColor=e.target.value; });
document.getElementById("brushSize").addEventListener("input", e=>{ brushSize=e.target.value; });

// RGB -> HEX
function rgbToHex(r,g,b){ return "#" + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1); }
// Przyciski
document.getElementById("newCanvasBtn").addEventListener("click", () => {
  if(confirm("Czy chcesz utworzyć nowy obraz?")) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveHistory();
  }
});

document.getElementById("clearBtn").addEventListener("click", () => {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveHistory();
});

document.getElementById("undoBtn").addEventListener("click", undo);
document.getElementById("redoBtn").addEventListener("click", redo);

document.getElementById("savePngBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "NinaPLUsPaint.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

document.getElementById("openImageBtn").addEventListener("click", () => {
  document.getElementById("openImageInput").click();
});

document.getElementById("openImageInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.src = event.target.result;
    img.onload = function() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      saveHistory();
    }
  };
  reader.readAsDataURL(file);
});
function fillCanvas(x, y) {
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const targetColor = getPixelColor(data, x, y);
  const fillColor = hexToRgb(currentColor);

  if(compareColors(targetColor, fillColor)) return; // jeśli już ten kolor, nic nie robimy

  const stack = [[x, y]];

  while(stack.length){
    const [cx, cy] = stack.pop();
    const idx = (cy * canvas.width + cx) * 4;

    if(compareColors(getPixelColor(data, cx, cy), targetColor)){
      data[idx] = fillColor.r;
      data[idx+1] = fillColor.g;
      data[idx+2] = fillColor.b;
      data[idx+3] = 255;

      if(cx>0) stack.push([cx-1, cy]);
      if(cx<canvas.width-1) stack.push([cx+1, cy]);
      if(cy>0) stack.push([cx, cy-1]);
      if(cy<canvas.height-1) stack.push([cx, cy+1]);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  saveHistory();
}

function getPixelColor(data, x, y){
  const idx = (y * canvas.width + x) * 4;
  return {r: data[idx], g: data[idx+1], b: data[idx+2]};
}

function compareColors(c1, c2){
  return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b;
}

function hexToRgb(hex){
  const bigint = parseInt(hex.slice(1), 16);
  return {r:(bigint>>16)&255, g:(bigint>>8)&255, b:bigint&255};
}

// Podpięcie do narzędzia
canvas.addEventListener("click", e=>{
  if(currentTool==="fill"){
    fillCanvas(e.offsetX, e.offsetY);
  }
});
// Pobierz wszystkie przyciski narzędzi
const tools = document.querySelectorAll(".tool");

tools.forEach(btn => {
  btn.addEventListener("click", () => {
    // Usuń aktywne podświetlenie z każdego przycisku
    tools.forEach(b => b.classList.remove("active"));

    // Dodaj podświetlenie do klikniętego przycisku
    btn.classList.add("active");

    // (Opcjonalnie) ustaw currentTool, jeśli chcesz używać w kodzie
    currentTool = btn.getAttribute("data-tool");
  });
});
