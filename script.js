'use strict';

let GRID = 20;
let zTop   = 10;

let currentUrl  = '';
let currentMode = 'picture';
let imgEl = null, imgHolder = null;
let imgW = 0, imgH = 0;
let cropX = 0, cropY = 0, cropW = GRID * 4, cropH = GRID * 4;

//HTML elements
const $canvas  = document.getElementById('canvas');
const $wrapper = document.getElementById('image-wrapper');
const $edit    = document.getElementById('image-edit');
const $input   = document.getElementById('link-input');
const $upload  = document.getElementById('image-button');
const $picDiv  = document.getElementById('mode-picture');
const $patDiv  = document.getElementById('mode-pattern');
const $list    = document.getElementById('links-list');

//Init
$wrapper.style.display = 'none';
setMode('picture');

//Mode selection buttons
document.getElementById('mode-picture-button')
    .addEventListener('click', () => setMode('picture'));
document.getElementById('mode-pattern-button')
    .addEventListener('click', () => setMode('pattern'));

function setMode(m) {
    currentMode = m;
    $picDiv.classList.toggle('mode-active', m === 'picture');
    $patDiv.classList.toggle('mode-active', m === 'pattern');
    if (imgHolder) rebuildCropBox();
}

//URL input
$input.addEventListener('keydown', e => {
    if (e.key === 'Enter') openEditor($input.value.trim());
});

//Opens image editor upon URL input
function openEditor(url) {
    if (!url) return;
    currentUrl = url;
    $edit.innerHTML = '';

    imgHolder = document.createElement('div');
    imgHolder.className = 'image-container';

    imgEl = new Image();
    imgEl.draggable = false;

    imgEl.addEventListener('load', () => {

        requestAnimationFrame(() => {
            imgW = imgEl.offsetWidth;
            imgH = imgEl.offsetHeight;
            rebuildCropBox();
        });
    });

    imgEl.addEventListener('error', () => {
        imgHolder.innerHTML =
            '<p class="img-err">⚠ Couldn\'t load image — check the URL.</p>';
    });

    imgEl.src = url;
    imgHolder.appendChild(imgEl);
    $edit.appendChild(imgHolder);
    $wrapper.style.display = 'flex';
}

//Snapping to the grid
function snp(v)          { return Math.round(v / GRID) * GRID; }
function clamp(v, lo, hi){ return Math.max(lo, Math.min(v, hi)); }

//Cropping tool
function rebuildCropBox() {
    imgHolder.querySelector('.crop-box')?.remove();

    if (currentMode === 'picture') {
        cropX = 0; cropY = 0;
        cropW = snp(imgW) || GRID;
        cropH = snp(imgH) || GRID;
    } else {

        cropX = 0; cropY = 0;
        cropW = GRID; cropH = GRID;
    }

    const box = document.createElement('div');
    box.className = 'crop-box';
    syncBox(box);


    if (currentMode === 'picture') {
        ['tl','tr','bl','br'].forEach(pos => addHandle(box, pos));
    }

    imgHolder.appendChild(box);
    bindCropBox(box);
}

function syncBox(box) {
    box.style.left   = cropX + 'px';
    box.style.top    = cropY + 'px';
    box.style.width  = cropW + 'px';
    box.style.height = cropH + 'px';
}

// Corner handles
function addHandle(parent, pos) {
    const h = document.createElement('div');
    h.className      = `resize-handle handle-${pos}`;
    h.dataset.handle = pos;
    parent.appendChild(h);
}

function bindCropBox(box) {
    box.addEventListener('mousedown', e => {
        const dir = e.target.dataset.handle ?? null;
        e.preventDefault();
        e.stopPropagation();

        const sx = e.clientX, sy = e.clientY;
        const ox = cropX, oy = cropY, ow = cropW, oh = cropH;

        const onMove = e => {
            const dx = e.clientX - sx, dy = e.clientY - sy;

            if (!dir) {
                //Dragging/moving
                cropX = clamp(snp(ox + dx), 0, imgW - cropW);
                cropY = clamp(snp(oy + dy), 0, imgH - cropH);
            } else {
                // Picture resizing
                let nx = ox, ny = oy, nw = ow, nh = oh;

                if (dir.includes('r')) nw = snp(ow + dx);
                if (dir.includes('l')) { nx = snp(ox + dx); nw = ow - (nx - ox); }
                if (dir.includes('b')) nh = snp(oh + dy);
                if (dir.includes('t')) { ny = snp(oy + dy); nh = oh - (ny - oy); }

                if (nw < GRID) { nw = GRID; if (dir.includes('l')) nx = ox + ow - GRID; }
                if (nh < GRID) { nh = GRID; if (dir.includes('t')) ny = oy + oh - GRID; }

                nx = clamp(nx, 0, imgW - nw);
                ny = clamp(ny, 0, imgH - nh);
                if (nx + nw > imgW) nw = snp(imgW) - nx;
                if (ny + nh > imgH) nh = snp(imgH) - ny;

                [cropX, cropY, cropW, cropH] = [nx, ny, nw, nh];
            }

            syncBox(box);
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup',   onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup',   onUp);
    });
}

$upload.addEventListener('click', () => {
    if (!currentUrl) return;
    currentMode === 'picture' ? placePicture() : placePattern();
    pushLink(currentUrl);
    closeEditor();
});

// Editor is closed once upload button is clicked
function closeEditor() {
    $wrapper.style.display = 'none';
    $edit.innerHTML = '';
    $input.value = '';
    currentUrl = '';
    imgEl = null;
    imgHolder = null;
}

// Place picture onto canvas
function placePicture() {
    const el = document.createElement('div');
    el.className = 'canvas-image';
    el.style.width              = cropW + 'px';
    el.style.height             = cropH + 'px';
    el.style.backgroundImage    = cssUrl(currentUrl);
    el.style.backgroundSize     = `${imgW}px ${imgH}px`;
    el.style.backgroundPosition = `-${cropX}px -${cropY}px`;
    el.style.backgroundRepeat   = 'no-repeat';

    // store originals so resize can scale the crop viewport proportionally */
    el.dataset.origW  = cropW;
    el.dataset.origH  = cropH;
    el.dataset.origIW = imgW;
    el.dataset.origIH = imgH;
    el.dataset.origCX = cropX;
    el.dataset.origCY = cropY;

    ['tl','tr','bl','br'].forEach(pos => addHandle(el, pos));

    centerOnCanvas(el, cropW, cropH);
    el.style.zIndex = ++zTop;
    $canvas.appendChild(el);
    makeDraggable(el);
    makePictureResizable(el);
}

// Resize: scale background-size and background-position proportionally so the crop content zooms with the div, rather than revealing more. */
function makePictureResizable(el) {
    const origW  = parseFloat(el.dataset.origW);
    const origH  = parseFloat(el.dataset.origH);
    const origIW = parseFloat(el.dataset.origIW);
    const origIH = parseFloat(el.dataset.origIH);
    const origCX = parseFloat(el.dataset.origCX);
    const origCY = parseFloat(el.dataset.origCY);

    el.querySelectorAll('.resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', e => {
            e.preventDefault();
            e.stopPropagation();
            el.style.zIndex = ++zTop;

            const dir = handle.dataset.handle;
            const sx = e.clientX, sy = e.clientY;
            const ol = parseInt(el.style.left) || 0;
            const ot = parseInt(el.style.top)  || 0;
            const ow = el.offsetWidth;
            const oh = el.offsetHeight;

            const onMove = e => {
                const dx = e.clientX - sx, dy = e.clientY - sy;
                let nl = ol, nt = ot, nw = ow, nh = oh;

                if (dir.includes('r')) nw = snp(ow + dx);
                if (dir.includes('l')) { nl = snp(ol + dx); nw = ow - (nl - ol); }
                if (dir.includes('b')) nh = snp(oh + dy);
                if (dir.includes('t')) { nt = snp(ot + dy); nh = oh - (nt - ot); }

                if (nw < GRID) { nw = GRID; if (dir.includes('l')) nl = ol + ow - GRID; }
                if (nh < GRID) { nh = GRID; if (dir.includes('t')) nt = ot + oh - GRID; }

                // Scale background proportionally to new div dimensions
                const scX = nw / origW;
                const scY = nh / origH;

                el.style.left               = nl + 'px';
                el.style.top                = nt + 'px';
                el.style.width              = nw + 'px';
                el.style.height             = nh + 'px';
                el.style.backgroundSize     = `${origIW * scX}px ${origIH * scY}px`;
                el.style.backgroundPosition = `-${origCX * scX}px -${origCY * scY}px`;
            };

            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup',   onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup',   onUp);
        });
    });
}

//Pattern is placed onto the canvas in SVG form
function placePattern() {
    const startW = GRID * 6, startH = GRID * 6;

    const el = document.createElement('div');
    el.className = 'canvas-pattern';

    el.style.width  = startW + 'px';
    el.style.height = startH + 'px';

    el.dataset.patUrl = currentUrl;
    el.dataset.patCX  = cropX;
    el.dataset.patCY  = cropY;
    el.dataset.patIW  = imgW;
    el.dataset.patIH  = imgH;

    el.appendChild(buildTileSVG(currentUrl, cropX, cropY, imgW, imgH, startW, startH));

    ['tl','tr','bl','br'].forEach(pos => addHandle(el, pos));

    centerOnCanvas(el, startW, startH);
    el.style.zIndex = ++zTop;
    $canvas.appendChild(el);
    makeDraggable(el);
    makePatternResizable(el);
}

// SVG title
const SVG_NS = 'http://www.w3.org/2000/svg';
const XL_NS  = 'http://www.w3.org/1999/xlink';

function mkSVGEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
}

function buildTileSVG(url, cx, cy, iw, ih, w, h) {
    const patId = 'pt-' + Math.random().toString(36).slice(2, 9);

    const svg = mkSVGEl('svg');

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    svg.style.cssText =
        'display:block; width:100%; height:100%; pointer-events:none;';

    const defs = mkSVGEl('defs');
    const pat  = mkSVGEl('pattern', {
        id: patId, x: 0, y: 0,
        width: GRID, height: GRID,
        patternUnits: 'userSpaceOnUse'
    });


    const img = mkSVGEl('image', {
        x: -cx, y: -cy, width: iw, height: ih,
        preserveAspectRatio: 'none'
    });
    img.setAttributeNS(XL_NS, 'xlink:href', url); /* SVG 1.1 */
    img.setAttribute('href', url);                 /* SVG 2 */

    const rect = mkSVGEl('rect', { width: w, height: h, fill: `url(#${patId})` });
    rect.classList.add('tile-rect');

    pat.appendChild(img);
    defs.appendChild(pat);
    svg.appendChild(defs);
    svg.appendChild(rect);
    return svg;
}

//Updates rectangle dimensions for tiled pattern and ensures alignment to grid
function resizeTile(el, nw, nh) {
    const svg  = el.querySelector('svg');
    const rect = el.querySelector('.tile-rect');
    if (!svg || !rect) return;
    svg.setAttribute('viewBox', `0 0 ${nw} ${nh}`);
    rect.setAttribute('width',  nw);
    rect.setAttribute('height', nh);
    el.style.width  = nw + 'px';
    el.style.height = nh + 'px';
}

//Canvas interactions
function centerOnCanvas(el, w, h) {
    el.style.left = snp((window.innerWidth  - w) / 2) + 'px';
    el.style.top  = snp((window.innerHeight - h) / 2) + 'px';
}

function makeDraggable(el) {
    el.addEventListener('dragstart', e => e.preventDefault());

    el.addEventListener('mousedown', e => {
        if (e.target.classList.contains('resize-handle')) return;
        e.preventDefault();
        el.style.zIndex = ++zTop;

        const sx = e.clientX, sy = e.clientY;
        const ol = parseInt(el.style.left) || 0;
        const ot = parseInt(el.style.top)  || 0;

        const onMove = e => {
            el.style.left = snp(ol + e.clientX - sx) + 'px';
            el.style.top  = snp(ot + e.clientY - sy) + 'px';
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup',   onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup',   onUp);
    });
}

function makePatternResizable(el) {
    el.querySelectorAll('.resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', e => {
            e.preventDefault();
            e.stopPropagation();
            el.style.zIndex = ++zTop;

            const dir = handle.dataset.handle;
            const sx = e.clientX, sy = e.clientY;
            const ol = parseInt(el.style.left) || 0;
            const ot = parseInt(el.style.top)  || 0;
            const ow = el.offsetWidth;
            const oh = el.offsetHeight;

            const onMove = e => {
                const dx = e.clientX - sx, dy = e.clientY - sy;
                let nl = ol, nt = ot, nw = ow, nh = oh;

                if (dir.includes('r')) nw = snp(ow + dx);
                if (dir.includes('l')) { nl = snp(ol + dx); nw = ow - (nl - ol); }
                if (dir.includes('b')) nh = snp(oh + dy);
                if (dir.includes('t')) { nt = snp(ot + dy); nh = oh - (nt - ot); }

                if (nw < GRID) { nw = GRID; if (dir.includes('l')) nl = ol + ow - GRID; }
                if (nh < GRID) { nh = GRID; if (dir.includes('t')) nt = ot + oh - GRID; }

                el.style.left = nl + 'px';
                el.style.top  = nt + 'px';
                resizeTile(el, nw, nh);
            };

            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup',   onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup',   onUp);
        });
    });
}


function cssUrl(u) {
    return `url("${u.replace(/"/g, '%22')}")`;
}

function pushLink(url) {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.href        = url;
    a.target      = '_blank';
    a.rel         = 'noopener';
    a.textContent = url;
    li.appendChild(a);
    $list.appendChild(li);
}

//Save button creates a PDF
document.getElementById('save-button').addEventListener('click', async () => {
    const btn = document.getElementById('save-button');
    btn.textContent = 'saving…';
    btn.style.pointerEvents = 'none';

    try {
        const { jsPDF } = window.jspdf;

        const restores = await prerenderPatterns();
        hideChrome();

        const PAGE_W = 612, PAGE_H = 792, MARGIN = 28;
        const printW = PAGE_W - MARGIN * 2;

        const linkItems    = [...document.querySelectorAll('#links-list li')];
        const LINK_LHEIGHT = 14;
        const LINK_HEADER  = 22;
        const LINKS_BLOCK  = linkItems.length
            ? LINK_HEADER + linkItems.length * LINK_LHEIGHT + 16
            : 0;
        const printH = PAGE_H - MARGIN * 2 - LINKS_BLOCK;

        const rawCanvas = await html2canvas(document.getElementById('canvas'), {
            useCORS:         true,
            allowTaint:      true,
            backgroundColor: '#ffffff',
            scale:           2
        });

        restoreChrome();
        restorePatterns(restores);

        const imgData = rawCanvas.toDataURL('image/jpeg', 0.92);
        const scale   = Math.min(printW / rawCanvas.width, printH / rawCanvas.height);
        const destW   = rawCanvas.width  * scale;
        const destH   = rawCanvas.height * scale;
        const imgX    = MARGIN + (printW - destW) / 2;

        const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
        pdf.addImage(imgData, 'JPEG', imgX, MARGIN, destW, destH);

        //Displays links on PDF
        if (linkItems.length) {
            const listTop = PAGE_H - MARGIN - LINKS_BLOCK + 8;

            pdf.setDrawColor(180);
            pdf.setLineWidth(0.5);
            pdf.line(MARGIN, listTop - 6, PAGE_W - MARGIN, listTop - 6);

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(11);
            pdf.setTextColor(120);
            pdf.text('IMAGES STOLEN', MARGIN, listTop + 4);

            linkItems.forEach((li, i) => {
                const url = li.querySelector('a')?.href ?? li.textContent.trim();
                const y   = listTop + LINK_HEADER + i * LINK_LHEIGHT;

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(11);
                pdf.setTextColor(150);
                pdf.text(`${i + 1}.`, MARGIN, y);

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(11);
                pdf.setTextColor(0, 0, 255);
                const maxChars = 110;
                const display  = url.length > maxChars ? url.slice(0, maxChars) + '…' : url;
                pdf.text(display, MARGIN + 14, y);
            });
        }

        pdf.save('great-artists-steal.pdf');

    } finally {
        btn.textContent = 'save';
        btn.style.pointerEvents = '';
    }
});

//Hides background grid & corner handles for PDF
let _savedBg, _savedBgColor;

function hideChrome() {
    const c = document.getElementById('canvas');
    _savedBg      = c.style.backgroundImage;
    _savedBgColor = c.style.backgroundColor;
    c.style.backgroundImage  = 'none';
    c.style.backgroundColor  = '#ffffff';
    document.querySelectorAll('.resize-handle').forEach(h => h.style.visibility = 'hidden');
}

function restoreChrome() {
    const c = document.getElementById('canvas');
    c.style.backgroundImage  = _savedBg      ?? '';
    c.style.backgroundColor  = _savedBgColor ?? '';
    document.querySelectorAll('.resize-handle').forEach(h => h.style.visibility = '');
}


function loadImageAsync(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

async function prerenderPatterns() {
    const restores = [];

    for (const pat of document.querySelectorAll('.canvas-pattern')) {
        const url = pat.dataset.patUrl;
        const cx  = parseInt(pat.dataset.patCX) || 0;
        const cy  = parseInt(pat.dataset.patCY) || 0;
        const iw  = parseInt(pat.dataset.patIW) || GRID;
        const ih  = parseInt(pat.dataset.patIH) || GRID;
        const w   = pat.offsetWidth;
        const h   = pat.offsetHeight;

        const tileCanvas = document.createElement('canvas');
        tileCanvas.width  = GRID;
        tileCanvas.height = GRID;
        const tc = tileCanvas.getContext('2d');

        try {
            const img = await loadImageAsync(url);
            tc.drawImage(img, -cx, -cy, iw, ih);
        } catch (_) { /* leave tile blank if image fails */ }

        const fillCanvas = document.createElement('canvas');
        fillCanvas.width  = w;
        fillCanvas.height = h;
        const fc = fillCanvas.getContext('2d');
        fc.fillStyle = fc.createPattern(tileCanvas, 'repeat');
        fc.fillRect(0, 0, w, h);

        fillCanvas.style.cssText = 'position:absolute;top:0;left:0;display:block;pointer-events:none;';

        const svg = pat.querySelector('svg');
        restores.push({ pat, svg, fillCanvas });
        if (svg) pat.replaceChild(fillCanvas, svg);
        else     pat.appendChild(fillCanvas);
    }

    return restores;
}

function restorePatterns(restores) {
    for (const { pat, svg, fillCanvas } of restores) {
        if (fillCanvas.parentNode === pat) pat.removeChild(fillCanvas);
        if (svg) pat.appendChild(svg);
    }
}

// Grid slider that snaps to increments of 10px
document.getElementById('grid-slider').addEventListener('input', function () {
    const newGrid = parseInt(this.value);
    rescaleEverything(newGrid);
});

function rescaleEverything(newGrid) {
    const snpN = v => Math.max(newGrid, Math.round(v / newGrid) * newGrid);
    const snapPos = v => Math.round(v / newGrid) * newGrid;

    document.querySelectorAll('.canvas-image, .canvas-pattern').forEach(el => {

        el.style.left = snapPos(parseInt(el.style.left) || 0) + 'px';
        el.style.top  = snapPos(parseInt(el.style.top)  || 0) + 'px';


        const nw = snpN(el.offsetWidth);
        const nh = snpN(el.offsetHeight);

        if (el.classList.contains('canvas-pattern')) {
            resizeTile(el, nw, nh);
        } else {
            el.style.width  = nw + 'px';
            el.style.height = nh + 'px';
        }
    });

    GRID = newGrid;

//Updates canvas by new unit size
    document.getElementById('canvas').style.backgroundSize = `${newGrid}px ${newGrid}px`;
}