// Modelo 3D del living-comedor. Unidades: metros.
// x = ancho (0 = medianera izquierda), z = profundidad (0 = frente de mesada, 6 = ventanal).
import * as THREE from "three";
import { OrbitControls } from "three/addons/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/CSS2DRenderer.js";

const stage = document.getElementById("stage");
const labelsEl = document.getElementById("labels");

// ---------- datos de cada distribución (para la tarjeta) ----------
const OPTIONS = {
  A: {
    title: "Tus muebles", badge: "Opción 1",
    desc: "Con tus muebles: sillón a medida de 180 en dos módulos, con el de 130 del lado del ventanal, ratona al costado, mesa Oliva ovalada con 2 sillas junto a la cocina y la oficina con la impresora junto al ventanal.",
    metrics: [
      ["Paso frente al sillón", "1,46 m"],
      ["Paso frente al módulo 130", "1,16 m"],
      ["Paso al balcón", "1,20 m"],
      ["Ratona a silla comedor", "0,32 m"],
    ],
    note: ["good", "Entra todo con buen paso. Si sumás una tercera silla, va del lado del pasillo."],
    listTitle: "Muebles (cm)",
    list: [
      ["Sillón a medida", "180: 90×100 + 90×130"], ["Brazos", "15 ancho × 80 prof."], ["Mesa Oliva", "120 × 80 oval"], ["Sillas", "2 (hasta 3)"],
      ["Rack TV", "160 × 34"], ["Mesa ratona", "45 × 70"], ["Mueble impresora", "130 × 40"], ["Escritorio", "120 × 60"],
    ],
  },
  A2: {
    title: "Más amplia", badge: "Opción 2",
    desc: "La misma distribución que la opción 1, pero con el sillón de 180 todo a 100 de profundidad (sin el módulo de 130) y la mesa redonda. El living gana un poco de paso.",
    metrics: [
      ["Paso frente al sillón", "1,50 m", "+4 cm", "up"],
      ["Paso al balcón", "1,20 m"],
      ["Ratona a silla comedor", "0,20 m"],
      ["Piso libre", "+0,4 m²", "vs. opción 1", "up"],
    ],
    note: ["good", "Las etiquetas naranjas del 3D marcan los muebles que cambian."],
    listTitle: "Qué cambia respecto de la opción 1",
    list: [
      ["Sillón", "90×100 + 90×130", "180 × 100"],
      ["Mesa comedor", "120 × 80 oval", "Ø 100"],
      ["Rack TV", "34 prof.", "30 flotante"],
      ["Mesa ratona", "45 × 70", "Ø 55"],
      ["Mueble impresora", "130 × 40"],
      ["Escritorio", "120 × 60"],
      ["Sillas", "2"],
    ],
  },
  B: {
    title: "Living al ventanal", badge: "Opción 3",
    desc: "El living pasa al ventanal, con la mejor luz y vista al balcón. El escritorio queda en el medio, contra el tabique del dormitorio, y la impresora enfrente.",
    metrics: [
      ["Paso central", "1,20 m"],
      ["Paso al balcón", "1,16 m"],
      ["Paso frente al sillón", "1,46 m"],
      ["Frente a la mesada", "0,90 m"],
    ],
    note: ["warn", "Para ir al balcón se pasa frente al módulo de 130 (1,16 m) y el escritorio queda lejos del ventanal, sin luz natural."],
    listTitle: "Muebles (cm)",
    list: [
      ["Sillón a medida", "180: 90×100 + 90×130"], ["Mesa Oliva", "120 × 80 oval"], ["Sillas", "2 (hasta 3)"],
      ["Rack TV", "160 × 34"], ["Mesa ratona", "45 × 70"], ["Mueble impresora", "130 × 40"], ["Escritorio", "120 × 60"],
    ],
  },
};

// ---------- WebGL disponible? ----------
function webglOK(){
  try{ const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
  catch(e){ return false; }
}
const has3D = webglOK();
if(!has3D){
  const f = document.createElement("p");
  f.className = "fallback";
  f.innerHTML = 'Tu navegador no puede mostrar 3D. <a href="planos.html">Ver los planos</a>';
  stage.appendChild(f);
}

const isTouch = matchMedia("(pointer: coarse)").matches || matchMedia("(hover: none)").matches || "ontouchstart" in window;
const H = 2.6;
const SHOT = new URLSearchParams(location.search).has("shot"); // capturas para la vista previa al compartir

const WALLS = [
  [-0.20,-2.98,0.00,6.00],[1.31,-2.98,1.43,-0.55],[-0.20,-2.98,0.23,-2.83],[1.13,-2.98,1.43,-2.83],
  [1.31,-0.69,5.60,-0.55],[2.80,1.20,4.00,1.30],[3.89,-0.55,4.00,1.30],[3.89,2.17,5.45,2.27],
  [2.80,2.17,2.90,6.00],[5.45,-0.69,5.60,6.10],
];
const C = {
  wall:0xf3f1ec, floor:0xc9a77f, counter:0xe4e2dd, fridge:0xd8dadc, sofa:0xa9a59c, cushion:0xb9b5ac,
  wood:0x9a7350, woodLight:0xc49a6c, black:0x26292c, metal:0x8d9296, glass:0xbfd9e6, bed:0xe8e4dc,
  balcony:0xb8b4ab, plant:0x5d7f5a, printer:0x3b3f43, rug:0xd9d2c4
};
// desk.pos = esquina del escritorio contra la pared; rot = 0 (pared a la izquierda, x=0) o PI (contra el tabique)
const LAYOUTS = {
  A:{
    sofa:{x:0,z:2.5,d:1.0,l:1.8,chaise:{w:0.9,d:1.3},modules:[{w:0.9,d:1.0},{w:0.9,d:1.3}],arm:{w:0.15,d:0.8,h:0.6},label:"180 · 90×100 + 90×130"},
    rack:{z:2.7,d:0.34,l:1.6,h:0.5,y0:0,label:"160 × 34"},
    tvz:3.5,
    ratona:{type:"box",x:0.05,z:2.04,w:0.7,d:0.45,label:"45 × 70"},
    mesa:{type:"oval",name:"Mesa Oliva",x:1.0,z:0.9,w:0.8,d:1.2,label:"120 × 80 oval"},
    sillas:[[0.72,1.5],[2.08,1.5]],
    desk:{pos:[0,4.8],rot:0},
    printer:{x:2.4,z:4.6,w:0.4,d:1.3,h:0.8,front:-1,label:"130 × 40"},
    changed:{},
  },
  A2:{
    sofa:{x:0,z:2.6,d:1.0,l:1.8,label:"180 × 100"},
    rack:{z:2.8,d:0.30,l:1.6,h:0.38,y0:0.35,label:"160 × 30"},
    tvz:3.6,
    ratona:{type:"round",x:0.35,z:2.3,r:0.275,label:"Ø 55"},
    mesa:{type:"round",name:"Mesa redonda",x:1.4,z:1.65,r:0.5,label:"Ø 100"},
    sillas:[[0.78,1.65],[2.02,1.65]],
    desk:{pos:[0,4.8],rot:0},
    printer:{x:2.4,z:4.6,w:0.4,d:1.3,h:0.8,front:-1,label:"130 × 40"},
    changed:{sofa:true,rack:true,ratona:true,mesa:true},
  },
  B:{
    sofa:{x:0,z:3.9,d:1.0,l:1.8,chaise:{w:0.9,d:1.3},modules:[{w:0.9,d:1.0},{w:0.9,d:1.3}],arm:{w:0.15,d:0.8,h:0.6},label:"180 · 90×100 + 90×130"},
    rack:{z:4.1,d:0.34,l:1.6,h:0.5,y0:0,label:"160 × 34"},
    tvz:4.9,
    ratona:{type:"box",x:0.05,z:3.43,w:0.7,d:0.45,label:"45 × 70"},
    mesa:{type:"oval",name:"Mesa Oliva",x:1.0,z:0.9,w:0.8,d:1.2,label:"120 × 80 oval"},
    sillas:[[0.72,1.5],[2.08,1.5]],
    desk:{pos:[2.8,3.5],rot:Math.PI},
    printer:{x:0,z:2.1,w:0.4,d:1.3,h:0.8,front:1,label:"130 × 40"},
    changed:{},
  },
  C:{
    // escritorio en el rincón del ventanal, mirando hacia afuera; living corrido 15 cm hacia la cocina
    sofa:{x:0,z:2.35,d:1.0,l:1.8,chaise:{w:0.9,d:1.3},modules:[{w:0.9,d:1.0},{w:0.9,d:1.3}],arm:{w:0.15,d:0.8,h:0.6},label:"180 · 90×100 + 90×130"},
    rack:{z:2.45,d:0.34,l:1.6,h:0.5,y0:0,label:"160 × 34"},
    tvz:3.25,
    ratona:{type:"box",x:0.05,z:1.89,w:0.7,d:0.45,label:"45 × 70"},
    mesa:{type:"oval",name:"Mesa Oliva",x:1.0,z:0.9,w:0.8,d:1.2,label:"120 × 80 oval"},
    sillas:[[0.72,1.5],[2.08,1.5]],
    desk:{pos:[0,5.95],rot:Math.PI/2},
    printer:{x:2.4,z:4.6,w:0.4,d:1.3,h:0.8,front:-1,label:"130 × 40"},
    changed:{},
  },
};

// ---------- variante de sillón (opciones 1 y 3) ----------
// "mod": dos módulos 90×100 + 90×130 · "cam": 180×100 parejo + camastro suelto de 90×40 del lado del ventanal
const SOFA_CAM = {d:1.0, l:1.8, chaise:{w:0.9, d:1.4}, modules:[{w:0.9,d:1.0},{w:0.9,d:1.0}],
  arm:{w:0.15, d:0.8, h:0.6}, addon:{w:0.9, d:0.4}, label:"180 × 100"};
// "uno": un solo módulo de 180×100 + camastro suelto de 60 (ancho) × 70 (hacia adelante)
const SOFA_UNO = {d:1.0, l:1.8, chaise:{w:0.6, d:1.7}, modules:[{w:1.8,d:1.0}],
  arm:{w:0.15, d:0.8, h:0.6}, addon:{w:0.6, d:0.7}, label:"180 × 100 · 1 módulo"};
const SOFAS = {cam: SOFA_CAM, uno: SOFA_UNO};
let sofaVariant = "mod";
function getLayout(key){
  const L = LAYOUTS[key];
  const v = SOFAS[sofaVariant];
  if(v && L.sofa.modules) return {...L, sofa:{...v, x:L.sofa.x, z:L.sofa.z}};
  return L;
}
const OPTIONS_CAM = {
  A: {
    desc: "Con tus muebles: sillón a medida de 180 × 100 con un camastro suelto de 90 × 40 del lado del ventanal, ratona al costado, mesa Oliva ovalada con 2 sillas junto a la cocina y la oficina con la impresora junto al ventanal.",
    metrics: [
      ["Paso frente al sillón", "1,46 m"],
      ["Paso frente al camastro", "1,06 m"],
      ["Paso al balcón", "1,20 m"],
      ["Ratona a silla comedor", "0,32 m"],
    ],
    note: ["good", "El camastro es suelto: lo podés correr o sacar cuando necesites más paso."],
    list: [
      ["Sillón a medida", "180 × 100"], ["Camastro suelto", "90 × 40"], ["Brazos", "15 ancho × 80 prof."], ["Mesa Oliva", "120 × 80 oval"],
      ["Sillas", "2 (hasta 3)"], ["Rack TV", "160 × 34"], ["Mesa ratona", "45 × 70"], ["Mueble impresora", "130 × 40"], ["Escritorio", "120 × 60"],
    ],
  },
  B: {
    metrics: [
      ["Paso central", "1,20 m"],
      ["Paso al balcón", "1,06 m"],
      ["Paso frente al sillón", "1,46 m"],
      ["Frente a la mesada", "0,90 m"],
    ],
    note: ["warn", "Para ir al balcón se pasa frente al camastro (1,06 m) y el escritorio queda lejos del ventanal, sin luz natural."],
    list: [
      ["Sillón a medida", "180 × 100"], ["Camastro suelto", "90 × 40"], ["Mesa Oliva", "120 × 80 oval"], ["Sillas", "2 (hasta 3)"],
      ["Rack TV", "160 × 34"], ["Mesa ratona", "45 × 70"], ["Mueble impresora", "130 × 40"], ["Escritorio", "120 × 60"],
    ],
  },
};
OPTIONS.C = {
  title: "Escritorio al ventanal", badge: "Opción 4",
  desc: "Como la opción 1, pero el escritorio pasa al rincón del ventanal y trabajás mirando hacia el balcón. El living se corre 15 cm hacia la cocina para dejar lugar a la silla.",
  metrics: [
    ["Paso al balcón", "1,20 m"],
    ["Silla escritorio a sillón", "0,63 m"],
    ["Paso frente al sillón", "1,46 m"],
    ["Ratona a silla comedor", "0,17 m", "justo", "tight"],
  ],
  note: ["good", "Mirando a la ventana no hay reflejos en los monitores. Para el contraluz de la tarde conviene una cortina liviana o un blackout."],
  listTitle: "Muebles (cm)",
  list: OPTIONS.A.list,
};
OPTIONS_CAM.C = {
  metrics: [
    ["Paso al balcón", "1,20 m"],
    ["Silla escritorio a sillón", "0,63 m"],
    ["Paso frente al camastro", "1,06 m"],
    ["Ratona a silla comedor", "0,17 m", "justo", "tight"],
  ],
  list: OPTIONS_CAM.A.list,
};
const OPTIONS_UNO = {
  A: {
    desc: "Con tus muebles: sillón de un solo módulo de 180 × 100 con un camastro suelto de 60 × 70 del lado del ventanal, ratona al costado, mesa Oliva ovalada con 2 sillas junto a la cocina y la oficina con la impresora junto al ventanal.",
    metrics: [
      ["Paso frente al sillón", "1,46 m"],
      ["Paso frente al camastro", "0,76 m", "justo", "tight"],
      ["Paso al balcón", "1,20 m"],
      ["Ratona a silla comedor", "0,32 m"],
    ],
    note: ["warn", "Con el camastro puesto, el paso hasta el rack baja a 76 cm. Como es suelto, lo podés correr contra el sillón o sacarlo cuando no lo uses."],
    list: [
      ["Sillón a medida", "180 × 100 · 1 módulo"], ["Camastro suelto", "60 × 70"], ["Brazos", "15 ancho × 80 prof."], ["Mesa Oliva", "120 × 80 oval"],
      ["Sillas", "2 (hasta 3)"], ["Rack TV", "160 × 34"], ["Mesa ratona", "45 × 70"], ["Mueble impresora", "130 × 40"], ["Escritorio", "120 × 60"],
    ],
  },
  B: {
    metrics: [
      ["Paso central", "1,20 m"],
      ["Paso al balcón", "0,76 m", "justo", "tight"],
      ["Paso frente al sillón", "1,46 m"],
      ["Frente a la mesada", "0,90 m"],
    ],
    note: ["warn", "Con el camastro puesto, para ir al balcón quedan 76 cm, y el escritorio queda lejos del ventanal."],
    list: [
      ["Sillón a medida", "180 × 100 · 1 módulo"], ["Camastro suelto", "60 × 70"], ["Mesa Oliva", "120 × 80 oval"], ["Sillas", "2 (hasta 3)"],
      ["Rack TV", "160 × 34"], ["Mesa ratona", "45 × 70"], ["Mueble impresora", "130 × 40"], ["Escritorio", "120 × 60"],
    ],
  },
};
OPTIONS_UNO.C = {
  metrics: [
    ["Paso al balcón", "1,20 m"],
    ["Silla escritorio a sillón", "0,63 m"],
    ["Paso frente al camastro", "0,76 m", "justo", "tight"],
    ["Ratona a silla comedor", "0,17 m", "justo", "tight"],
  ],
  note: ["warn", "Con el camastro puesto, el paso hasta el rack baja a 76 cm; al ser suelto lo podés correr cuando no lo uses."],
  list: OPTIONS_UNO.A.list,
};
const VARIANT_OPTS = {cam: OPTIONS_CAM, uno: OPTIONS_UNO};
function getOption(key){
  const v = VARIANT_OPTS[sofaVariant]?.[key];
  return v ? {...OPTIONS[key], ...v} : OPTIONS[key];
}

// ---------- tarjeta de distribución ----------
const detailEl = document.getElementById("detail");
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function renderDetail(key){
  const o = getOption(key);
  detailEl.dataset.l = key;
  document.getElementById("sheet-name").textContent = o.title;
  document.getElementById("sheet-dot").style.background = `var(--opt-${key === "A2" ? "a2" : key.toLowerCase()})`;
  const metrics = o.metrics.map(([l,v,d,cls]) =>
    `<div class="metric"><dt>${esc(l)}</dt><dd><span class="v">${esc(v)}</span>${d ? `<span class="d ${cls||""}">${esc(d)}</span>` : ""}</dd></div>`).join("");
  const isChange = key === "A2";
  const list = o.list.map(([n,a,b]) => {
    if(isChange && b) return `<li><span class="name">${esc(n)}</span><span class="size"><span class="from">${esc(a)}</span><span class="arrow">→</span><span class="to">${esc(b)}</span></span></li>`;
    if(isChange) return `<li class="same"><span class="name">${esc(n)}</span><span class="size">${esc(a)} · igual</span></li>`;
    return `<li><span class="name">${esc(n)}</span><span class="size">${esc(a)}</span></li>`;
  }).join("");
  const wide = matchMedia("(min-width: 960px)").matches;
  detailEl.innerHTML = `
    <div class="detail-title"><h1>${esc(o.title)}</h1><span class="badge">${esc(o.badge)}</span></div>
    <p class="detail-desc">${esc(o.desc)}</p>
    <dl class="metrics">${metrics}</dl>
    <p class="note-inline ${o.note[0] === "good" ? "good" : ""}">${esc(o.note[1])}</p>
    <details class="more" ${wide || isChange ? "open" : ""}>
      <summary>${esc(o.listTitle)}</summary>
      <div class="more-body">
        <ul class="changes">${list}</ul>
        ${isChange ? '<p class="changes-legend"><i></i>Tachado: medida original. En naranja: medida nueva.</p>' : ""}
      </div>
    </details>`;
}

// ---------- tarjeta de planos (móvil: se abre con el botón) ----------
const files = document.getElementById("files");
const filesBtn = document.getElementById("t-files");
function setFiles(open){
  files.classList.toggle("closed", !open);
  filesBtn.setAttribute("aria-expanded", String(open));
  filesBtn.setAttribute("aria-pressed", String(open));
}
filesBtn.addEventListener("click", () => setFiles(files.classList.contains("closed")));
document.getElementById("files-close").addEventListener("click", () => setFiles(false));
addEventListener("keydown", e => { if(e.key === "Escape") setFiles(false); });

// ---------- tarjeta de controles en el celular: compacta / abierta / oculta ----------
const dist = document.getElementById("dist");
const sheetHead = document.getElementById("sheet-head");
const sheetToggle = document.getElementById("sheet-toggle");
const showBtn = document.getElementById("show-controls");
const mobileMQ = matchMedia("(max-width: 959px)");
function sheetInset(){
  // alto de la tarjeta que tapa el lienzo (para recentrar el 3D y ubicar la pista)
  if(!mobileMQ.matches || dist.dataset.state === "hidden") return 0;
  return Math.max(0, innerHeight - dist.getBoundingClientRect().top);
}
function announceSheet(){
  const h = sheetInset();
  document.documentElement.style.setProperty("--sheet-h", h + "px");
  dispatchEvent(new CustomEvent("sheetchange", {detail:{inset:h}}));
}
function setSheet(state){
  dist.dataset.state = state;
  const open = state === "open";
  sheetToggle.textContent = open ? "Ocultar detalles" : "Ver detalles";
  sheetToggle.setAttribute("aria-expanded", String(open));
  showBtn.hidden = state !== "hidden";
  if(state === "hidden") showBtn.focus({preventScroll:true});
  if(state !== "open") dist.scrollTop = 0;
  // esperar a que termine la transición para medir
  requestAnimationFrame(announceSheet);
  setTimeout(announceSheet, 360);
}
sheetToggle.addEventListener("click", e => { e.stopPropagation(); setSheet(dist.dataset.state === "open" ? "peek" : "open"); });
document.getElementById("sheet-hide").addEventListener("click", e => { e.stopPropagation(); setSheet("hidden"); });
showBtn.addEventListener("click", () => setSheet("peek"));
// deslizar la manija: arriba abre, abajo compacta u oculta; un toque alterna
let drag = null;
sheetHead.addEventListener("pointerdown", e => {
  if(e.target.closest("button")) return;
  drag = {y:e.clientY, t:performance.now()};
  sheetHead.setPointerCapture?.(e.pointerId);
});
sheetHead.addEventListener("pointerup", e => {
  if(!drag) return;
  const dy = e.clientY - drag.y; drag = null;
  const st = dist.dataset.state;
  if(Math.abs(dy) < 8) setSheet(st === "open" ? "peek" : "open");
  else if(dy < -30) setSheet("open");
  else if(dy > 30) setSheet(st === "open" ? "peek" : "hidden");
});
sheetHead.addEventListener("pointercancel", () => { drag = null; });
new ResizeObserver(announceSheet).observe(dist);
mobileMQ.addEventListener?.("change", () => setSheet("peek"));

// ---------- visor de renders ----------
const RENDERS = [
  {src:"renders/render-1.jpg", title:"Sillón recto", alt:"Render del depto con sillón recto verde, mesa redonda y sillas amarillas"},
  {src:"renders/render-2.jpg", title:"Sillón con chaise", alt:"Render del depto con sillón gris con chaise, mesa auxiliar y sillas tapizadas"},
];
const lb = document.getElementById("lightbox"), lbImg = document.getElementById("lb-img");
let lbIndex = 0, lbOpener = null;
function lbShow(i){
  lbIndex = (i + RENDERS.length) % RENDERS.length;
  const r = RENDERS[lbIndex];
  lbImg.src = r.src; lbImg.alt = r.alt;
  document.getElementById("lb-title").textContent = r.title;
  document.getElementById("lb-count").textContent = `${lbIndex + 1} / ${RENDERS.length}`;
  document.getElementById("lb-full").href = r.src;
}
function lbOpen(i, opener){ lbOpener = opener; lbShow(i); lb.hidden = false; document.getElementById("lb-close").focus(); }
function lbClose(){ lb.hidden = true; lbOpener?.focus(); }
document.querySelectorAll(".render-thumb").forEach(b => b.addEventListener("click", () => lbOpen(+b.dataset.i, b)));
document.getElementById("lb-close").addEventListener("click", lbClose);
document.getElementById("lb-prev").addEventListener("click", () => lbShow(lbIndex - 1));
document.getElementById("lb-next").addEventListener("click", () => lbShow(lbIndex + 1));
lb.addEventListener("click", e => { if(e.target === lb || e.target.id === "lb-stage") lbClose(); });
addEventListener("keydown", e => {
  if(lb.hidden) return;
  if(e.key === "Escape") lbClose();
  if(e.key === "ArrowLeft") lbShow(lbIndex - 1);
  if(e.key === "ArrowRight") lbShow(lbIndex + 1);
});
// deslizar con el dedo para pasar de render
let sx = null;
lb.addEventListener("touchstart", e => { sx = e.touches.length === 1 ? e.touches[0].clientX : null; }, {passive:true});
lb.addEventListener("touchend", e => {
  if(sx === null) return;
  const dx = e.changedTouches[0].clientX - sx; sx = null;
  if(Math.abs(dx) > 50) lbShow(lbIndex + (dx < 0 ? 1 : -1));
}, {passive:true});

// ---------- mini plano de cada opción (vista desde arriba, ventanal a la derecha) ----------
function planSVG(key){
  const L = getLayout(key);
  const R = (x0,z0,x1,z1,cls) => `<rect x="${Math.min(z0,z1)}" y="${Math.min(x0,x1)}" width="${Math.abs(z1-z0)}" height="${Math.abs(x1-x0)}" rx="0.04" class="${cls}"/>`;
  let g = "";
  const s = L.sofa;
  g += R(s.x, s.z, s.x+s.d, s.z+s.l, "pf main");
  if(s.chaise) g += R(s.x+s.d-0.05, s.z+s.l-s.chaise.w, s.chaise.d, s.z+s.l, "pf main");
  const m = L.mesa;
  if(m.type === "round") g += `<circle cx="${m.z}" cy="${m.x}" r="${m.r}" class="pf"/>`;
  else g += `<ellipse cx="${m.z+m.d/2}" cy="${m.x+m.w/2}" rx="${m.d/2}" ry="${m.w/2}" class="pf"/>`;
  const t = L.ratona;
  g += t.type === "round" ? `<circle cx="${t.z}" cy="${t.x}" r="${t.r}" class="pf soft"/>` : R(t.x, t.z, t.x+t.w, t.z+t.d, "pf soft");
  const r = L.rack; g += R(2.8-r.d, r.z, 2.8, r.z+r.l, "pf soft");
  const d = L.desk;
  if(!d.rot) g += R(d.pos[0], d.pos[1], d.pos[0]+0.6, d.pos[1]+1.2, "pf desk");
  else if(Math.abs(d.rot - Math.PI) < 1e-3) g += R(d.pos[0]-0.6, d.pos[1]-1.2, d.pos[0], d.pos[1], "pf desk");
  else g += R(d.pos[0], d.pos[1]-0.6, d.pos[0]+1.2, d.pos[1], "pf desk"); // girado 90°: mira al ventanal
  const p = L.printer; g += R(p.x, p.z, p.x+p.w, p.z+p.d, "pf soft");
  return `<svg viewBox="-0.12 -0.12 6.24 3.04" role="presentation">
    <rect x="0" y="0" width="6" height="2.8" class="room"/>
    <line x1="6" y1="0.1" x2="6" y2="2.7" class="win"/>
    ${g}</svg>`;
}
document.querySelectorAll(".opt-plan").forEach(el => { el.innerHTML = planSVG(el.dataset.plan); });

const toastEl = document.getElementById("toast");
let toastT;
function toast(msg){
  toastEl.textContent = msg; toastEl.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 1700);
}

// ---------- selección de distribución y de sillón (funciona aunque no haya 3D) ----------
let onLayout = () => {}, onSofa = () => {};
let currentKey = "A";
function pressGroup(sel, btn){ document.querySelectorAll(sel).forEach(b => b.setAttribute("aria-pressed", String(b === btn))); }
const sofaSwitch = document.getElementById("sofa-switch");
function saveState(){
  const h = currentKey + (sofaVariant !== "mod" && LAYOUTS[currentKey].sofa.modules ? "-" + sofaVariant : "");
  try{ localStorage.setItem("living-layout", currentKey); localStorage.setItem("living-sofa", sofaVariant); }catch(e){}
  try{ history.replaceState(null, "", "#" + h); }catch(e){}
}
function refreshPlans(){ document.querySelectorAll(".opt-plan").forEach(el => { el.innerHTML = planSVG(el.dataset.plan); }); }
function syncSofaSwitch(){
  sofaSwitch.hidden = !LAYOUTS[currentKey].sofa.modules;
  pressGroup("[data-sofa]", document.querySelector(`[data-sofa="${sofaVariant}"]`));
}
document.querySelectorAll(".opt[data-l]").forEach(b => {
  b.addEventListener("click", () => {
    currentKey = b.dataset.l;
    pressGroup(".opt", b);
    revealOpt(b, true);
    renderDetail(currentKey);
    syncSofaSwitch();
    saveState();
    onLayout(currentKey);
    toast(`Mostrando: ${OPTIONS[currentKey].title}`);
  });
});
document.querySelectorAll("[data-sofa]").forEach(b => {
  b.addEventListener("click", () => {
    if(sofaVariant === b.dataset.sofa) return;
    sofaVariant = b.dataset.sofa;
    syncSofaSwitch();
    renderDetail(currentKey);
    refreshPlans();
    saveState();
    onSofa();
    toast({mod:"Sillón: 2 módulos (100 + 130)", cam:"Sillón: 180 × 100 + camastro 90 × 40", uno:"Sillón: 1 módulo + camastro 60 × 70"}[sofaVariant]);
  });
});
{
  const [hk, hv] = location.hash.replace("#", "").split("-");
  if(LAYOUTS[hk]) currentKey = hk;
  else { try{ const s = localStorage.getItem("living-layout"); if(LAYOUTS[s]) currentKey = s; }catch(e){} }
  if(SOFAS[hv]) sofaVariant = hv;
  else if(!hk){ try{ const v = localStorage.getItem("living-sofa"); if(SOFAS[v]) sofaVariant = v; }catch(e){} }
}
const start = currentKey;
pressGroup(".opt", document.querySelector(`.opt[data-l="${start}"]`));
// en el celular las tarjetas se deslizan: mostrar siempre la elegida
function revealOpt(btn, smooth){
  const row = btn.parentElement;
  if(row.scrollWidth <= row.clientWidth) return;
  const left = btn.offsetLeft - (row.clientWidth - btn.offsetWidth) / 2;
  row.scrollTo({left: Math.max(0, left), behavior: smooth ? "smooth" : "auto"});
}
requestAnimationFrame(() => revealOpt(document.querySelector(`.opt[data-l="${start}"]`), false));
renderDetail(start);
syncSofaSwitch();
refreshPlans();

if(has3D) init3D();

function init3D(){
// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.75 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.insertBefore(renderer.domElement, labelsEl);

const labelRenderer = new CSS2DRenderer({element: labelsEl});

const scene = new THREE.Scene();
const darkMQ = matchMedia("(prefers-color-scheme: dark)");
const syncBg = () => { scene.background = new THREE.Color(darkMQ.matches ? 0x111614 : 0xe8ece9); };
syncBg();

const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 0.4;
controls.maxDistance = 30;
controls.rotateSpeed = isTouch ? 0.75 : 1;

scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a68e, 0.9));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
sun.position.set(1.2, 6, 12);
sun.target.position.set(1.8, 0, 2.5);
sun.castShadow = true;
const sm = isTouch ? 1024 : 2048;
sun.shadow.mapSize.set(sm, sm);
Object.assign(sun.shadow.camera, {left:-6, right:6, top:7, bottom:-7, near:1, far:30});
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);
const fill = new THREE.PointLight(0xffe7c4, 6, 8, 1.6);
fill.position.set(1.4, 2.4, 2.5);
scene.add(fill);

// ---------- helpers ----------
const matCache = new Map();
const mat = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if(!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({color, roughness:0.8, metalness:0, ...opts}));
  return matCache.get(key);
};
function box(x0,y0,z0,x1,y1,z1,color,opts){
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1-x0, y1-y0, z1-z0), typeof color === "number" ? mat(color, opts) : color);
  m.position.set((x0+x1)/2, (y0+y1)/2, (z0+z1)/2);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(x,z,r,y0,y1,color,seg=40){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1-y0, seg), mat(color));
  m.position.set(x, (y0+y1)/2, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
function tag(name, dims, x, y, z, parent, cls = ""){
  const el = document.createElement("div");
  el.className = "tag3d" + (cls ? " " + cls : "");
  el.textContent = name;
  if(dims){ const s = document.createElement("span"); s.textContent = dims; el.appendChild(s); }
  const o = new CSS2DObject(el); o.position.set(x, y, z);
  parent.add(o); return o;
}

// ---------- arquitectura ----------
const arch = new THREE.Group(); scene.add(arch);
arch.add(box(-0.2,-0.04,-2.98,1.43,0,-0.55,C.floor,{roughness:0.65}));
arch.add(box(-0.2,-0.04,-0.69,5.6,0,6.05,C.floor,{roughness:0.65}));
const wallsGroup = new THREE.Group(); arch.add(wallsGroup);
const wallMat = mat(C.wall, {roughness:0.95});
for(const [x0,z0,x1,z1] of WALLS) wallsGroup.add(box(x0,0,z0,x1,H,z1,wallMat));
const glassMat = new THREE.MeshStandardMaterial({color:C.glass, transparent:true, opacity:0.22, roughness:0.05, metalness:0.1});
for(const [x0,x1] of [[0,2.8],[2.9,5.45]]){
  wallsGroup.add(box(x0,2.15,6.0,x1,H,6.06,wallMat));
  const g = box(x0,0,6.01,x1,2.15,6.04,glassMat); g.castShadow = false; arch.add(g);
  arch.add(box(x0,0,6.0,x1,0.04,6.06,C.black));
  for(let i=0;i<=2;i++){ const x = Math.min(x0 + i*(x1-x0)/2, x1-0.04); arch.add(box(x,0,6.0,x+0.04,2.15,6.06,C.black)); }
}
arch.add(box(0,-0.1,6.06,5.0,-0.02,7.18,C.balcony));
const rail = box(0,0,7.15,5.0,1.0,7.18,glassMat); rail.castShadow = false; arch.add(rail);
arch.add(box(0,1.0,7.13,5.0,1.04,7.2,C.black));
arch.add(box(5.0,0,6.06,5.03,1.04,7.2,C.black));
for(const [px,pz,s] of [[0.35,6.55,0.42],[0.85,6.75,0.3]]){
  arch.add(cyl(px,pz,s*0.45,0,s*0.8,0x8a8178));
  const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(s*0.75,1), mat(C.plant));
  leaf.position.set(px, s*1.25, pz); leaf.castShadow = true; arch.add(leaf);
}
arch.add(box(0.23,0,-2.86,1.13,2.05,-2.83,C.woodLight));
arch.add(box(1.43,0,-0.55,3.29,0.9,0,C.counter));
arch.add(box(3.29,0,-0.55,3.89,0.9,0.51,C.counter));
arch.add(box(1.43,0.9,-0.55,3.89,0.93,0,0x9b9a96));
arch.add(box(3.29,0.9,-0.55,3.89,0.93,0.51,0x9b9a96));
arch.add(box(1.43,1.5,-0.55,3.29,2.2,-0.2,C.counter));
arch.add(box(3.34,0,0.51,3.89,1.85,1.14,C.fridge));
arch.add(box(3.62,0,3.66,5.45,0.5,5.1,C.bed));
arch.add(box(5.38,0,3.6,5.45,1.0,5.16,C.wood));
arch.add(box(3.95,0,2.27,5.45,2.2,2.85,C.woodLight));
arch.add(box(5.0,0,0.1,5.4,0.42,0.6,0xffffff));
arch.add(box(4.95,0,1.2,5.45,0.85,1.7,0xffffff));
tag("Cocina","",2.4,1.3,-0.3,arch,"room");
tag("Dormitorio","",4.5,1.3,4.4,arch,"room");
tag("Balcón","5,00 × 1,13",2.5,1.3,6.6,arch,"room");
tag("Entrada","",0.65,2.2,-2.5,arch,"room");

// ---------- muebles ----------
let furn = new THREE.Group(); scene.add(furn);

function chair(cx, cz, faceX, faceZ, g, color = C.wood){
  const c = new THREE.Group();
  c.add(box(-0.22,0.43,-0.22,0.22,0.47,0.22,color));
  c.add(box(-0.22,0.47,0.18,0.22,0.88,0.22,color));
  for(const [lx,lz] of [[-0.19,-0.19],[0.19,-0.19],[-0.19,0.19],[0.19,0.19]]) c.add(box(lx-0.02,0,lz-0.02,lx+0.02,0.43,lz+0.02,C.black));
  c.position.set(cx, 0, cz);
  c.rotation.y = Math.atan2(cx - faceX, cz - faceZ);
  g.add(c);
}

// Monitor principal horizontal (27") + monitor vertical (24"), centrados como conjunto sobre el escritorio.
// El vertical va a la derecha del usuario, girado 25° hacia él. Devuelve el z del centro del principal.
function monitorSetup(d, g){
  const MAIN_W = 0.61, MAIN_H = 0.36;
  const PORT_W = 0.30, PORT_H = 0.53;
  const GAP = 0.02, ANG = THREE.MathUtils.degToRad(25);
  const T = 0.025, Y0 = 0.90;
  const xFace = d.x + 0.17;
  const mz = d.z + d.d / 2;
  const total = MAIN_W + GAP + PORT_W * Math.cos(ANG);
  const zMin = mz - total / 2;
  const mainZ0 = zMin + PORT_W * Math.cos(ANG) + GAP;
  const mainC = mainZ0 + MAIN_W / 2;
  const screenMat = new THREE.MeshStandardMaterial({color:0x1d2a38, roughness:0.25, emissive:0x101a24, emissiveIntensity:0.6});
  const bezel = mat(C.black, {roughness:0.35});

  g.add(box(xFace - T, Y0, mainZ0, xFace, Y0 + MAIN_H, mainZ0 + MAIN_W, bezel));
  g.add(box(xFace, Y0 + 0.012, mainZ0 + 0.012, xFace + 0.002, Y0 + MAIN_H - 0.012, mainZ0 + MAIN_W - 0.012, screenMat));

  const piv = new THREE.Group();
  piv.position.set(xFace, 0, mainZ0 - GAP);
  piv.rotation.y = -ANG;
  const py0 = Y0 + MAIN_H / 2 - PORT_H / 2;
  piv.add(box(-T, py0, -PORT_W, 0, py0 + PORT_H, 0, bezel));
  piv.add(box(0, py0 + 0.012, -PORT_W + 0.012, 0.002, py0 + PORT_H - 0.012, -0.012, screenMat));
  g.add(piv);

  const poleZ = zMin + total / 2;
  g.add(cyl(d.x + 0.07, poleZ, 0.02, 0.75, Y0 + MAIN_H / 2 + 0.05, C.metal, 20));
  g.add(box(d.x + 0.05, 0.75, poleZ - 0.06, d.x + 0.13, 0.77, poleZ + 0.06, C.metal));
  const armY = Y0 + MAIN_H / 2 - 0.015;
  g.add(box(d.x + 0.07, armY, Math.min(poleZ, mainC) - 0.015, xFace - T - 0.005, armY + 0.03, Math.max(poleZ, mainC) + 0.015, C.metal));
  const portC = mainZ0 - GAP - (PORT_W / 2) * Math.cos(ANG);
  g.add(box(d.x + 0.07, armY, Math.min(poleZ, portC) - 0.015, xFace - T - 0.01, armY + 0.03, Math.max(poleZ, portC) + 0.015, C.metal));

  g.add(box(d.x + 0.33, 0.75, mainC - 0.22, d.x + 0.46, 0.77, mainC + 0.22, 0x4a4e52));
  g.add(box(d.x + 0.36, 0.75, mainC + 0.28, d.x + 0.43, 0.785, mainC + 0.34, 0x4a4e52));
  return mainC;
}

// Escritorio completo en coordenadas locales (pared en x=0, escritorio de x 0–0.6 y z 0–1.2)
function buildDesk(cfg, parent){
  const g = new THREE.Group();
  const d = {x:0, z:0, w:0.6, d:1.2};
  g.add(box(0,0.72,0,0.6,0.75,1.2,C.woodLight));
  g.add(box(0.02,0,0.02,0.58,0.72,0.06,C.black));
  g.add(box(0.02,0,1.14,0.58,0.72,1.18,C.black));
  const mainC = monitorSetup(d, g);
  g.add(box(0.2,0,0.92,0.42,0.45,1.13,C.printer)); // PC
  chair(0.95, mainC, 0, mainC, g, C.black);
  tag("Escritorio", "120 × 60", 0.3, 1.5, 0.6, g);
  g.position.set(cfg.pos[0], 0, cfg.pos[1]);
  g.rotation.y = cfg.rot;
  parent.add(g);
}

function disposeGroup(g){
  g.traverse(o => {
    if(o.isCSS2DObject) o.element.remove();
    if(o.isMesh) o.geometry.dispose();
  });
}

function buildFurniture(key){
  scene.remove(furn); disposeGroup(furn);
  furn = new THREE.Group(); scene.add(furn);
  const L = getLayout(key), ch = L.changed;
  const cls = k => ch[k] ? "changed" : "";

  const s = L.sofa;
  furn.add(box(s.x+s.d-0.1,0,s.z+0.15,2.4,0.01,s.z+1.85,C.rug));
  if(s.modules){
    // sillón modular a medida: módulos uno al lado del otro a lo largo de la pared,
    // respaldo contra la pared y un brazo en cada extremo (dentro del ancho del módulo)
    const BACK = 0.2, SEAT = 0.42, BACK_H = 0.8, AW = s.arm.w, AD = s.arm.d, AH = s.arm.h;
    let z0 = s.z;
    s.modules.forEach((mo, i) => {
      const z1 = z0 + mo.w, first = i === 0, last = i === s.modules.length - 1;
      furn.add(box(s.x, 0.06, z0 + 0.003, s.x + mo.d, SEAT - 0.1, z1 - 0.003, C.sofa));        // base
      furn.add(box(s.x, 0, z0 + 0.05, s.x + 0.05, 0.06, z1 - 0.05, C.black));                     // zócalo
      furn.add(box(s.x, SEAT - 0.1, z0 + 0.003, s.x + BACK, BACK_H, z1 - 0.003, C.cushion));     // respaldo
      const sz0 = first ? z0 + AW : z0 + 0.01, sz1 = last ? z1 - AW : z1 - 0.01;
      furn.add(box(s.x + BACK, SEAT - 0.1, sz0 + 0.005, s.x + mo.d - 0.01, SEAT + 0.04, sz1 - 0.005, C.cushion)); // asiento
      if(first) furn.add(box(s.x, SEAT - 0.1, z0, s.x + AD, AH, z0 + AW, C.sofa));
      if(last)  furn.add(box(s.x, SEAT - 0.1, z1 - AW, s.x + AD, AH, z1, C.sofa));
      z0 = z1;
    });
    if(s.addon){
      // camastro suelto delante del módulo del lado del ventanal
      const cz1 = s.z + s.l, cz0 = cz1 - s.addon.w, cx0 = s.x + s.d + 0.015, cx1 = s.x + s.d + s.addon.d;
      furn.add(box(cx0, 0.04, cz0 + 0.01, cx1, SEAT - 0.1, cz1 - 0.01, C.sofa));
      furn.add(box(cx0, SEAT - 0.1, cz0 + 0.015, cx1 - 0.005, SEAT + 0.03, cz1 - 0.015, C.cushion));
      for(const [fx,fz] of [[cx0+0.04,cz0+0.05],[cx1-0.04,cz0+0.05],[cx0+0.04,cz1-0.05],[cx1-0.04,cz1-0.05]])
        furn.add(box(fx-0.015,0,fz-0.015,fx+0.015,0.04,fz+0.015,C.black));
      tag("Camastro", `${Math.round(s.addon.w*100)} × ${Math.round(s.addon.d*100)}`, (cx0+cx1)/2, 0.6, (cz0+cz1)/2, furn);
    }
  } else {
  furn.add(box(s.x,0,s.z,s.x+s.d,0.42,s.z+s.l,C.sofa));
  furn.add(box(s.x,0.42,s.z,s.x+0.22,0.82,s.z+s.l,C.cushion));
  furn.add(box(s.x+0.22,0.42,s.z,s.x+s.d,0.6,s.z+0.16,C.cushion));
  if(s.chaise){
    // chaise del lado del ventanal: más profunda y sin apoyabrazos de ese lado
    const cz0 = s.z+s.l-s.chaise.w;
    furn.add(box(s.x+s.d,0,cz0,s.x+s.chaise.d,0.42,s.z+s.l,C.sofa));
    furn.add(box(s.x+0.24,0.42,cz0+0.01,s.x+s.chaise.d-0.04,0.52,s.z+s.l-0.02,C.cushion));
    const seg = (cz0-0.01-(s.z+0.16))/2;
    for(let i=0;i<2;i++){ const z0 = s.z+0.16+i*seg; furn.add(box(s.x+0.24,0.42,z0+0.01,s.x+s.d-0.04,0.52,z0+seg-0.01,C.cushion)); }
  } else {
    furn.add(box(s.x+0.22,0.42,s.z+s.l-0.16,s.x+s.d,0.6,s.z+s.l,C.cushion));
    const seg = (s.l-0.32)/3;
    for(let i=0;i<3;i++){ const z0 = s.z+0.16+i*seg; furn.add(box(s.x+0.24,0.42,z0+0.01,s.x+s.d-0.04,0.52,z0+seg-0.01,C.cushion)); }
  }
  }
  tag(s.modules ? "Sillón a medida" : "Sillón Nube", s.label, s.x+s.d/2, 0.95, s.z+s.l/2, furn, cls("sofa"));

  const r = L.rack;
  furn.add(box(2.8-r.d,r.y0,r.z,2.8,r.y0+r.h,r.z+r.l,C.wood));
  furn.add(box(2.76,0.95,L.tvz-0.62,2.8,1.67,L.tvz+0.62,C.black,{roughness:0.3}));
  tag(r.y0 > 0 ? "Rack flotante" : "Rack TV", r.label, 2.8-r.d/2, r.y0+r.h+0.12, r.z+r.l/2, furn, cls("rack"));

  const t = L.ratona;
  if(t.type === "box"){
    furn.add(box(t.x,0.36,t.z,t.x+t.w,0.4,t.z+t.d,C.woodLight));
    for(const [lx,lz] of [[t.x+0.03,t.z+0.03],[t.x+t.w-0.03,t.z+0.03],[t.x+0.03,t.z+t.d-0.03],[t.x+t.w-0.03,t.z+t.d-0.03]]) furn.add(box(lx-0.015,0,lz-0.015,lx+0.015,0.36,lz+0.015,C.black));
    tag("Ratona", t.label, t.x+t.w/2, 0.55, t.z+t.d/2, furn, cls("ratona"));
  } else {
    furn.add(cyl(t.x,t.z,t.r,0.36,0.4,C.woodLight)); furn.add(cyl(t.x,t.z,0.04,0,0.36,C.black,16));
    tag("Ratona", t.label, t.x, 0.55, t.z, furn, cls("ratona"));
  }

  const m = L.mesa; let mcx, mcz;
  if(m.type === "box"){
    furn.add(box(m.x,0.72,m.z,m.x+m.w,0.76,m.z+m.d,C.woodLight));
    for(const [lx,lz] of [[m.x+0.05,m.z+0.05],[m.x+m.w-0.05,m.z+0.05],[m.x+0.05,m.z+m.d-0.05],[m.x+m.w-0.05,m.z+m.d-0.05]]) furn.add(box(lx-0.025,0,lz-0.025,lx+0.025,0.72,lz+0.025,C.wood));
    mcx = m.x+m.w/2; mcz = m.z+m.d/2;
  } else if(m.type === "oval"){
    // tapa ovalada: cilindro escalado a 80 × 120 + pie central
    mcx = m.x+m.w/2; mcz = m.z+m.d/2;
    const top = cyl(mcx,mcz,0.5,0.72,0.76,C.woodLight,64); top.scale.set(m.w,1,m.d); furn.add(top);
    furn.add(cyl(mcx,mcz,0.06,0,0.72,C.wood,20));
    const foot = cyl(mcx,mcz,0.5,0,0.03,C.wood,32); foot.scale.set(0.4,1,0.6); furn.add(foot);
  } else {
    furn.add(cyl(m.x,m.z,m.r,0.72,0.76,C.woodLight,64)); furn.add(cyl(m.x,m.z,0.06,0,0.72,C.wood,20)); furn.add(cyl(m.x,m.z,0.25,0,0.03,C.wood,32));
    mcx = m.x; mcz = m.z;
  }
  tag(m.name, m.label, mcx, 0.95, mcz, furn, cls("mesa"));
  for(const [cx,cz] of L.sillas) chair(cx, cz, mcx, m.type === "round" ? mcz : cz, furn);

  buildDesk(L.desk, furn);

  const p = L.printer, pc = p.z+p.d/2;
  furn.add(box(p.x,0,p.z,p.x+p.w,p.h,p.z+p.d,C.wood));
  furn.add(box(p.x+0.02,p.h,pc-0.2,p.x+p.w-0.02,p.h+0.42,pc+0.2,C.printer));
  const gx = p.front < 0 ? p.x+0.02 : p.x+p.w-0.031;
  furn.add(box(gx,p.h+0.05,pc-0.19,gx+0.011,p.h+0.4,pc+0.19,glassMat));
  tag("Impresora 3D", p.label, p.x+p.w/2, p.h+0.62, pc, furn, cls("printer"));
}

// ---------- vistas ----------
const VIEWS = {
  iso:        {p:[6.4,6.6,9.6],   t:[2.2,0,2.6],   wide:true},
  plan:       {wide:true},
  entrada:    {p:[0.7,1.6,-1.6],  t:[1.5,0.9,4.5]},
  cocina:     {p:[2.4,1.6,0.25],  t:[1.0,0.9,5.2]},
  balcon:     {p:[1.5,1.6,6.9],   t:[1.4,0.9,0.8]},
  escritorio: {p:[1.9,1.55,4.2],  t:[0.1,1.0,5.6]},
};
const VIEW_OVERRIDES = {
  B: { escritorio: {p:[0.55,1.6,4.7], t:[2.6,1.0,2.8]} },
  C: { escritorio: {p:[0.75,1.55,4.15], t:[0.6,1.0,6.4]} },
};
const ISO_PORTRAIT = {p:[5.0,9.6,12.6], t:[1.9,0,2.0]};
let currentView = "iso", currentLayout = start;

function viewFor(k){
  const a = camera.aspect;
  if(k === "plan"){
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const h = Math.max(6.3 / half, 3.5 / (half * a));
    return {p:new THREE.Vector3(2.7, h, 2.11), t:new THREE.Vector3(2.7, 0, 2.1)};
  }
  const v = (k === "iso" && a < 1) ? ISO_PORTRAIT : (VIEW_OVERRIDES[currentLayout]?.[k] || VIEWS[k]);
  const t = new THREE.Vector3(...v.t), p = new THREE.Vector3(...v.p);
  if(k === "iso" && a < 1) p.sub(t).multiplyScalar(Math.max(0.95, 0.58 / a)).add(t);
  else if(k === "iso" && innerWidth >= 960 && !SHOT) p.sub(t).multiplyScalar(1.28).add(t);
  return {p, t};
}
function updateFov(){
  const a = camera.aspect;
  const interior = !VIEWS[currentView].wide;
  camera.fov = currentView === "plan" ? 30 : a < 1 ? (interior ? 72 : 52) : (interior ? 62 : 50);
  camera.updateProjectionMatrix();
}

// En escritorio la tarjeta izquierda tapa parte del lienzo: corremos el centro de la vista a la derecha.
let bottomInset = 0;
function applyOffset(){
  const w = stage.clientWidth, h = stage.clientHeight;
  if(SHOT) camera.clearViewOffset();
  else if(innerWidth >= 960){
    const shift = 200; // la mitad del ancho de la tarjeta + margen
    camera.setViewOffset(w, h, -shift, 0, w, h);
  } else if(bottomInset > 0){
    // celular: la tarjeta tapa la parte de abajo, subimos el centro de la vista
    camera.setViewOffset(w, h, 0, Math.min(bottomInset / 2, h * 0.3), w, h);
  } else camera.clearViewOffset();
}
addEventListener("sheetchange", e => { bottomInset = e.detail.inset; applyOffset(); needs = true; });

let anim = null, grow = null;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
function goView(k, instant = false){
  currentView = k;
  updateFov();
  const to = viewFor(k);
  if(reduce || instant){ camera.position.copy(to.p); controls.target.copy(to.t); controls.update(); anim = null; needs = true; return; }
  anim = {from:{p:camera.position.clone(), t:controls.target.clone()}, to, start:performance.now(), dur:900};
}

document.querySelectorAll(".chip[data-v]").forEach(b => b.addEventListener("click", () => { pressGroup(".chip[data-v]", b); goView(b.dataset.v); }));
onSofa = () => {
  buildFurniture(currentLayout);
  if(!reduce){ furn.scale.y = 0.02; grow = {start:performance.now(), dur:450}; }
  needs = true;
};
onLayout = key => {
  currentLayout = key;
  buildFurniture(key);
  if(!reduce){ furn.scale.y = 0.02; grow = {start:performance.now(), dur:500}; }
  if(currentView === "escritorio") goView("escritorio");
  needs = true;
};
const wallsBtn = document.getElementById("t-walls");
wallsBtn.addEventListener("click", () => {
  const low = wallsBtn.getAttribute("aria-pressed") !== "true";
  wallsBtn.setAttribute("aria-pressed", String(low));
  wallsGroup.scale.y = low ? 1 / H : 1;
  needs = true;
});
const tagsBtn = document.getElementById("t-tags");
tagsBtn.addEventListener("click", () => {
  const on = tagsBtn.getAttribute("aria-pressed") !== "true";
  tagsBtn.setAttribute("aria-pressed", String(on));
  labelsEl.classList.toggle("hide-tags", !on);
  needs = true;
});

const hint = document.getElementById("hint");
if(!isTouch) hint.textContent = "Arrastrá para girar · rueda para acercar · clic derecho para mover";
const hideHint = () => hint.classList.add("gone");
renderer.domElement.addEventListener("pointerdown", hideHint, {once:true});
setTimeout(hideHint, 6000);

// ---------- arranque ----------
buildFurniture(start);
let needs = true;
function resize(){
  const w = stage.clientWidth, h = stage.clientHeight;
  if(!w || !h) return;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  updateFov();
  applyOffset();
  needs = true;
}
new ResizeObserver(resize).observe(stage);
resize();
goView("iso", true);
addEventListener("orientationchange", () => setTimeout(() => { resize(); goView(currentView, true); }, 250));
darkMQ.addEventListener?.("change", () => { syncBg(); needs = true; });

controls.addEventListener("change", () => { needs = true; });
const ease = x => x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2;
renderer.setAnimationLoop(now => {
  if(anim){
    const k = Math.min(1, (now - anim.start) / anim.dur), e = ease(k);
    camera.position.lerpVectors(anim.from.p, anim.to.p, e);
    controls.target.lerpVectors(anim.from.t, anim.to.t, e);
    if(k >= 1) anim = null;
    needs = true;
  }
  if(grow){
    const k = Math.min(1, (now - grow.start) / grow.dur);
    furn.scale.y = 0.02 + 0.98 * (1 - Math.pow(1 - k, 3));
    if(k >= 1){ furn.scale.y = 1; grow = null; }
    needs = true;
  }
  controls.update();
  if(needs){
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    needs = false;
  }
});
window.__living = {
  goView, render: () => { needs = true; },
  look: (p, t) => { camera.position.set(...p); controls.target.set(...t); controls.update(); needs = true; },
};
}
