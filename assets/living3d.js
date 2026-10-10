// Modelo 3D del living-comedor. Unidades: metros.
// x = ancho (0 = medianera izquierda), z = profundidad (0 = frente de mesada, 6 = ventanal).
import * as THREE from "three";
import { OrbitControls } from "three/addons/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/CSS2DRenderer.js";

const stage = document.getElementById("stage");
const labelsEl = document.getElementById("labels");

// ---------- WebGL disponible? ----------
function webglOK(){
  try{ const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
  catch(e){ return false; }
}
if(!webglOK()){
  const f = document.createElement("p");
  f.className = "fallback";
  f.innerHTML = 'Tu navegador no puede mostrar 3D. <a href="./">Ver los planos</a>';
  stage.appendChild(f);
  throw new Error("WebGL no disponible");
}

const isTouch = matchMedia("(pointer: coarse)").matches || matchMedia("(hover: none)").matches || "ontouchstart" in window;
const isSmall = () => innerWidth < 900;
const H = 2.6;

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
const LAYOUTS = {
  A:{
    sofa:{x:0,z:2.5,d:1.2,l:2.0,label:"200 × 120"},
    rack:{z:2.7,d:0.34,l:1.6,h:0.5,y0:0,label:"160 × 34"},
    tvz:3.5,
    ratona:{type:"box",x:1.5,z:3.15,w:0.45,d:0.7,label:"45 × 70"},
    mesa:{type:"box",name:"Mesa Oliva",x:1.0,z:0.9,w:0.8,d:1.2,label:"120 × 80"},
    sillas:[[0.72,1.2],[0.72,1.8],[2.08,1.2],[2.08,1.8]],
    desk:{x:0,z:4.8,w:0.6,d:1.2}, deskChair:[0.95,5.4],
    printer:{x:2.4,z:4.6,w:0.4,d:1.3,h:0.8,label:"130 × 40"},
  },
  A2:{
    sofa:{x:0,z:2.6,d:1.0,l:2.0,label:"200 × 100"},
    rack:{z:2.8,d:0.30,l:1.6,h:0.38,y0:0.35,label:"160 × 30"},
    tvz:3.6,
    ratona:{type:"round",x:1.55,z:3.6,r:0.275,label:"Ø 55"},
    mesa:{type:"round",name:"Mesa redonda",x:1.4,z:1.65,r:0.5,label:"Ø 100"},
    sillas:[[1.4,1.03],[1.4,2.27],[0.78,1.65],[2.02,1.65]],
    desk:{x:0,z:4.8,w:0.6,d:1.2}, deskChair:[0.95,5.4],
    printer:{x:2.4,z:5.25,w:0.4,d:0.65,h:0.9,label:"65 × 40"},
  }
};

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
const syncBg = () => { scene.background = new THREE.Color(darkMQ.matches ? 0x171a1d : 0xefece5); };
syncBg();
darkMQ.addEventListener?.("change", syncBg);

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
function tag(name, dims, x, y, z, parent){
  const el = document.createElement("div");
  el.className = "tag3d";
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
tag("Cocina","",2.4,1.3,-0.3,arch);
tag("Dormitorio","",4.5,1.3,4.4,arch);
tag("Balcón","5,00 × 1,13",2.5,1.3,6.6,arch);
tag("Entrada","",0.65,2.2,-2.5,arch);

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

function disposeGroup(g){
  g.traverse(o => {
    if(o.isCSS2DObject) o.element.remove();
    if(o.isMesh) o.geometry.dispose();
  });
}

function buildFurniture(key){
  scene.remove(furn); disposeGroup(furn);
  furn = new THREE.Group(); scene.add(furn);
  const L = LAYOUTS[key];

  const s = L.sofa;
  furn.add(box(s.x+s.d-0.1,0,s.z+0.15,2.4,0.01,s.z+1.85,C.rug));
  furn.add(box(s.x,0,s.z,s.x+s.d,0.42,s.z+s.l,C.sofa));
  furn.add(box(s.x,0.42,s.z,s.x+0.22,0.82,s.z+s.l,C.cushion));
  furn.add(box(s.x+0.22,0.42,s.z,s.x+s.d,0.6,s.z+0.16,C.cushion));
  furn.add(box(s.x+0.22,0.42,s.z+s.l-0.16,s.x+s.d,0.6,s.z+s.l,C.cushion));
  const seg = (s.l-0.32)/3;
  for(let i=0;i<3;i++){ const z0 = s.z+0.16+i*seg; furn.add(box(s.x+0.24,0.42,z0+0.01,s.x+s.d-0.04,0.52,z0+seg-0.01,C.cushion)); }
  tag("Sillón Nube", s.label, s.x+s.d/2, 0.95, s.z+s.l/2, furn);

  const r = L.rack;
  furn.add(box(2.8-r.d,r.y0,r.z,2.8,r.y0+r.h,r.z+r.l,C.wood));
  furn.add(box(2.76,0.95,L.tvz-0.62,2.8,1.67,L.tvz+0.62,C.black,{roughness:0.3}));
  tag(r.y0 > 0 ? "Rack flotante" : "Rack TV", r.label, 2.8-r.d/2, r.y0+r.h+0.12, r.z+r.l/2, furn);

  const t = L.ratona;
  if(t.type === "box"){
    furn.add(box(t.x,0.36,t.z,t.x+t.w,0.4,t.z+t.d,C.woodLight));
    for(const [lx,lz] of [[t.x+0.03,t.z+0.03],[t.x+t.w-0.03,t.z+0.03],[t.x+0.03,t.z+t.d-0.03],[t.x+t.w-0.03,t.z+t.d-0.03]]) furn.add(box(lx-0.015,0,lz-0.015,lx+0.015,0.36,lz+0.015,C.black));
    tag("Ratona", t.label, t.x+t.w/2, 0.55, t.z+t.d/2, furn);
  } else {
    furn.add(cyl(t.x,t.z,t.r,0.36,0.4,C.woodLight)); furn.add(cyl(t.x,t.z,0.04,0,0.36,C.black,16));
    tag("Ratona", t.label, t.x, 0.55, t.z, furn);
  }

  const m = L.mesa; let mcx, mcz;
  if(m.type === "box"){
    furn.add(box(m.x,0.72,m.z,m.x+m.w,0.76,m.z+m.d,C.woodLight));
    for(const [lx,lz] of [[m.x+0.05,m.z+0.05],[m.x+m.w-0.05,m.z+0.05],[m.x+0.05,m.z+m.d-0.05],[m.x+m.w-0.05,m.z+m.d-0.05]]) furn.add(box(lx-0.025,0,lz-0.025,lx+0.025,0.72,lz+0.025,C.wood));
    mcx = m.x+m.w/2; mcz = m.z+m.d/2;
  } else {
    furn.add(cyl(m.x,m.z,m.r,0.72,0.76,C.woodLight,64)); furn.add(cyl(m.x,m.z,0.06,0,0.72,C.wood,20)); furn.add(cyl(m.x,m.z,0.25,0,0.03,C.wood,32));
    mcx = m.x; mcz = m.z;
  }
  tag(m.name, m.label, mcx, 0.95, mcz, furn);
  for(const [cx,cz] of L.sillas) chair(cx, cz, mcx, m.type === "box" ? cz : mcz, furn);

  const d = L.desk;
  furn.add(box(d.x,0.72,d.z,d.x+d.w,0.75,d.z+d.d,C.woodLight));
  furn.add(box(d.x+0.02,0,d.z+0.02,d.x+d.w-0.02,0.72,d.z+0.06,C.black));
  furn.add(box(d.x+0.02,0,d.z+d.d-0.06,d.x+d.w-0.02,0.72,d.z+d.d-0.02,C.black));
  const mz = d.z+d.d/2;
  furn.add(box(d.x+0.08,0.75,mz-0.04,d.x+0.12,1.05,mz+0.04,C.metal));
  furn.add(box(d.x+0.12,0.95,mz-0.62,d.x+0.15,1.3,mz-0.02,C.black,{roughness:0.3}));
  furn.add(box(d.x+0.12,0.95,mz+0.02,d.x+0.15,1.3,mz+0.62,C.black,{roughness:0.3}));
  furn.add(box(d.x+0.32,0.75,mz-0.22,d.x+0.45,0.77,mz+0.22,0x4a4e52));
  furn.add(box(d.x+0.2,0,d.z+d.d-0.28,d.x+0.42,0.45,d.z+d.d-0.07,C.printer));
  chair(L.deskChair[0], L.deskChair[1], 0, L.deskChair[1], furn, C.black);
  tag("Escritorio", "120 × 60", d.x+d.w/2, 1.45, mz, furn);

  const p = L.printer, pc = p.z+p.d/2;
  furn.add(box(p.x,0,p.z,p.x+p.w,p.h,p.z+p.d,C.wood));
  furn.add(box(p.x+0.03,p.h,pc-0.2,p.x+p.w-0.02,p.h+0.42,pc+0.2,C.printer));
  furn.add(box(p.x+0.02,p.h+0.05,pc-0.19,p.x+0.031,p.h+0.4,pc+0.19,glassMat));
  tag("Impresora 3D", p.label, p.x+p.w/2, p.h+0.62, pc, furn);

  const rows = [
    ["Sillón Nube", s.label], [r.y0 > 0 ? "Rack flotante" : "Rack TV", r.label], ["Ratona", t.label],
    [m.name, m.label], ["Escritorio", "120 × 60"], ["Mueble impresora 3D", p.label]
  ];
  const legend = document.getElementById("legend");
  legend.replaceChildren(...rows.flatMap(([a,b]) => {
    const dt = document.createElement("dt"); dt.textContent = a;
    const dd = document.createElement("dd"); dd.textContent = b;
    return [dt, dd];
  }));
}

// ---------- vistas ----------
// Cada vista: posición de cámara y punto al que mira. En pantallas verticales se aleja la cámara
// y se abre el lente para que entre todo el ambiente.
const VIEWS = {
  iso:        {p:[6.4,6.6,9.6],   t:[2.2,0,2.6],   wide:true},
  plan:       {p:[2.6,13.5,2.61], t:[2.6,0,2.6],   wide:true},
  entrada:    {p:[0.7,1.6,-1.6],  t:[1.5,0.9,4.5]},
  cocina:     {p:[2.4,1.6,0.25],  t:[1.0,0.9,5.2]},
  balcon:     {p:[1.5,1.6,6.9],   t:[1.4,0.9,0.8]},
  escritorio: {p:[1.9,1.55,4.2],  t:[0.1,1.0,5.6]},
};
let currentView = "iso";
// Vista general en vertical: la cámara mira a lo largo del depto para que el largo quede a lo alto.
const ISO_PORTRAIT = {p:[5.0,9.6,12.6], t:[1.9,0,2.0]};
function viewFor(k){
  const a = camera.aspect;
  if(k === "plan"){
    // planta casi ortogonal: lente cerrado y altura calculada para que entre todo
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const h = Math.max(6.3 / half, 3.5 / (half * a));
    return {p:new THREE.Vector3(2.7, h, 2.11), t:new THREE.Vector3(2.7, 0, 2.1)};
  }
  const v = (k === "iso" && a < 1) ? ISO_PORTRAIT : VIEWS[k];
  const t = new THREE.Vector3(...v.t), p = new THREE.Vector3(...v.p);
  if(k === "iso" && a < 1){
    // celulares muy angostos: alejar un poco más
    p.sub(t).multiplyScalar(Math.max(1, 0.62 / a)).add(t);
  }
  return {p, t};
}
function updateFov(){
  const a = camera.aspect;
  const interior = !VIEWS[currentView].wide;
  camera.fov = currentView === "plan" ? 30 : a < 1 ? (interior ? 72 : 52) : (interior ? 62 : 50);
  camera.updateProjectionMatrix();
}

let anim = null;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
function goView(k, instant = false){
  currentView = k;
  updateFov();
  const to = viewFor(k);
  if(reduce || instant){ camera.position.copy(to.p); controls.target.copy(to.t); controls.update(); anim = null; return; }
  anim = {from:{p:camera.position.clone(), t:controls.target.clone()}, to, start:performance.now(), dur:900};
}

function press(groupSel, btn){
  document.querySelectorAll(groupSel).forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
}
document.querySelectorAll("[data-v]").forEach(b => b.addEventListener("click", () => { press("[data-v]", b); goView(b.dataset.v); }));
document.querySelectorAll("[data-l]").forEach(b => b.addEventListener("click", () => {
  press("[data-l]", b);
  buildFurniture(b.dataset.l);
  try{ localStorage.setItem("living-layout", b.dataset.l); }catch(e){}
  try{ history.replaceState(null, "", "#" + b.dataset.l); }catch(e){}
}));
const wallsBtn = document.getElementById("t-walls");
wallsBtn.addEventListener("click", () => {
  const low = wallsBtn.getAttribute("aria-pressed") !== "true";
  wallsBtn.setAttribute("aria-pressed", String(low));
  wallsGroup.scale.y = low ? 1 / H : 1;
});
const tagsBtn = document.getElementById("t-tags");
tagsBtn.addEventListener("click", () => {
  const on = tagsBtn.getAttribute("aria-pressed") !== "true";
  tagsBtn.setAttribute("aria-pressed", String(on));
  labelsEl.classList.toggle("hide-tags", !on);
});

// pista de gestos: desaparece al primer toque
const hint = document.getElementById("hint");
if(!isTouch) hint.textContent = "Arrastrá para girar · rueda para acercar · clic derecho para mover";
const hideHint = () => hint.classList.add("gone");
renderer.domElement.addEventListener("pointerdown", hideHint, {once:true});
setTimeout(hideHint, 6000);

// ---------- arranque ----------
let start = "A2";
const fromHash = location.hash.replace("#", "");
if(LAYOUTS[fromHash]) start = fromHash;
else { try{ const s = localStorage.getItem("living-layout"); if(LAYOUTS[s]) start = s; }catch(e){} }
press("[data-l]", document.querySelector(`[data-l="${start}"]`));
buildFurniture(start);

function resize(){
  const w = stage.clientWidth, h = stage.clientHeight;
  if(!w || !h) return;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  updateFov();
}
new ResizeObserver(() => { resize(); }).observe(stage);
resize();
goView("iso", true);
// al girar el celular se reencuadra la vista activa
addEventListener("orientationchange", () => setTimeout(() => { resize(); goView(currentView, true); }, 250));

// render solo cuando hace falta (ahorra batería en el celular)
let needs = true;
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
  controls.update();
  if(needs){
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    needs = false;
  }
});
// cualquier cambio de muebles/muros/tamaño fuerza un render
for(const b of document.querySelectorAll("button")) b.addEventListener("click", () => { needs = true; });
new ResizeObserver(() => { needs = true; }).observe(stage);
darkMQ.addEventListener?.("change", () => { needs = true; });
window.__living = { goView, buildFurniture, render: () => { needs = true; } };
