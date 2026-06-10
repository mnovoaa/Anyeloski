/* ============================================================
   ANYELOSKI — interaction layer
   ============================================================ */
(function(){
  'use strict';
  const $  = (s,c)=> (c||document).querySelector(s);
  const $$ = (s,c)=> Array.from((c||document).querySelectorAll(s));

  /* ============================================================
     INAUGURACIÓN — cuenta regresiva
     La fecha se configura en window.LAUNCH_DATE (Anyeloski.html).
     Si la fecha ya pasó, la puerta nunca se muestra; si llega a
     cero en vivo, se desvanece y revela el sitio automáticamente.
     ============================================================ */
  (function(){
    const gate = $('#launch-gate');
    if(!gate || gate.hidden) return;                 // ya pasó la fecha
    const target = new Date(window.LAUNCH_DATE).getTime();
    const el = { d:$('#lg-d'), h:$('#lg-h'), m:$('#lg-m'), s:$('#lg-s') };
    const pad = n => String(n).padStart(2,'0');
    function lift(){
      gate.classList.add('lifting');
      document.documentElement.classList.remove('gated');
      setTimeout(()=>{ gate.hidden = true; gate.setAttribute('aria-hidden','true'); }, 1200);
    }
    function tick(){
      let diff = target - Date.now();
      if(diff <= 0){ clearInterval(timer); lift(); return; }
      diff = Math.floor(diff/1000);
      el.d.textContent = pad(Math.floor(diff/86400));
      el.h.textContent = pad(Math.floor(diff%86400/3600));
      el.m.textContent = pad(Math.floor(diff%3600/60));
      el.s.textContent = pad(diff%60);
    }
    const timer = setInterval(tick, 1000);
    tick();
  })();

  /* ---------- NAV scroll state ---------- */
  const nav = $('.nav');
  const onScroll = ()=>{ if(nav) nav.classList.toggle('scrolled', window.scrollY>40); };
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = $('.nav-burger'), mobileMenu = $('#mobile-menu');
  if(burger && mobileMenu){
    const toggle=(open)=>{ const o = open ?? !mobileMenu.classList.contains('open');
      mobileMenu.classList.toggle('open', o); burger.classList.toggle('is-open', o);
      document.body.style.overflow = o ? 'hidden' : ''; };
    burger.addEventListener('click', ()=>toggle());
    $$('#mobile-menu a').forEach(a=> a.addEventListener('click', ()=>toggle(false)));
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((es)=>{
    es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
  },{threshold:.12, rootMargin:'0px 0px -8% 0px'});
  const revealEls = $$('[data-reveal]');
  revealEls.forEach(el=>io.observe(el));
  // Safety net: never let content stay hidden if IO is throttled/unsupported.
  setTimeout(()=> revealEls.forEach(el=>el.classList.add('in')), 2600);

  /* ---------- Video del autor: carga diferida al acercarse ---------- */
  const lazyVid = $('video[data-src]');
  if(lazyVid){
    const vio = new IntersectionObserver((es)=>{
      es.forEach(e=>{
        if(!e.isIntersecting) return;
        lazyVid.src = lazyVid.dataset.src;
        lazyVid.play().catch(()=>{});
        vio.disconnect();
      });
    },{rootMargin:'400px 0px'});
    vio.observe(lazyVid);
  }

  /* ---------- Hero entrance (gated so base stays visible if frozen) ---------- */
  const hero = document.querySelector('.hero');
  if(hero) requestAnimationFrame(()=> requestAnimationFrame(()=> hero.classList.add('ready')));

  /* ---------- Custom cursor ---------- */
  const dot = $('.cursor-dot'), ring = $('.cursor-ring');
  if(dot && ring && matchMedia('(hover:hover) and (pointer:fine)').matches){
    let rx=0, ry=0, tx=0, ty=0;
    window.addEventListener('mousemove', e=>{
      tx=e.clientX; ty=e.clientY;
      dot.style.transform=`translate(${tx}px,${ty}px) translate(-50%,-50%)`;
    });
    const loop=()=>{ rx+=(tx-rx)*.18; ry+=(ty-ry)*.18;
      ring.style.transform=`translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop); };
    loop();
    const hot='a,button,.chip,.zone,.cursor-target,input,textarea,image-slot';
    document.addEventListener('mouseover', e=>{ if(e.target.closest(hot)) ring.classList.add('is-hot'); });
    document.addEventListener('mouseout',  e=>{ if(e.target.closest(hot)) ring.classList.remove('is-hot'); });
  }

  /* ---------- Carruseles (Archivo, Lanzamiento, Taller) ---------- */
  $$('.cat, .lanza-group, .wall-car').forEach(box=>{
    const track = $('.cat-track', box);
    if(!track) return;
    const step = ()=> {
      const slide = track.firstElementChild;
      return slide ? slide.getBoundingClientRect().width + 16 : 320;
    };
    $$('.cat-btn', box).forEach(btn=>{
      btn.addEventListener('click', ()=> track.scrollBy({left: step() * +btn.dataset.dir, behavior:'smooth'}));
    });
    // estado de flechas según posición de scroll
    const syncBtns = ()=>{
      const max = track.scrollWidth - track.clientWidth - 2;
      $$('.cat-btn', box).forEach(btn=>{
        const d = +btn.dataset.dir;
        btn.disabled = d < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max;
      });
    };
    track.addEventListener('scroll', syncBtns, {passive:true});
    window.addEventListener('resize', syncBtns, {passive:true});
    syncBtns();
  });

  /* ---------- Smooth anchor nav ---------- */
  $$('a[data-scroll]').forEach(a=>{
    a.addEventListener('click', e=>{
      const t = $(a.getAttribute('href'));
      if(t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth', block:'start'}); }
    });
  });

  /* ============================================================
     EL RITUAL — booking state machine
     · Validación suave (no avanza sin zona, con aviso claro)
     · Avance automático al elegir zona
     · Persistencia en localStorage (sobrevive recargas)
     · Pasos bloqueados hasta completar los anteriores
     · Contrato editable (clic en una línea vuelve a su paso)
     ============================================================ */
  const ritual = {
    step:0, maxStep:0,
    zona:null,
    w:12, h:9,
    styles:new Set(),
  };
  const R_KEY = 'anyeloski:ritual';
  const panes = $$('.step-pane');
  const tabs  = $$('.step-tab');
  const prevBtn = $('#r-prev'), nextBtn = $('#r-next');
  const stepBody = $('#step-body'), doneScreen = $('#ritual-done');
  const panelEl = $('.ritual-panel');
  const stepMeta = $('#step-meta');
  const ideaTa = $('#idea-text');
  const ROMAN = ['I','II','III','IV'];
  const STEP_NAMES = ['La Zona','La Escala','La Idea','El Compromiso'];

  // — persistencia: la solicitud sobrevive recargas —
  try{
    const s = JSON.parse(localStorage.getItem(R_KEY));
    if(s){
      ritual.zona = s.zona || null;
      ritual.w = Math.max(1, +s.w || 12);
      ritual.h = Math.max(1, +s.h || 9);
      (s.styles || []).forEach(v => ritual.styles.add(v));
      ritual.maxStep = Math.min(+s.maxStep || 0, panes.length - 1);
      if(ideaTa && s.idea) ideaTa.value = s.idea;
    }
  }catch(e){}
  function saveR(){
    try{ localStorage.setItem(R_KEY, JSON.stringify({
      zona: ritual.zona, w: ritual.w, h: ritual.h,
      styles: Array.from(ritual.styles),
      idea: ideaTa ? ideaTa.value : '',
      maxStep: ritual.maxStep,
    })); }catch(e){}
  }
  function clearR(){ try{ localStorage.removeItem(R_KEY); }catch(e){} }

  function classify(){
    const area = ritual.w * ritual.h;          // cm²
    // small if under ~12x12 ≈ 144cm², otherwise large
    return area < 150 ? {name:'Pequeño', abono:'$10.000'} : {name:'Gran formato', abono:'$20.000'};
  }
  function syncScale(){
    const c = classify();
    // construcción DOM segura (sin innerHTML)
    const cls = $('#scale-class');
    cls.textContent = '';
    const em = document.createElement('span'); em.className = 'em';
    const parts = c.name.split(' ');
    em.textContent = parts[0];
    cls.append(em, parts.length > 1 ? ' ' + parts.slice(1).join(' ') : '');
    $('#scale-abono').textContent = `Abono de reserva · ${c.abono}`;
    // live preview rect (cap visual size)
    const box = $('#preview-rect');
    const maxPx = 150;
    const scale = Math.min(maxPx/Math.max(ritual.w,ritual.h, 1), 7);
    box.style.width  = Math.max(ritual.w*scale, 12)+'px';
    box.style.height = Math.max(ritual.h*scale, 12)+'px';
    box.textContent = `${ritual.w}×${ritual.h}`;
    // resalta el preset que coincide con las medidas actuales
    $$('.chip.preset').forEach(p=>
      p.classList.toggle('sel', +p.dataset.w===ritual.w && +p.dataset.h===ritual.h));
  }

  // — indicador de paso + avisos suaves —
  let metaTimer;
  function setMeta(){
    if(!stepMeta) return;
    stepMeta.classList.remove('warn');
    stepMeta.textContent = `Paso ${ROMAN[ritual.step]} de IV · ${STEP_NAMES[ritual.step]}`;
  }
  function warn(msg){
    if(!stepMeta) return;
    stepMeta.textContent = msg;
    stepMeta.classList.add('warn');
    if(ritual.step===0){
      const zg = $('.zona-grid');
      if(zg){ zg.classList.remove('nudge'); void zg.offsetWidth; zg.classList.add('nudge'); }
    }
    clearTimeout(metaTimer);
    metaTimer = setTimeout(setMeta, 2400);
  }

  function setStep(n){
    const target = Math.max(0, Math.min(panes.length-1, n));
    stepBody.classList.toggle('back', target < ritual.step);
    ritual.step = target;
    ritual.maxStep = Math.max(ritual.maxStep, ritual.step);
    panes.forEach((p,i)=>p.classList.toggle('active', i===ritual.step));
    tabs.forEach((t,i)=>{
      t.classList.toggle('active', i===ritual.step);
      t.classList.toggle('done', i<ritual.step);
      t.classList.toggle('locked', i>ritual.maxStep);
    });
    prevBtn.disabled = ritual.step===0;
    nextBtn.textContent = ritual.step===panes.length-1 ? 'Confirmar solicitud →' : 'Continuar →';
    setMeta();
    if(ritual.step===3) fillContract();
    saveR();
    // si la cabecera del panel quedó fuera de vista (móvil), re-encuadra
    if(panelEl && panelEl.getBoundingClientRect().top < 0)
      panelEl.scrollIntoView({behavior:'smooth', block:'start'});
  }
  function fillContract(){
    const c = classify();
    $('#c-zona').textContent  = ritual.zona || '—';
    $('#c-med').textContent   = `${ritual.w} × ${ritual.h} cm`;
    $('#c-fmt').textContent   = c.name;
    $('#c-styles').textContent= ritual.styles.size ? Array.from(ritual.styles).join(' · ') : 'A definir en estudio';
    $('#c-abono').textContent = c.abono;
  }

  // pasos bloqueados hasta completar los anteriores
  tabs.forEach((t,i)=> t.addEventListener('click', ()=>{
    if(i > ritual.maxStep){ warn('Completa los pasos en orden'); return; }
    setStep(i);
  }));
  prevBtn.addEventListener('click', ()=> setStep(ritual.step-1));
  nextBtn.addEventListener('click', ()=>{
    if(ritual.step===0 && !ritual.zona){ warn('Marca una zona para continuar'); return; }
    if(ritual.step===panes.length-1){
      stepBody.style.display='none';
      $('.steps-bar').style.display='none';
      $('.step-foot').style.display='none';
      doneScreen.classList.add('show');
      $('#done-zona').textContent = ritual.zona || 'la zona indicada';
      const c = classify();
      const estilos = ritual.styles.size ? Array.from(ritual.styles).join(', ') : 'a definir';
      const idea = (ideaTa && ideaTa.value.trim()) || '';
      // resumen visual de la solicitud (DOM seguro)
      const recap = $('#done-recap');
      if(recap){
        recap.textContent = '';
        [['Zona', ritual.zona || '—'],
         ['Medidas', `${ritual.w} × ${ritual.h} cm · ${c.name}`],
         ['Estilo', estilos],
         ['Abono', c.abono]].forEach(([k,v])=>{
          const div = document.createElement('div');
          const dt = document.createElement('dt'); dt.textContent = k;
          const dd = document.createElement('dd'); dd.textContent = v;
          div.append(dt, dd); recap.appendChild(div);
        });
      }
      // Build a pre-filled WhatsApp message from the booking
      const msg =
        '¡Hola Miguel! Quiero reservar una sesión de tatuaje:\n'+
        '• Zona: '+(ritual.zona||'a definir')+'\n'+
        '• Medidas: '+ritual.w+'×'+ritual.h+' cm ('+c.name+')\n'+
        '• Estilo: '+estilos+'\n'+
        (idea ? '• Idea: '+idea+'\n' : '')+
        '• Abono de reserva: '+c.abono+'\n\n'+
        'Te envío en este chat la foto de la zona y mis referencias. ¿Coordinamos fecha?';
      const wsp = $('#done-wsp');
      if(wsp) wsp.href = 'https://wa.me/56957902862?text='+encodeURIComponent(msg);
      doneScreen.scrollIntoView({behavior:'smooth', block:'center'});
    } else setStep(ritual.step+1);
  });

  // Zona selector (modelo 3D + chips comparten estado).
  // Seleccionar solo selecciona: el visitante avanza cuando quiere.
  let body3d = null;
  function selectZona(name){
    ritual.zona = name;
    // el 3D puede traer lado ("Pecho izq."); el chip marca la zona base
    const base = (name || '').replace(/ (?:izq|der)\.$/, '');
    $$('.chip[data-zone]').forEach(c=> c.classList.toggle('sel', c.dataset.zone===base));
    if(body3d) body3d.setZone(name);
    const live = $('#zona-live b');
    if(live) live.textContent = name || '—';
    setMeta(); saveR();
  }
  $$('.chip[data-zone]').forEach(c=> c.addEventListener('click', ()=> selectZona(c.dataset.zone)));

  // Lista alternativa de zonas: plegada por defecto (el holograma manda).
  const zoneList = $('#zone-list'), zoneAltBtn = $('#zone-alt-toggle');
  function openZoneList(){
    if(!zoneList) return;
    zoneList.hidden = false;
    if(zoneAltBtn){ zoneAltBtn.classList.add('open'); zoneAltBtn.setAttribute('aria-expanded','true'); }
  }
  if(zoneAltBtn && zoneList){
    zoneAltBtn.addEventListener('click', ()=>{
      if(zoneList.hidden) openZoneList();
      else{
        zoneList.hidden = true;
        zoneAltBtn.classList.remove('open');
        zoneAltBtn.setAttribute('aria-expanded','false');
      }
    });
  }

  // — modelo anatómico 3D: Three.js se carga perezosamente al acercarse —
  const b3dBox = $('#body3d');
  if(b3dBox){
    // la malla humana se descarga aparte: si falla, cae a la lista
    b3dBox.addEventListener('b3dfail', ()=>{
      b3dBox.classList.remove('ready');
      b3dBox.classList.add('fail');
      openZoneList();
    });
    const loadScript = src => new Promise((res, rej)=>{
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    const io3d = new IntersectionObserver(es=>{
      if(!es.some(e=>e.isIntersecting)) return;
      io3d.disconnect();
      Promise.all([
        loadScript('vendor/three.min.js'),
        loadScript('vendor/human.obj.js'),   // malla incrustada (apta para file://)
      ])
        .then(()=> loadScript('body3d.js'))
        .then(()=>{
          body3d = window.__initBody3D(b3dBox, selectZona);
          if(body3d){
            b3dBox.classList.add('ready');
            if(ritual.zona) body3d.setZone(ritual.zona);
          } else { b3dBox.classList.add('fail'); openZoneList(); }
        })
        .catch(()=>{ b3dBox.classList.add('fail'); openZoneList(); });
    },{rootMargin:'700px 0px'});
    io3d.observe(b3dBox);
  }

  // Escala inputs + presets
  const wIn = $('#dim-w'), hIn = $('#dim-h');
  if(wIn && hIn){
    wIn.value = ritual.w; hIn.value = ritual.h;
    const upd=()=>{ ritual.w=Math.max(1,+wIn.value||0); ritual.h=Math.max(1,+hIn.value||0); syncScale(); saveR(); };
    wIn.addEventListener('input', upd); hIn.addEventListener('input', upd);
    syncScale();
  }
  $$('.chip.preset').forEach(p=> p.addEventListener('click', ()=>{
    ritual.w = +p.dataset.w; ritual.h = +p.dataset.h;
    if(wIn && hIn){ wIn.value = ritual.w; hIn.value = ritual.h; }
    syncScale(); saveR();
  }));

  // Idea: style chips + contador (las fotos se piden por WhatsApp)
  $$('.style-chips .chip').forEach(c=>{
    if(ritual.styles.has(c.dataset.style)) c.classList.add('sel');
    c.addEventListener('click', ()=>{
      const v=c.dataset.style;
      if(ritual.styles.has(v)){ ritual.styles.delete(v); c.classList.remove('sel'); }
      else { ritual.styles.add(v); c.classList.add('sel'); }
      saveR();
    });
  });
  if(ideaTa){
    const count = $('#idea-count');
    const updCount = ()=>{ if(count) count.textContent = `${ideaTa.value.length} / 600`; };
    ideaTa.addEventListener('input', ()=>{ updCount(); saveR(); });
    updCount();
  }

  // contrato editable: clic (o Enter) en una línea vuelve a su paso
  $$('.contract-lines .row[data-go]').forEach(r=>{
    const go = ()=> setStep(+r.dataset.go);
    r.addEventListener('click', go);
    r.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); go(); } });
  });

  // reinicio completo desde la pantalla final
  const restartBtn = $('#r-restart');
  if(restartBtn) restartBtn.addEventListener('click', ()=>{
    ritual.zona=null; ritual.w=12; ritual.h=9; ritual.styles.clear(); ritual.maxStep=0;
    if(ideaTa) ideaTa.value='';
    if(wIn && hIn){ wIn.value=12; hIn.value=9; }
    $$('.zone.sel, .chip.sel').forEach(el=> el.classList.remove('sel'));
    const live = $('#zona-live b'); if(live) live.textContent='—';
    const count = $('#idea-count'); if(count) count.textContent='0 / 600';
    clearR();
    doneScreen.classList.remove('show');
    stepBody.style.display='';
    $('.steps-bar').style.display='';
    $('.step-foot').style.display='';
    syncScale(); setStep(0);
  });

  // restaura la selección guardada en la interfaz
  if(ritual.zona) selectZona(ritual.zona, false);
  setStep(0);

  /* ============================================================
     TWEAKS — host protocol + persistence
     ============================================================ */
  const TW_KEY = 'anyeloski:tweaks';
  const defaults = { combo:'clasico', accent:'cyan', grain:'on', cursor:'on' };
  let tw = Object.assign({}, defaults);
  try{ const s=JSON.parse(localStorage.getItem(TW_KEY)); if(s) tw=Object.assign(tw,s); }catch(e){}

  const COMBOS = {
    clasico:    { display:"'Cinzel', serif",            body:"'Inter', system-ui, sans-serif",       stretch:'100%', track:'.04em' },
    brutalista: { display:"'Archivo', sans-serif",      body:"'Inter', system-ui, sans-serif",       stretch:'125%', track:'.005em' },
    contemp:    { display:"'Cormorant Garamond', serif",body:"'Plus Jakarta Sans', sans-serif",      stretch:'100%', track:'.01em' },
  };
  const ACCENTS = { cyan:'#00e5ff', red:'#e5484d', ivory:'#f4f4f0' };

  function applyTweaks(){
    const root = document.documentElement, b=document.body;
    const c = COMBOS[tw.combo] || COMBOS.clasico;
    root.style.setProperty('--font-display', c.display);
    root.style.setProperty('--font-body', c.body);
    root.style.setProperty('--display-stretch', c.stretch);
    root.style.setProperty('--display-track', c.track);
    const acc = ACCENTS[tw.accent] || ACCENTS.cyan;
    root.style.setProperty('--accent', acc);
    root.style.setProperty('--accent-glow', acc==='#f4f4f0' ? 'rgba(244,244,240,.5)' : acc+'8c');
    b.dataset.grain  = tw.grain;
    b.dataset.cursor = tw.cursor;
    // reflect active states in panel
    $$('#tw-combo button').forEach(x=> x.classList.toggle('on', x.dataset.v===tw.combo));
    $$('#tw-accent button').forEach(x=> x.classList.toggle('on', x.dataset.v===tw.accent));
    $$('#tw-grain button').forEach(x=> x.classList.toggle('on', x.dataset.v===tw.grain));
    $$('#tw-cursor button').forEach(x=> x.classList.toggle('on', x.dataset.v===tw.cursor));
  }
  function setTweak(k,v){
    tw[k]=v; applyTweaks();
    try{ localStorage.setItem(TW_KEY, JSON.stringify(tw)); }catch(e){}
    try{ window.parent.postMessage({type:'__edit_mode_set_keys', edits:{[k]:v}}, '*'); }catch(e){}
  }
  // wire controls
  $$('#tw-combo button').forEach(x=> x.addEventListener('click',()=>setTweak('combo',x.dataset.v)));
  $$('#tw-accent button').forEach(x=> x.addEventListener('click',()=>setTweak('accent',x.dataset.v)));
  $$('#tw-grain button').forEach(x=> x.addEventListener('click',()=>setTweak('grain',x.dataset.v)));
  $$('#tw-cursor button').forEach(x=> x.addEventListener('click',()=>setTweak('cursor',x.dataset.v)));
  applyTweaks();

  // host protocol
  const panel = $('#tweaks');
  function openPanel(){ panel.classList.add('open'); }
  function closePanel(){ panel.classList.remove('open'); }
  $('#tw-close').addEventListener('click', ()=>{ closePanel();
    try{ window.parent.postMessage({type:'__edit_mode_dismissed'}, '*'); }catch(e){} });
  window.addEventListener('message', e=>{
    const t = e && e.data && e.data.type;
    if(t==='__activate_edit_mode') openPanel();
    else if(t==='__deactivate_edit_mode') closePanel();
  });
  try{ window.parent.postMessage({type:'__edit_mode_available'}, '*'); }catch(e){}

})();
