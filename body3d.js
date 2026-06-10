/* ============================================================
   ANYELOSKI — Holograma anatómico 3D (selector de zona)
   Malla humana escultórica real (CC0 dominio público —
   OpenGameArt "Low Poly Male Base Mesh", incrustada en
   vendor/human.obj.js) renderizada como holograma: fresnel cian
   en contornos, cuerpo translúcido y scanlines.

   Segmentación profesional para cotización de tatuajes
   (spec: prompt.txt — "TattooBodySelector"): las zonas no son
   piezas separadas; cada punto del cuerpo se clasifica por
   región anatómica, el mismo mapa vive en JS (raycast) y en
   GLSL (iluminar la región). 30 regiones base, las pares
   distinguen izquierda/derecha (id = base + 100 izq / 200 der):
   cabeza, cuello, clavícula, esternón, pecho, costillas,
   abdomen sup/inf, costado, espalda alta/media/baja, hombro,
   brazo, codo, antebrazo, muñeca, mano, pelvis, cadera, glúteo,
   ingle, muslo frontal/posterior, rodilla, pantorrilla,
   espinilla, tobillo, empeine, planta.

   Arrastra para girar 360°, rueda / pellizco / botones ± para
   zoom (con límites), botones Frente/Espalda animan la vista,
   etiqueta flotante muestra la zona bajo el cursor.
   Sin rotación automática, sin avance de paso al seleccionar.
   Requiere vendor/three.min.js (carga perezosa desde app.js).
   ============================================================ */
window.__initBody3D = function(container, onSelect){
  'use strict';
  if(!window.THREE) return null;
  const T = window.THREE;

  let renderer;
  try{
    renderer = new T.WebGLRenderer({antialias:true, alpha:true});
  }catch(e){ return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // el acento puede cambiar desde el panel Tweaks — léelo del CSS
  const accentHex = ()=>{
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim() || '#00e5ff';
    return new T.Color(v);
  };

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(33, 1, .1, 60);
  // zoom: distancia animada con límites prudentes
  const CAM = {min:5.4, max:12.0, def:8.7};
  let camD = CAM.def, camT = CAM.def;
  function aimCamera(){
    camera.position.set(0, .95, camD);
    camera.lookAt(0, .45, 0);
  }
  aimCamera();

  const group = new T.Group();
  scene.add(group);

  /* ════════ MAPA ANATÓMICO (spec prompt.txt) ════════
     Coordenadas tras normalizar: suelo y=-1.80, frente a +Z.
     El brazo se detecta por distancia a su eje (cuelga en
     diagonal): hombro → brazo → codo → antebrazo → muñeca →
     mano. El resto por bandas de altura + frente/espalda +
     franja lateral. Zonas pares: id = base + 100 (izq, x>0) ó
     + 200 (der). El mismo mapa vive en el fragment shader. */
  const BASE = [null,'Cabeza','Cuello','Clavícula','Esternón','Pecho','Costillas',
    'Abdomen superior','Abdomen inferior','Costado','Espalda alta','Espalda media',
    'Espalda baja','Hombro','Brazo','Codo','Antebrazo','Muñeca','Mano','Pelvis',
    'Cadera','Glúteo','Ingle','Muslo frontal','Muslo posterior','Rodilla',
    'Pantorrilla','Espinilla','Tobillo','Empeine','Planta del pie'];
  function nameOf(id){
    if(!id) return '';
    const b = id % 100, s = Math.floor(id / 100);
    return BASE[b] + (s === 1 ? ' izq.' : s === 2 ? ' der.' : '');
  }
  const SHO = {x:.62, y:1.89};               // pivote del hombro
  const ANG = -1.12;                         // caída del brazo (~64°)
  const DIR = {x:Math.cos(ANG), y:Math.sin(ANG)};
  function zoneOf(p){
    const ax = Math.abs(p.x), y = p.y, z = p.z;
    const S = b => b + (p.x > 0 ? 100 : 200);   // lado anatómico (izq = +x)
    // — cadena del brazo: cilindro alrededor del eje del brazo —
    if(ax > .40 && y > .2){
      const qx = ax - SHO.x, qy = y - SHO.y;
      const s = Math.min(1.61, Math.max(0, qx*DIR.x + qy*DIR.y));
      const dx = qx - DIR.x*s, dy = qy - DIR.y*s;
      if(Math.hypot(dx, dy) < .28){
        if(s < .33)  return S(13);   // hombro (deltoides)
        if(s < .72)  return S(14);   // brazo
        if(s < .88)  return S(15);   // codo
        if(s < 1.24) return S(16);   // antebrazo
        if(s < 1.38) return S(17);   // muñeca
        return S(18);                // mano
      }
    }
    if(y > 2.26) return 1;                        // cabeza
    if(y > 2.02) return ax > .18 ? S(13) : 2;     // cuello (trapecio → hombro)
    if(y > 1.76){                                 // línea de la clavícula
      if(ax > .34) return S(13);                  // hombro
      return z > -.02 ? 3 : 10;                   // clavícula / espalda alta
    }
    if(y > .80){                                  // caja torácica + abdomen
      if(ax > .29) return y > 1.18 ? S(6) : S(9); // costillas / costado
      if(z > -.02){
        if(ax < .13 && y > 1.18) return 4;        // esternón
        if(y > 1.28) return S(5);                 // pecho
        return y > 1.04 ? 7 : 8;                  // abdomen sup / inf
      }
      if(y > 1.50) return 10;                     // espalda alta
      if(y > 1.12) return 11;                     // espalda media
      return 12;                                  // espalda baja
    }
    if(y > .28){                                  // cintura pélvica
      if(z <= -.02){
        if(ax > .36) return S(20);                // cadera (lateral)
        return y > .66 ? 12 : S(21);              // espalda baja / glúteo
      }
      if(ax > .26) return S(20);                  // cadera
      return (y < .42 && ax < .18) ? 22 : 19;     // ingle / pelvis
    }
    if(y > -.62) return z > -.02 ? S(23) : S(24); // muslo frontal / posterior
    if(y > -.84) return S(25);                    // rodilla
    if(y > -1.40) return z > -.02 ? S(27) : S(26);// espinilla / pantorrilla
    if(y > -1.56) return S(28);                   // tobillo
    return y < -1.74 ? S(30) : S(29);             // planta / empeine
  }

  /* ════════ SHADER HOLOGRÁFICO ════════ */
  const VERT = [
    'varying vec3 vN; varying vec3 vV; varying vec3 vP;',
    'void main(){',
    '  vec4 mv = modelViewMatrix * vec4(position,1.0);',
    '  vN = normalMatrix * normal;',
    '  vV = -mv.xyz;',
    '  vP = position;',
    '  gl_Position = projectionMatrix * mv;',
    '}',
  ].join('\n');
  const FRAG = [
    'precision highp float;',
    'uniform vec3 uAccent; uniform float uTime;',
    'uniform float uSel; uniform float uHov; uniform float uSelI; uniform float uHovI;',
    'varying vec3 vN; varying vec3 vV; varying vec3 vP;',
    'float S(float x, float b){ return b + (x > 0.0 ? 100.0 : 200.0); }',
    'float zoneOf(vec3 p){',
    '  float ax = abs(p.x);',
    '  if(ax > .40 && p.y > .2){',
    '    vec2 q = vec2(ax - .62, p.y - 1.89);',
    '    vec2 d = vec2(' + DIR.x.toFixed(5) + ',' + DIR.y.toFixed(5) + ');',
    '    float s = clamp(dot(q, d), 0.0, 1.61);',
    '    if(distance(q, d * s) < .28){',
    '      if(s < .33)  return S(p.x, 13.);',
    '      if(s < .72)  return S(p.x, 14.);',
    '      if(s < .88)  return S(p.x, 15.);',
    '      if(s < 1.24) return S(p.x, 16.);',
    '      if(s < 1.38) return S(p.x, 17.);',
    '      return S(p.x, 18.);',
    '    }',
    '  }',
    '  if(p.y > 2.26) return 1.;',
    '  if(p.y > 2.02) return ax > .18 ? S(p.x, 13.) : 2.;',
    '  if(p.y > 1.76){',
    '    if(ax > .34) return S(p.x, 13.);',
    '    return p.z > -.02 ? 3. : 10.;',
    '  }',
    '  if(p.y > .80){',
    '    if(ax > .29) return p.y > 1.18 ? S(p.x, 6.) : S(p.x, 9.);',
    '    if(p.z > -.02){',
    '      if(ax < .13 && p.y > 1.18) return 4.;',
    '      if(p.y > 1.28) return S(p.x, 5.);',
    '      return p.y > 1.04 ? 7. : 8.;',
    '    }',
    '    if(p.y > 1.50) return 10.;',
    '    if(p.y > 1.12) return 11.;',
    '    return 12.;',
    '  }',
    '  if(p.y > .28){',
    '    if(p.z <= -.02){',
    '      if(ax > .36) return S(p.x, 20.);',
    '      return p.y > .66 ? 12. : S(p.x, 21.);',
    '    }',
    '    if(ax > .26) return S(p.x, 20.);',
    '    return (p.y < .42 && ax < .18) ? 22. : 19.;',
    '  }',
    '  if(p.y > -.62) return p.z > -.02 ? S(p.x, 23.) : S(p.x, 24.);',
    '  if(p.y > -.84) return S(p.x, 25.);',
    '  if(p.y > -1.40) return p.z > -.02 ? S(p.x, 27.) : S(p.x, 26.);',
    '  if(p.y > -1.56) return S(p.x, 28.);',
    '  return p.y < -1.74 ? S(p.x, 30.) : S(p.x, 29.);',
    '}',
    // un id sin lado (< 100, elegido desde la lista) ilumina ambos lados
    'float match(float z, float sel){',
    '  if(sel < .5) return 0.0;',
    '  if(sel < 99.5) return abs(mod(z, 100.0) - sel) < .5 ? 1.0 : 0.0;',
    '  return abs(z - sel) < .5 ? 1.0 : 0.0;',
    '}',
    'void main(){',
    '  vec3 n = normalize(vN);',
    '  vec3 v = normalize(vV);',
    '  float fres = pow(1.0 - abs(dot(n, v)), 2.6);',
    '  float scan = .92 + .08 * sin(vP.y * 70.0 + uTime * 1.6);',
    '  float z = zoneOf(vP);',
    '  float fill = match(z, uSel) * uSelI + match(z, uHov) * uHovI * .45;',
    '  float i = .055 + fres * (.92 + .5 * fill) + fill * .42;',
    '  gl_FragColor = vec4(uAccent * i * scan, 1.0);',
    '}',
  ].join('\n');

  const mat = new T.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      uAccent:{value: accentHex()}, uTime:{value: 0},
      uSel:{value: 0}, uHov:{value: 0},
      uSelI:{value: 0}, uHovI:{value: 0},
    },
    transparent: true, blending: T.AdditiveBlending,
    depthWrite: false, side: T.DoubleSide,
  });

  /* ════════ CARGA DE LA MALLA (OBJ mínimo: v + caras quad) ════════ */
  let bodyMesh = null;
  const smooth = (a, b, x)=>{
    const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  // window.__HUMAN_OBJ la incrusta vendor/human.obj.js (funciona incluso
  // en file://); el fetch directo queda como respaldo
  (window.__HUMAN_OBJ
    ? Promise.resolve(window.__HUMAN_OBJ)
    : fetch('vendor/human.obj').then(r=>{ if(!r.ok) throw 0; return r.text(); }))
    .then(txt=>{
      const vs = [], idx = [];
      txt.split('\n').forEach(line=>{
        if(line[0] === 'v' && line[1] === ' '){
          const p = line.trim().split(/\s+/);
          vs.push(+p[1], +p[2], +p[3]);
        }else if(line[0] === 'f' && line[1] === ' '){
          const f = line.trim().split(/\s+/).slice(1).map(s=> parseInt(s, 10) - 1);
          for(let i = 2; i < f.length; i++) idx.push(f[0], f[i-1], f[i]);  // fan
        }
      });
      // normaliza: altura 4.55, suelo en y=-1.80, frente a +Z
      let minY = 1e9, maxY = -1e9;
      for(let i = 1; i < vs.length; i += 3){
        if(vs[i] < minY) minY = vs[i];
        if(vs[i] > maxY) maxY = vs[i];
      }
      const s = 4.55 / (maxY - minY), ty = -1.80 - minY * s;
      const pos = new Float32Array(vs.length);
      for(let i = 0; i < vs.length; i += 3){
        pos[i]   = vs[i]   * s;
        pos[i+1] = vs[i+1] * s + ty;
        pos[i+2] = vs[i+2] * s;
      }
      // alarga ligeramente el cuello: estira hacia arriba desde los
      // hombros con rampa suave (la cabeza sube completa)
      for(let i = 1; i < pos.length; i += 3){
        pos[i] += .12 * smooth(2.00, 2.50, pos[i]);
      }
      // baja los brazos del T-pose a una pose relajada (~64°),
      // rotando alrededor del hombro con mezcla suave en la axila
      for(let i = 0; i < pos.length; i += 3){
        const ax = Math.abs(pos[i]), y = pos[i+1];
        if(ax > SHO.x - .18 && y > .9){
          const w = smooth(SHO.x - .15, SHO.x + .30, ax) * ANG;
          const c = Math.cos(w), sn = Math.sin(w);
          const dx = ax - SHO.x, dy = y - SHO.y;
          const nx = SHO.x + dx * c - dy * sn;
          pos[i]   = nx * Math.sign(pos[i] || 1);
          pos[i+1] = SHO.y + dx * sn + dy * c;
        }
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      bodyMesh = new T.Mesh(geo, mat);
      group.add(bodyMesh);
    })
    .catch(()=>{
      container.dispatchEvent(new CustomEvent('b3dfail'));
    });

  // — anillo de piso con marca frontal —
  const ring = new T.Mesh(
    new T.RingGeometry(.96, .985, 64),
    new T.MeshBasicMaterial({color:accentHex().getHex(), transparent:true, opacity:.22,
      blending:T.AdditiveBlending, depthWrite:false, side:T.DoubleSide})
  );
  ring.rotation.x = -Math.PI/2;
  ring.position.y = -1.79;
  group.add(ring);
  const frontDot = new T.Mesh(
    new T.CircleGeometry(.045, 16),
    new T.MeshBasicMaterial({color:accentHex().getHex(), transparent:true, opacity:.9,
      blending:T.AdditiveBlending, depthWrite:false, side:T.DoubleSide})
  );
  frontDot.rotation.x = -Math.PI/2;
  frontDot.position.set(0, -1.785, .97);
  group.add(frontDot);

  /* ════════ INTERACCIÓN ════════ */
  const ray = new T.Raycaster();
  const ptr = new T.Vector2();
  let hovZone = 0, selZone = 0;
  let hovT = 0, selT = 0;   // objetivos de intensidad (animados en frame)

  // etiqueta flotante: nombre de la zona bajo el cursor
  const tip = document.createElement('span');
  tip.className = 'b3d-tip';
  tip.setAttribute('aria-hidden', 'true');
  container.appendChild(tip);
  function syncTip(z, clientX, clientY){
    if(!z){ tip.classList.remove('on'); return; }
    tip.textContent = nameOf(z);
    const r = container.getBoundingClientRect();
    tip.style.left = (clientX - r.left + 16) + 'px';
    tip.style.top  = (clientY - r.top  - 10) + 'px';
    tip.classList.add('on');
  }

  function paint(){
    const acc = accentHex();
    ring.material.color.copy(acc);
    frontDot.material.color.copy(acc);
    mat.uniforms.uAccent.value.copy(acc);
    mat.uniforms.uSel.value = selZone;
    mat.uniforms.uHov.value = hovZone;
    selT = selZone ? 1 : 0;
    hovT = (hovZone && hovZone !== selZone) ? 1 : 0;
  }

  function pick(clientX, clientY){
    if(!bodyMesh) return 0;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.x = ((clientX - r.left) / r.width)  * 2 - 1;
    ptr.y = -((clientY - r.top)  / r.height) * 2 + 1;
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObject(bodyMesh, false)[0];
    if(!hit) return 0;
    const p = group.worldToLocal(hit.point.clone());
    return zoneOf(p);
  }

  // — etiqueta de orientación (Frente / Perfil / Espalda) —
  const faceEl = container.querySelector('.b3d-face');
  let faceLabel = '';
  function syncFace(){
    if(!faceEl) return;
    const c = Math.cos(group.rotation.y);
    const label = c > .45 ? 'Frente' : (c < -.45 ? 'Espalda' : 'Perfil');
    if(label !== faceLabel){ faceLabel = label; faceEl.textContent = label; }
  }

  // — botones de vista: giran el modelo con animación —
  let targetY = null;
  container.querySelectorAll('.b3d-views button').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      const want = btn.dataset.view === 'back' ? Math.PI : 0;
      // toma el camino corto desde la rotación actual
      const cur = group.rotation.y;
      targetY = Math.round((cur - want) / (Math.PI*2)) * Math.PI*2 + want;
      group.rotation.x = 0;
    });
  });

  // — zoom: botones ± / rueda / pellizco, siempre dentro de límites —
  const clampZ = v => Math.min(CAM.max, Math.max(CAM.min, v));
  container.querySelectorAll('.b3d-zoom button').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      camT = clampZ(camT + (btn.dataset.z === 'in' ? -1.3 : 1.3));
    });
  });
  container.addEventListener('wheel', e=>{
    e.preventDefault();
    camT = clampZ(camT + e.deltaY * .0045);
  }, {passive:false});

  // — arrastre para girar (360° en Y, leve inclinación en X) + pellizco —
  const pts = new Map();          // punteros activos
  let down = null, moved = 0, pinch = null;
  const el = renderer.domElement;
  el.style.touchAction = 'pan-y';   // el scroll vertical sigue siendo de la página

  el.addEventListener('pointerdown', e=>{
    pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if(pts.size === 2){             // segundo dedo: pasa de girar a zoom
      const [a, b] = [...pts.values()];
      pinch = {base: Math.hypot(a.x-b.x, a.y-b.y), camT0: camT};
      down = null;
      return;
    }
    down = {x:e.clientX, y:e.clientY, ry:group.rotation.y, rx:group.rotation.x};
    moved = 0; targetY = null;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', e=>{
    if(pinch && pts.has(e.pointerId)){
      pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x-b.x, a.y-b.y);
      if(d > 10) camT = clampZ(pinch.camT0 * pinch.base / d);
      return;
    }
    if(down){
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      group.rotation.y = down.ry + dx * .011;
      group.rotation.x = Math.max(-.3, Math.min(.3, down.rx + dy * .004));
      syncTip(0);
    }else{
      const z = pick(e.clientX, e.clientY);
      if(z !== hovZone){ hovZone = z; paint(); }
      syncTip(z, e.clientX, e.clientY);
      el.style.cursor = z ? 'pointer' : 'grab';
    }
  });
  el.addEventListener('pointerup', e=>{
    pts.delete(e.pointerId);
    if(pts.size < 2) pinch = null;
    if(down && moved < 7){
      const z = pick(e.clientX, e.clientY);
      if(z){
        selZone = z;
        paint();
        if(onSelect) onSelect(nameOf(z));
      }
    }
    down = null;
  });
  el.addEventListener('pointercancel', e=>{
    pts.delete(e.pointerId);
    if(pts.size < 2) pinch = null;
    down = null;
  });
  el.addEventListener('pointerleave', ()=>{
    if(hovZone){ hovZone = 0; paint(); }
    syncTip(0);
  });

  /* ════════ RENDER (pausado fuera de viewport) ════════ */
  let running = true, raf = 0;
  const t0 = performance.now();
  function frame(){
    if(!running) return;
    raf = requestAnimationFrame(frame);
    if(targetY !== null && !down){
      group.rotation.y += (targetY - group.rotation.y) * .09;
      if(Math.abs(targetY - group.rotation.y) < .002){
        group.rotation.y = targetY; targetY = null;
      }
    }
    if(Math.abs(camT - camD) > .002){
      camD += (camT - camD) * .12;
      aimCamera();
    }
    const u = mat.uniforms;
    u.uTime.value = (performance.now() - t0) / 1000;
    u.uSelI.value += (selT - u.uSelI.value) * .14;
    u.uHovI.value += (hovT - u.uHovI.value) * .18;
    syncFace();
    renderer.render(scene, camera);
  }
  const vio = new IntersectionObserver(es=>{
    const on = es.some(e=>e.isIntersecting);
    if(on && !running){ running = true; frame(); }
    else if(!on){ running = false; cancelAnimationFrame(raf); }
  });
  vio.observe(container);

  function resize(){
    const w = container.clientWidth, h = container.clientHeight;
    if(!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();
  paint();
  syncFace();
  frame();

  return {
    // acepta "Pecho", "Pecho izq." o "Pecho der."; sin lado, una zona
    // par ilumina ambos lados (elección desde la lista de chips)
    setZone(name){
      if(!name){ selZone = 0; paint(); return; }
      let side = 0, base = name;
      if(name.endsWith(' izq.')){ side = 100; base = name.slice(0, -5); }
      else if(name.endsWith(' der.')){ side = 200; base = name.slice(0, -5); }
      const b = BASE.indexOf(base);
      selZone = b > 0 ? b + side : 0;
      paint();
    },
  };
};
