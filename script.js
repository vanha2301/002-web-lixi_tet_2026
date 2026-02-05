// =========================
// STORAGE
// =========================
const LS_ITEMS   = "lixi2026_items_v2";
const LS_HISTORY = "lixi2026_history_v2";

// =========================
// DEFAULT DATA
// =========================
const defaultItems = [
{ id: crypto.randomUUID(), label: "10.000đ", remain: 10 },
{ id: crypto.randomUUID(), label: "20.000đ", remain: 6 },
{ id: crypto.randomUUID(), label: "50.000đ", remain: 3 },
{ id: crypto.randomUUID(), label: "100.000đ", remain: 2 },
{ id: crypto.randomUUID(), label: "200.000đ", remain: 1 },
];

const wishes = [
"Chúc năm mới bình an, vui vẻ và nhiều may mắn!",
"Chúc học giỏi, làm việc suôn sẻ, mọi thứ hanh thông!",
"Chúc sức khỏe dồi dào, tiền vào như nước!",
"Chúc gặp nhiều cơ hội tốt và đạt mục tiêu trong năm!",
"Chúc gia đình hạnh phúc, công việc thuận lợi!"
];

// =========================
// DOM
// =========================
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const statusPill = document.getElementById("statusPill");
const remainPill = document.getElementById("remainPill");
const resultText = document.getElementById("resultText");
const wishText = document.getElementById("wishText");

const resetBtn = document.getElementById("resetBtn");
const copyBtn = document.getElementById("copyBtn");

const newLabel = document.getElementById("newLabel");
const newRemain = document.getElementById("newRemain");
const addBtn = document.getElementById("addBtn");
const itemsListEl = document.getElementById("itemsList");
const countPill = document.getElementById("countPill");
const resetItemsBtn = document.getElementById("resetItemsBtn");

const historyListEl = document.getElementById("historyList");
const historyCountPill = document.getElementById("historyCountPill");
const copyHistoryBtn = document.getElementById("copyHistoryBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const modalBackdrop = document.getElementById("modalBackdrop");
const modalMoney = document.getElementById("modalMoney");
const modalWish = document.getElementById("modalWish");
const modalRemain = document.getElementById("modalRemain");
const closeModalBtn = document.getElementById("closeModalBtn");

// ===== Ảnh center (con ngựa) =====
const centerIcon = new Image();
centerIcon.src = "ngua1.png"; // hoặc "assets/horse.png"
centerIcon.onload = () => drawWheel(); // load xong thì vẽ lại

// =========================
// STATE
// =========================
let items = loadItems();
let history = loadHistory();

let angle = 0;
let spinning = false;

let startAngle = 0;
let targetAngle = 0;
let startTime = 0;
let duration = 0;

let lastPick = null;

// =========================
// HELPERS
// =========================
const pad = (n)=> String(n).padStart(2,"0");
function formatTime(ts){
const d = new Date(ts);
return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function setStatus(s){ statusPill.textContent = s; }
function escapeHtml(s){
return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
function randomWish(){
return wishes[Math.floor(Math.random() * wishes.length)];
}
function normalize2pi(a){
a = a % (Math.PI*2);
if(a < 0) a += Math.PI*2;
return a;
}
function safeInt(v, fallback=0){
const n = Number.parseInt(v, 10);
return Number.isFinite(n) ? n : fallback;
}

// =========================
// LOAD/SAVE
// =========================
function loadItems(){
try{
    const raw = localStorage.getItem(LS_ITEMS);
    if(!raw) return JSON.parse(JSON.stringify(defaultItems));
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr) || arr.length === 0) return JSON.parse(JSON.stringify(defaultItems));
    return arr.map(x => ({
    id: String(x.id || crypto.randomUUID()),
    label: String(x.label || "").trim(),
    remain: Math.max(0, safeInt(x.remain, 0))
    }));
}catch{
    return JSON.parse(JSON.stringify(defaultItems));
}
}
function saveItems(){
localStorage.setItem(LS_ITEMS, JSON.stringify(items));
}

function loadHistory(){
try{
    const raw = localStorage.getItem(LS_HISTORY);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr)) return [];
    return arr.map(h => ({
    ts: Number(h.ts || Date.now()),
    id: String(h.id || ""),
    label: String(h.label || ""),
    wish: String(h.wish || ""),
    remain_after: Math.max(0, safeInt(h.remain_after, 0))
    })).filter(h => h.label);
}catch{
    return [];
}
}
function saveHistory(){
localStorage.setItem(LS_HISTORY, JSON.stringify(history));
}

// =========================
// ACTIVE ITEMS (remain > 0)
// =========================
function getActiveItems(){
return items
    .map(x => ({...x, label: String(x.label || "").trim()}))
    .filter(x => x.label && x.remain > 0);
}
function totalRemaining(){
return getActiveItems().reduce((s, x) => s + x.remain, 0);
}

// =========================
// UI: ITEMS
// =========================
function updatePills(){
countPill.textContent = `${items.length} items`;
historyCountPill.textContent = `${history.length} lượt`;
remainPill.textContent = `Còn: ${totalRemaining()}`;
}

function renderItems(){
itemsListEl.innerHTML = "";
items.forEach((it, idx) => {
    const row = document.createElement("div");
    row.className = "itemRow";

    const inpLabel = document.createElement("input");
    inpLabel.type = "text";
    inpLabel.value = it.label;
    inpLabel.placeholder = "Tên item...";
    inpLabel.addEventListener("input", () => {
    items[idx].label = inpLabel.value;
    saveItems();
    updatePills();
    drawWheel();
    validateWheel();
    });

    const inpRemain = document.createElement("input");
    inpRemain.type = "number";
    inpRemain.min = "0";
    inpRemain.step = "1";
    inpRemain.value = String(it.remain);
    inpRemain.title = "Số lần còn lại";
    inpRemain.addEventListener("input", () => {
    items[idx].remain = Math.max(0, safeInt(inpRemain.value, 0));
    saveItems();
    updatePills();
    drawWheel();
    validateWheel();
    });

    const del = document.createElement("button");
    del.className = "miniBtn btnDanger";
    del.textContent = "Xóa";
    del.addEventListener("click", () => {
    if(spinning) return;
    items.splice(idx, 1);
    if(items.length === 0) items = JSON.parse(JSON.stringify(defaultItems));
    saveItems();
    renderItems();
    updatePills();
    drawWheel();
    validateWheel();
    });

    row.appendChild(inpLabel);
    row.appendChild(inpRemain);
    row.appendChild(del);
    itemsListEl.appendChild(row);
});
}

function addItem(){
if(spinning) return;
const label = (newLabel.value || "").trim();
const remain = Math.max(0, safeInt(newRemain.value, 1));
if(!label){
    alert("Nhập tên item trước nhé.");
    return;
}
items.push({ id: crypto.randomUUID(), label, remain });
newLabel.value = "";
newRemain.value = "";
saveItems();
renderItems();
updatePills();
drawWheel();
validateWheel();
}

function resetItems(){
if(spinning) return;
items = JSON.parse(JSON.stringify(defaultItems));
saveItems();
renderItems();
updatePills();
drawWheel();
validateWheel();
setStatus("Đã reset items");
setTimeout(()=> setStatus("Sẵn sàng"), 900);
}

// =========================
// UI: HISTORY
// =========================
function renderHistory(){
historyListEl.innerHTML = "";
if(history.length === 0){
    const empty = document.createElement("div");
    empty.className = "hisRow";
    empty.innerHTML = `<div class="muted">Chưa có lịch sử.</div>`;
    historyListEl.appendChild(empty);
    return;
}

const arr = [...history].reverse(); // newest first
for(const h of arr){
    const el = document.createElement("div");
    el.className = "hisRow";
    el.innerHTML = `
    <div class="hisTop">
        <div class="hisPick">${escapeHtml(h.label)}</div>
        <div class="hisTime">${escapeHtml(formatTime(h.ts))}</div>
    </div>
    <div class="hisWish">${escapeHtml(h.wish)}</div>
    <div class="hisRemain">Còn lại: ${escapeHtml(String(h.remain_after))}</div>
    `;
    historyListEl.appendChild(el);
}
}

function pushHistory(entry){
history.push(entry);
saveHistory();
updatePills();
renderHistory();
}

async function copyHistory(){
if(history.length === 0){
    alert("Chưa có lịch sử để copy.");
    return;
}
const lines = history.map(h => `${formatTime(h.ts)} | ${h.label} | còn ${h.remain_after} | ${h.wish}`);
try{
    await navigator.clipboard.writeText(lines.join("\n"));
    setStatus("Đã copy lịch sử ✅");
    setTimeout(()=> setStatus("Sẵn sàng"), 900);
}catch{
    alert("Không copy được (trình duyệt chặn).");
}
}

function clearHistory(){
if(!confirm("Xóa toàn bộ lịch sử?")) return;
history = [];
saveHistory();
updatePills();
renderHistory();
setStatus("Đã xóa lịch sử");
setTimeout(()=> setStatus("Sẵn sàng"), 900);
}

// =========================
// CANVAS RESPONSIVE
// =========================
function resizeCanvas(){
const cssSize = Math.min(canvas.clientWidth || 560, 560);
const dpr = Math.max(1, window.devicePixelRatio || 1);
const px = Math.floor(cssSize * dpr);
if(canvas.width !== px || canvas.height !== px){
    canvas.width = px;
    canvas.height = px;
}
// draw in CSS pixels
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
drawWheel();
}

// =========================
// WHEEL DRAW
// =========================
function hsl(h, s, l){ return `hsl(${h}, ${s}%, ${l}%)`; }

function textColorForLightness(l){
  // nền sáng -> chữ đen, nền tối -> chữ trắng
  return (l >= 58) ? "rgba(0,0,0,.85)" : "rgba(255,255,255,.92)";
}

// Bảng màu Tết 2026 (đỏ - vàng - cam - hồng - xanh ngọc)
const tetHues = [0, 12, 28, 45, 55, 120, 330];
function getTetHue(i){
  return tetHues[i % tetHues.length];
}

// function drawWheel(){
// const active = getActiveItems();
// const size = canvas.clientWidth || 560;
// const W = size, H = size;
// const cx = W/2, cy = H/2;
// const radius = Math.min(W,H) * 0.43;

// ctx.clearRect(0,0,W,H);

// // outer ring
// ctx.beginPath();
// ctx.arc(cx, cy, radius+18, 0, Math.PI*2);
// ctx.fillStyle = "rgba(255,255,255,.04)";
// ctx.fill();

// if(active.length === 0){
//     // center text only
//     drawCenter(cx, cy, "HẾT", "LÌ XÌ");
//     return;
// }

// const n = active.length;
// const slice = (Math.PI*2)/n;

// // Start at TOP (pointer)
// const base = angle - Math.PI/2;

// for(let i=0;i<n;i++){
//     const a0 = base + i*slice;
//     const a1 = a0 + slice;

//     const even = i % 2 === 0;
//     ctx.beginPath();
//     ctx.moveTo(cx, cy);
//     ctx.arc(cx, cy, radius, a0, a1);
//     ctx.closePath();
//     ctx.fillStyle = even ? "rgba(239,68,68,.86)" : "rgba(250,204,21,.82)";
//     ctx.fill();

//     // label
//     ctx.save();
//     ctx.translate(cx, cy);
//     ctx.rotate(a0 + slice/2);
//     ctx.textAlign = "right";
//     ctx.fillStyle = "rgba(0,0,0,.88)";
//     ctx.font = "900 14px system-ui";

//     const label = String(active[i].label);
//     const short = label.length > 16 ? label.slice(0, 16) + "…" : label;
//     ctx.fillText(short, radius - 14, 5);
//     ctx.restore();
// }

// drawCenter(cx, cy, "CHẠM", "TẾT 2026");
// }

function drawWheel(){
  const active = getActiveItems();
  const size = canvas.clientWidth || 560;
  const W = size, H = size;
  const cx = W/2, cy = H/2;
  const radius = Math.min(W,H) * 0.43;

  ctx.clearRect(0,0,W,H);

  // ===== Outer glow ring (đẹp hơn) =====
  ctx.save();
  const ringGrad = ctx.createRadialGradient(cx, cy, radius+6, cx, cy, radius+30);
  ringGrad.addColorStop(0, "rgba(255,255,255,.06)");
  ringGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius+30, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  if(active.length === 0){
    drawCenter(cx, cy, "HẾT", "LÌ XÌ");
    return;
  }

  const n = active.length;
  const slice = (Math.PI*2)/n;

  // Start at TOP (pointer)
  const base = angle - Math.PI/2;

  // ===== Wheel shadow (cho nổi) =====
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;

  // nền vòng (để shadow đẹp)
  ctx.beginPath();
  ctx.arc(cx, cy, radius+2, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,255,255,.02)";
  ctx.fill();
  ctx.restore();


  // ===== Draw slices: mỗi miếng 1 màu HSL + gradient =====
  for(let i=0;i<n;i++){
    const a0 = base + i*slice;
    const a1 = a0 + slice;
    const mid = a0 + slice/2;

    // màu Tết 2026 theo bảng hue
    const hue = getTetHue(i);
    const S = 80;            // độ “rực”
    const L = 56;            // độ sáng
    const c1 = hsl(hue, S, L+8);
    const c2 = hsl(hue, S, L-10);

    // gradient theo hướng ra ngoài
    const gx = cx + Math.cos(mid) * radius;
    const gy = cy + Math.sin(mid) * radius;
    const g = ctx.createLinearGradient(cx, cy, gx, gy);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);

    // slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, a0, a1);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    // viền phân cách miếng
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.stroke();

    // ===== Label: dễ đọc, không bị xoay kỳ =====
    const label = String(active[i].label);
    const short = label.length > 18 ? label.slice(0, 18) + "…" : label;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(mid);
    ctx.translate(radius * 0.72, 0);

    // để chữ “đứng” (không bị lộn ngược)
    let rot = Math.PI/2;
    if(mid > Math.PI/2 && mid < 3*Math.PI/2) rot = -Math.PI/2;
    ctx.rotate(rot);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 30px system-ui";

    // chọn màu chữ theo độ sáng L
    const tcol = textColorForLightness(L);
    ctx.fillStyle = tcol;

    // viền chữ nhẹ để nổi trên mọi nền
    ctx.lineWidth = 3;
    ctx.strokeStyle = (tcol.includes("255")) ? "rgba(0,0,0,.35)" : "rgba(255,255,255,.35)";
    ctx.strokeText(short, 0, 0);
    ctx.fillText(short, 0, 0);

    ctx.restore();
  }

  // ===== Center button đẹp hơn =====
  // vòng trong
  ctx.save();
  
  ctx.shadowColor = "rgba(0,0,0,.5)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;

  const coreGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 56);
  coreGrad.addColorStop(0, "rgba(15,23,42,.95)");
  coreGrad.addColorStop(1, "rgba(2,6,23,.92)");

  ctx.beginPath();
  ctx.arc(cx, cy, 56, 0, Math.PI*2);
  ctx.fillStyle = coreGrad;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,.14)";
  ctx.stroke();
  ctx.restore();

  // text center
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "900 14px system-ui";
  ctx.fillText("CHẠM", cx, cy-2);

  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.font = "800 12px system-ui";
  ctx.fillText("TẾT 2026", cx, cy+16);

  // highlight nhỏ ở trên (cho bóng bẩy)
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.arc(cx-12, cy-16, 18, 0, Math.PI*2);
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.restore();

    // ===== Vẽ ảnh con ngựa vào nút tròn center (clip hình tròn) =====
// const r = 56; // phải giống bán kính nút center bạn đang dùng
// if (centerIcon.complete && centerIcon.naturalWidth > 0) {
//   ctx.save();

//   // cắt theo hình tròn
//   ctx.beginPath();
//   ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
//   ctx.clip();

//   // vẽ kiểu "cover" (ảnh luôn đầy vòng tròn, không méo)
//   const size = (r - 4) * 2;
//   const iw = centerIcon.naturalWidth;
//   const ih = centerIcon.naturalHeight;
//   const scale = Math.max(size / iw, size / ih);
//   const sw = iw * scale;
//   const sh = ih * scale;

//   ctx.globalAlpha = 0.95;
//   ctx.drawImage(centerIcon, cx - sw / 2, cy - sh / 2, sw, sh);

//   ctx.restore();
// }
}


function drawCenter(cx, cy, line1, line2){
// center circle
ctx.beginPath();
ctx.arc(cx, cy, 56, 0, Math.PI*2);
ctx.fillStyle = "rgba(2,6,23,.88)";
ctx.fill();
ctx.lineWidth = 2;
ctx.strokeStyle = "rgba(255,255,255,.12)";
ctx.stroke();

ctx.textAlign = "center";
ctx.fillStyle = "rgba(255,255,255,.92)";
ctx.font = "900 14px system-ui";
ctx.fillText(line1, cx, cy-2);

ctx.fillStyle = "rgba(255,255,255,.72)";
ctx.font = "800 12px system-ui";
ctx.fillText(line2, cx, cy+16);
}

// =========================
// PICK: weighted by remain
// =========================
function pickWeighted(active){
const total = active.reduce((s, x) => s + x.remain, 0);
if(total <= 0) return null;

let r = Math.random() * total;
for(let i=0;i<active.length;i++){
    r -= active[i].remain;
    if(r < 0) return { idx: i, item: active[i] };
}
// fallback
return { idx: active.length-1, item: active[active.length-1] };
}

// For n slices, selected index is based on (-angle mod 2pi)
function getSelectedIndex(n){
const slice = (Math.PI*2)/n;
const a = normalize2pi(angle);
const rel = normalize2pi((Math.PI*2) - a); // == (-angle) mod 2pi
return Math.max(0, Math.min(n-1, Math.floor(rel / slice)));
}

// Compute endAngle that lands on a given idx
function computeEndAngleForIndex(startAbsAngle, n, idx){
const slice = (Math.PI*2)/n;

// Choose rel inside that slice (avoid exact boundary)
const rel = idx*slice + (Math.random()*0.92 + 0.04) * slice; // 4%..96%
const endMod = normalize2pi((Math.PI*2) - rel);

const currMod = normalize2pi(startAbsAngle);
const deltaMod = normalize2pi(endMod - currMod);

const turns = 6 + Math.random() * 5; // 6..11 turns
return startAbsAngle + turns*(Math.PI*2) + deltaMod;
}

// =========================
// SPIN (by clicking wheel)
// =========================
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

function validateWheel(){
const active = getActiveItems();
const ok = active.length >= 1;
canvas.classList.toggle("disabled", !ok || spinning);
if(!ok){
    setStatus("Hết lì xì");
}else if(!spinning){
    setStatus("Sẵn sàng");
}
}

function startSpin(){
if(spinning) return;

const active = getActiveItems();
if(active.length === 0){
    alert("Đã hết lì xì (tất cả số lần đều = 0).");
    return;
}

spinning = true;
validateWheel();
resetBtn.disabled = true;
copyBtn.disabled = true;

setStatus("Đang chạy…");
resultText.textContent = "—";
wishText.textContent = "—";

// Pick target by remaining (weighted)
const picked = pickWeighted(active);
if(!picked){
    spinning = false;
    validateWheel();
    resetBtn.disabled = false;
    return;
}

startAngle = angle;
targetAngle = computeEndAngleForIndex(startAngle, active.length, picked.idx);

duration = 2200 + Math.random()*1400;
startTime = performance.now();
requestAnimationFrame(tick);
}

function tick(now){
const t = (now - startTime) / duration;
if(t >= 1){
    angle = targetAngle;
    spinning = false;

    const active = getActiveItems();
    drawWheel();

    // Determine final idx (should match)
    const finalIdx = active.length ? getSelectedIndex(active.length) : 0;
    const win = active[finalIdx];
    if(!win){
    setStatus("Sẵn sàng");
    resetBtn.disabled = false;
    validateWheel();
    return;
    }

    // Decrease remain in MAIN items list
    const wish = randomWish();
    const pos = items.findIndex(x => x.id === win.id);
    if(pos !== -1){
    items[pos].remain = Math.max(0, items[pos].remain - 1);
    saveItems();
    }

    // update UI
    renderItems();
    updatePills();
    drawWheel();
    validateWheel();

    lastPick = { label: win.label, wish, remain_after: (pos !== -1 ? items[pos].remain : 0), id: win.id };

    resultText.textContent = win.label;
    wishText.textContent = wish;
    setStatus("Xong ✅");
    resetBtn.disabled = false;
    copyBtn.disabled = false;

    // history
    pushHistory({
    ts: Date.now(),
    id: win.id,
    label: win.label,
    wish,
    remain_after: lastPick.remain_after
    });

    // modal
    modalMoney.textContent = win.label;
    modalWish.textContent = wish;
    modalRemain.textContent = `Còn lại: ${lastPick.remain_after}`;
    modalBackdrop.classList.add("open");
    return;
}

const k = easeOutCubic(t);
angle = startAngle + (targetAngle - startAngle) * k;
drawWheel();
requestAnimationFrame(tick);
}

function reset(){
if(spinning) return;
angle = 0;
resultText.textContent = "—";
wishText.textContent = "—";
copyBtn.disabled = true;
drawWheel();
validateWheel();
setStatus("Đã reset");
setTimeout(()=> validateWheel(), 700);
}

async function copyResult(){
if(!lastPick) return;
const msg = `Lì xì Tết 2026: ${lastPick.label} | còn ${lastPick.remain_after} | ${lastPick.wish}`;
try{
    await navigator.clipboard.writeText(msg);
    setStatus("Đã copy ✅");
    setTimeout(()=> validateWheel(), 900);
}catch{
    alert("Không copy được (trình duyệt chặn).");
}
}

function closeModal(){
modalBackdrop.classList.remove("open");
}

// =========================
// EVENTS
// =========================
canvas.addEventListener("click", () => {
// Only spin when click wheel
if(canvas.classList.contains("disabled")) return;
startSpin();
});

document.addEventListener("keydown", (e) => {
  // Space = quay
  if (e.code === "Space" || e.key === " ") {
    // Không quay nếu đang gõ trong input/textarea
    const el = document.activeElement;
    const tag = (el?.tagName || "").toLowerCase();
    const isTyping = tag === "input" || tag === "textarea" || el?.isContentEditable;

    if (isTyping) return;

    // Tránh bị giữ phím space quay liên tục
    if (e.repeat) return;

    // Chặn space làm trang scroll xuống
    e.preventDefault();

    // Nếu vòng đang “disabled” thì thôi
    if (canvas.classList.contains("disabled")) return;

    startSpin();
  }
});


resetBtn.addEventListener("click", reset);
copyBtn.addEventListener("click", copyResult);

addBtn.addEventListener("click", addItem);
newLabel.addEventListener("keydown", (e)=> {
if(e.key === "Enter"){ e.preventDefault(); addItem(); }
});
newRemain.addEventListener("keydown", (e)=> {
if(e.key === "Enter"){ e.preventDefault(); addItem(); }
});

resetItemsBtn.addEventListener("click", resetItems);

copyHistoryBtn.addEventListener("click", copyHistory);
clearHistoryBtn.addEventListener("click", clearHistory);

modalBackdrop.addEventListener("click", (e)=> {
if(e.target === modalBackdrop) closeModal();
});
closeModalBtn.addEventListener("click", closeModal);

window.addEventListener("resize", resizeCanvas);

// =========================
// INIT
// =========================
function renderHistory(){
historyListEl.innerHTML = "";
if(history.length === 0){
    const empty = document.createElement("div");
    empty.className = "hisRow";
    empty.innerHTML = `<div class="muted">Chưa có lịch sử.</div>`;
    historyListEl.appendChild(empty);
    return;
}
const arr = [...history].reverse();
for(const h of arr){
    const el = document.createElement("div");
    el.className = "hisRow";
    el.innerHTML = `
    <div class="hisTop">
        <div class="hisPick">${escapeHtml(h.label)}</div>
        <div class="hisTime">${escapeHtml(formatTime(h.ts))}</div>
    </div>
    <div class="hisWish">${escapeHtml(h.wish)}</div>
    <div class="hisRemain">Còn lại: ${escapeHtml(String(h.remain_after))}</div>
    `;
    historyListEl.appendChild(el);
}
}

// initial renders
renderItems();
renderHistory();
updatePills();

requestAnimationFrame(()=> {
resizeCanvas();
drawWheel();
validateWheel();
});
