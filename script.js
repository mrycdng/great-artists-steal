const GRID = 20;

const canvas = document.getElementById("canvas");

const pictureBtn = document.getElementById("mode-picture");
const patternBtn = document.getElementById("mode-pattern");

const linkInput = document.getElementById("link-input");

const imageWrapper = document.getElementById("image-wrapper");
const imageEdit = document.getElementById("image-edit");
const imageButton = document.getElementById("image-button");

const linksList = document.getElementById("links-list");

let mode = null;
let cropBox = null;
let currentImage = null;
let masks = [];

document.body.style.userSelect = "none";

imageWrapper.style.display = "none";

function snap(v){
    return Math.round(v / GRID) * GRID;
}



/* MODE SELECTION */

pictureBtn.onclick = () => activateMode("picture");
patternBtn.onclick = () => activateMode("pattern");

function activateMode(m){

    mode = m;

    pictureBtn.classList.remove("mode-active");
    patternBtn.classList.remove("mode-active");

    if(m === "picture") pictureBtn.classList.add("mode-active");
    if(m === "pattern") patternBtn.classList.add("mode-active");

    linkInput.hidden = false;
}



/* URL INPUT */

linkInput.addEventListener("keydown", e => {

    if(e.key !== "Enter") return;

    const url = linkInput.value.trim();
    if(!url) return;

    loadImage(url);

    const li = document.createElement("li");
    li.innerHTML = `<a href="${url}" target="_blank">${url}</a>`;
    linksList.appendChild(li);

    linkInput.value = "";
    linkInput.hidden = true;

    pictureBtn.classList.remove("mode-active");
    patternBtn.classList.remove("mode-active");

});



/* LOAD IMAGE */

function loadImage(url){

    imageWrapper.style.display = "flex";

    imageEdit.innerHTML = "";

    const img = document.createElement("img");
    img.src = url;

    img.draggable = false;
    img.addEventListener("dragstart", e => e.preventDefault());

    imageEdit.appendChild(img);

    currentImage = img;

    img.onload = () => {

        imageEdit.style.width = img.width + "px";
        imageEdit.style.height = img.height + "px";

        createCropBox();

    };

}



/* CREATE CROP */

function createCropBox(){

    cropBox = document.createElement("div");
    cropBox.className = "crop-box";

    cropBox.style.left = "0px";
    cropBox.style.top = "0px";

    if(mode === "pattern"){
        cropBox.style.width = "20px";
        cropBox.style.height = "20px";
    }else{
        cropBox.style.width = "200px";
        cropBox.style.height = "150px";
    }

    imageEdit.appendChild(cropBox);

    createMask();

    makeCropDraggable();

    if(mode === "picture"){
        addCropResizeHandle();
    }

}



/* MASK */

function createMask(){

    masks.forEach(m => m.remove());
    masks = [];

    for(let i = 0; i < 4; i++){

        const m = document.createElement("div");

        m.style.position = "absolute";
        m.style.background = "rgba(255,255,255,.7)";
        m.style.pointerEvents = "none";

        imageEdit.appendChild(m);

        masks.push(m);
    }

    updateMask();
}



function updateMask(){

    const x = cropBox.offsetLeft;
    const y = cropBox.offsetTop;
    const w = cropBox.offsetWidth;
    const h = cropBox.offsetHeight;

    const W = imageEdit.clientWidth;
    const H = imageEdit.clientHeight;

    masks[0].style.left="0px";
    masks[0].style.top="0px";
    masks[0].style.width=W+"px";
    masks[0].style.height=y+"px";

    masks[1].style.left="0px";
    masks[1].style.top=(y+h)+"px";
    masks[1].style.width=W+"px";
    masks[1].style.height=(H-y-h)+"px";

    masks[2].style.left="0px";
    masks[2].style.top=y+"px";
    masks[2].style.width=x+"px";
    masks[2].style.height=h+"px";

    masks[3].style.left=(x+w)+"px";
    masks[3].style.top=y+"px";
    masks[3].style.width=(W-x-w)+"px";
    masks[3].style.height=h+"px";

}



/* DRAG CROP */

function makeCropDraggable(){

    let dragging=false;
    let offsetX,offsetY;

    cropBox.onmousedown = e => {

        e.preventDefault();

        dragging=true;
        offsetX=e.offsetX;
        offsetY=e.offsetY;

    };

    window.addEventListener("mousemove", e => {

        if(!dragging) return;

        const rect=imageEdit.getBoundingClientRect();

        let x=snap(e.clientX-rect.left-offsetX);
        let y=snap(e.clientY-rect.top-offsetY);

        x=Math.max(0,x);
        y=Math.max(0,y);

        cropBox.style.left=x+"px";
        cropBox.style.top=y+"px";

        updateMask();

    });

    window.addEventListener("mouseup", ()=>dragging=false);

}



/* RESIZE CROP */

function addCropResizeHandle(){

    const handle=document.createElement("div");

    handle.style.width="10px";
    handle.style.height="10px";
    handle.style.background="black";
    handle.style.position="absolute";
    handle.style.right="-5px";
    handle.style.bottom="-5px";
    handle.style.cursor="nwse-resize";

    cropBox.appendChild(handle);

    let resizing=false;

    handle.onmousedown=e=>{
        e.stopPropagation();
        resizing=true;
    };

    window.addEventListener("mousemove",e=>{

        if(!resizing) return;

        const rect=cropBox.getBoundingClientRect();

        let w=snap(e.clientX-rect.left);
        let h=snap(e.clientY-rect.top);

        w=Math.max(GRID,w);
        h=Math.max(GRID,h);

        cropBox.style.width=w+"px";
        cropBox.style.height=h+"px";

        updateMask();

    });

    window.addEventListener("mouseup",()=>resizing=false);

}



/* INSERT IMAGE */

imageButton.onclick = function(e){

    e.preventDefault();
    e.stopPropagation();

    if(!currentImage || !cropBox) return;

    const rect = cropBox.getBoundingClientRect();
    const editRect = imageEdit.getBoundingClientRect();

    const displayX = rect.left - editRect.left;
    const displayY = rect.top - editRect.top;
    const displayW = cropBox.offsetWidth;
    const displayH = cropBox.offsetHeight;

    /* convert displayed crop → real image crop */

    const scaleX = currentImage.naturalWidth / currentImage.clientWidth;
    const scaleY = currentImage.naturalHeight / currentImage.clientHeight;

    const cropX = displayX * scaleX;
    const cropY = displayY * scaleY;
    const cropW = displayW * scaleX;
    const cropH = displayH * scaleY;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = displayW;
    tempCanvas.height = displayH;

    const ctx = tempCanvas.getContext("2d");

    ctx.drawImage(
        currentImage,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        displayW,
        displayH
    );

    const croppedSrc = tempCanvas.toDataURL("image/png");

    createCanvasImage(croppedSrc, displayW, displayH);

    imageWrapper.style.display = "none";
    imageEdit.innerHTML = "";

    cropBox = null;
    currentImage = null;

};



/* CREATE CANVAS IMAGE */

function createCanvasImage(src,w,h){

    const div=document.createElement("div");

    div.className="canvas-image";
    div.style.position="absolute";

    div.style.left="0px";
    div.style.top="0px";
    div.style.width=w+"px";
    div.style.height=h+"px";

    const img=document.createElement("img");

    img.src=src;
    img.draggable=false;

    img.style.width="100%";
    img.style.height="100%";

    img.addEventListener("dragstart",e=>e.preventDefault());

    div.appendChild(img);

    canvas.appendChild(div);

    makeDraggable(div);
    addResizeHandle(div);

}



/* DRAG IMAGE */

function makeDraggable(el){

    let dragging=false;
    let ox,oy;

    el.onmousedown=e=>{

        if(e.target.classList.contains("resize-handle")) return;

        e.preventDefault();

        dragging=true;
        ox=e.offsetX;
        oy=e.offsetY;

    };

    window.addEventListener("mousemove",e=>{

        if(!dragging) return;

        let x=snap(e.clientX-ox);
        let y=snap(e.clientY-oy);

        el.style.left=x+"px";
        el.style.top=y+"px";

    });

    window.addEventListener("mouseup",()=>dragging=false);

}



/* RESIZE IMAGE */

function addResizeHandle(el){

    const handle=document.createElement("div");

    handle.className="resize-handle";

    handle.style.width="10px";
    handle.style.height="10px";
    handle.style.background="black";
    handle.style.position="absolute";
    handle.style.right="-5px";
    handle.style.bottom="-5px";
    handle.style.cursor="nwse-resize";

    el.appendChild(handle);

    let resizing=false;

    handle.onmousedown=e=>{
        e.stopPropagation();
        resizing=true;
    };

    window.addEventListener("mousemove",e=>{

        if(!resizing) return;

        const rect=el.getBoundingClientRect();

        let w=snap(e.clientX-rect.left);
        let h=snap(e.clientY-rect.top);

        w=Math.max(GRID,w);
        h=Math.max(GRID,h);

        el.style.width=w+"px";
        el.style.height=h+"px";

    });

    window.addEventListener("mouseup",()=>resizing=false);

}