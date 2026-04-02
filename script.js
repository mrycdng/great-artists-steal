const canvas = document.getElementById("canvas")
const selectBtn = document.getElementById("selectBtn")
const urlBox = document.getElementById("urlBox")

const COLS = 16, ROWS = 20
const cellW = canvas.clientWidth / COLS, cellH = canvas.clientHeight / ROWS

let state = "idle", startCell = null, tempSelection = null;
let currentFades = []; // only for the current selection

/* create grid */
for (let i = 0; i < COLS * ROWS; i++) {
    let c = document.createElement("div"); c.className = "cell"; canvas.appendChild(c);
}

function snap(x, y) { return { col: Math.floor(x / cellW), row: Math.floor(y / cellH) } }
function clearTempSelection() { if (tempSelection) { tempSelection.remove(); tempSelection = null; } }
function clearCurrentFades() { currentFades.forEach(f => f.remove()); currentFades = []; }

/* draw selection */
function drawSelection(c1, r1, c2, r2) {
    if (!tempSelection) { tempSelection = document.createElement("div"); tempSelection.className = "selection"; canvas.appendChild(tempSelection); }
    let x = Math.min(c1, c2) * cellW, y = Math.min(r1, r2) * cellH;
    let w = (Math.abs(c2 - c1) + 1) * cellW, h = (Math.abs(r2 - r1) + 1) * cellH;
    tempSelection.style.left = x + "px";
    tempSelection.style.top = y + "px";
    tempSelection.style.width = w + "px";
    tempSelection.style.height = h + "px";
}

selectBtn.onclick = () => {
    state = "selecting"; startCell = null;
    clearTempSelection();
    clearCurrentFades();
}

/* cancel current selection if clicking outside it */
canvas.addEventListener("pointerdown", e => {
    if (state === "selecting") {
        e.preventDefault();
        let rect = canvas.getBoundingClientRect();
        let pos = snap(e.clientX - rect.left, e.clientY - rect.top);

        // if a tempSelection exists and click is outside, clear it
        if (tempSelection) {
            let selRect = tempSelection.getBoundingClientRect();
            if (!(e.clientX >= selRect.left && e.clientX <= selRect.right &&
                e.clientY >= selRect.top && e.clientY <= selRect.bottom)) {
                clearTempSelection();
                clearCurrentFades();
            }
        }

        startCell = pos;
        drawSelection(pos.col, pos.row, pos.col, pos.row); // start new selection
    }
})

canvas.addEventListener("pointermove", e => {
    if (state !== "selecting" || !startCell) return;
    let rect = canvas.getBoundingClientRect()
    let pos = snap(e.clientX - rect.left, e.clientY - rect.top)
    drawSelection(startCell.col, startCell.row, pos.col, pos.row)
})

canvas.addEventListener("pointerup", () => {
    if (state !== "selecting" || !tempSelection) return;
    startCell = null;
    state = "selection-made";
    spawnSelectionConfirm();
})

/* selection confirmation */
function spawnSelectionConfirm() {
    let btn = document.createElement("button")
    btn.textContent = "✔"; btn.className = "confirmBtn"
    btn.style.left = tempSelection.style.left;
    btn.style.top = tempSelection.style.top;
    canvas.appendChild(btn)
    btn.onclick = () => {
        btn.remove()
        selectBtn.disabled = true
        urlBox.style.display = "block"; urlBox.focus()
    }
}

/* URL input */
urlBox.addEventListener("focus", () => urlBox.classList.add("active"))
urlBox.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        insertImage(urlBox.value)
        urlBox.value = ""; urlBox.style.display = "none"; selectBtn.disabled = false
        clearTempSelection()
        state = "idle"
    }
})

/* insert image */
function insertImage(url) {
    clearCurrentFades(); // remove only temporary selection fades

    let r = tempSelection.getBoundingClientRect()
    let c = canvas.getBoundingClientRect()
    let x = r.left - c.left, y = r.top - c.top, w = r.width, h = r.height

    // create fades outside selection
    currentFades.push(createFade(0, 0, canvas.clientWidth, y))
    currentFades.push(createFade(0, y + h, canvas.clientWidth, canvas.clientHeight - (y + h)))
    currentFades.push(createFade(0, y, x, h))
    currentFades.push(createFade(x + w, y, canvas.clientWidth - (x + w), h))

    // add image to fill selection completely (cropped if needed)
    let stage = document.createElement("div")
    stage.className = "imageStage"
    stage.style.left = x + "px"
    stage.style.top = y + "px"
    stage.style.width = w + "px"
    stage.style.height = h + "px"
    let img = document.createElement("img")
    img.src = url
    stage.appendChild(img)
    canvas.appendChild(stage)
}

function createFade(x, y, w, h) {
    let f = document.createElement("div"); f.className = "fade"
    f.style.left = x + "px"; f.style.top = y + "px"; f.style.width = w + "px"; f.style.height = h + "px"
    canvas.appendChild(f); return f
}