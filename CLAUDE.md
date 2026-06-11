# CLAUDE.md — contexto para sesiones de trabajo

Sitio estático del estudio de tatuajes **Anyeloski** (Talca, Chile).
Sin build, sin npm: HTML + CSS + JS vainilla + Three.js autoalojado.

**Lee primero:** `README.md` → `docs/ARQUITECTURA.md`. Decisiones de UX en
`docs/DECISIONES.md` (respetarlas: nada de rotación automática, seleccionar
no avanza de paso, chips plegados). Verificación 3D en `docs/VERIFICACION.md`.

## Reglas duras

- CSP estricta vía `<meta>`: **todo autoalojado** (nada de CDNs).
- El mapa de zonas vive **duplicado en JS y GLSL** dentro de `body3d.js`
  (`zoneOf`): si tocas uno, toca el otro.
- La malla incrustada `vendor/human.obj.js` debe regenerarse si cambia
  `vendor/human.obj` (`window.__HUMAN_OBJ = JSON.stringify(objText)`).
- Español con tildes en todo el contenido visible y los commits en español.

## Estado / flags

- WhatsApp **de prueba**: `+56957902862` (5 hrefs en Anyeloski.html).
  Cambiar antes del lanzamiento real.
- `window.LAUNCH_ENABLED = false` en app.js (countdown apagado).

## Flujo de trabajo

- Servidor local: `npx serve -l 8765` → `http://localhost:8765/Anyeloski`
  (URLs **sin** extensión: serve corta `.html` y el query al redirigir).
- Deploy: `git push` a `main` ⇒ Vercel despliega solo
  (https://anyeloski.vercel.app). CLI logueada como `mnovoaa`.
- Commits con mensajes multilínea: usar `git commit -F archivo` (las
  comillas dentro de here-strings de PowerShell 5.1 rompen `-m`).
- Verificación del 3D: probes headless (`docs/VERIFICACION.md`);
  los temporales se llaman `__*.html` y están gitignoreados.
