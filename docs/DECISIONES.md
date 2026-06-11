# Decisiones de diseño y UX

Registro de las decisiones importantes y su porqué, en orden temático.

## Identidad visual

- **Tema oscuro + acento cian (`--accent: #00e5ff`)**, tipografía display
  serif + sans. Estética: holograma futurista / interfaz médica premium /
  cyberpunk elegante.
- El acento es una variable CSS editable en vivo desde el panel Tweaks;
  el 3D la lee en cada repintado (no hay colores duros en el visor).

## Selector anatómico 3D

- **Malla humana real (CC0) en vez de geometría procedural.** Se probaron
  dos versiones procedurales (silueta low-poly facetada y holograma sobre
  primitivas); ambas se descartaron por verse "de placeholder". La malla
  esculpida con sombreado suave + tratamiento holográfico dio el nivel
  buscado.
- **Sin botones de zona visibles al inicio.** El cuerpo es la interfaz:
  "Selecciona directamente sobre el cuerpo". La lista de chips existe pero
  plegada tras "¿Prefieres elegir de una lista?" — y se abre sola como
  respaldo si el 3D falla.
- **Sin rotación automática.** El modelo solo se mueve cuando el usuario
  lo mueve.
- **Seleccionar no avanza de paso.** Evita la sensación de ser empujado;
  el botón Continuar es del visitante.
- **Segmentación profesional de cotización, no anatomía médica**
  (spec en el histórico como "TattooBodySelector"): zonas que un tatuador
  cotiza — esternón, clavícula, costillas vs costado, espalda en 3 bandas,
  codo y muñeca separados, muslo frontal/posterior, espinilla/pantorrilla,
  empeine/planta… 30 regiones base, 58 con lado izq./der.
- **Lado anatómico, no del espectador**: "izq." es la izquierda del modelo
  (x>0). Elegir desde la lista (sin lado) ilumina ambos lados.
- **El trapecio cotiza como Hombro** (así lo piensa el gremio) y la
  clavícula exige cara frontal para no colarse desde la espalda.
- **Paneo vertical ligado al zoom**: sin zoom no hay paneo (no hace falta);
  con zoom el arrastre vertical recorre el cuerpo con límites en suelo y
  coronilla. En táctil el `touch-action` cambia dinámicamente para no
  robarle el scroll a la página.
- **Container del visor transparente** (sin borde ni caja): solo un halo
  radial cian sutil. El holograma flota en la página.

## Flujo de reserva "El Ritual"

- 4 pasos con nombres rituales (La Zona, La Escala, La Idea, El Compromiso)
  — coherentes con la voz del sitio.
- **Envío por WhatsApp con `wa.me`**: sin backend, cero mantenimiento.
  Limitación conocida: `wa.me` no adjunta imágenes → las referencias
  visuales se piden dentro de la conversación (el mensaje generado lo
  anuncia).
- Estado persistido en `localStorage`: recargar no pierde la reserva.
- Si WebGL no está disponible, la lista de chips garantiza que la reserva
  siempre se puede completar.

## Rendimiento

- Three.js y la malla cargan **perezosamente** solo cuando el visitante se
  acerca a la sección de reserva (rootMargin 700px).
- El render 3D se pausa fuera del viewport.
- Malla incrustada como JS (86 KB) → funciona en `file://` y evita un
  roundtrip extra.

## Infraestructura

- **Sitio estático puro** (sin build): mantenimiento mínimo, hosting
  gratuito, sin superficie de ataque de servidor.
- CSP estricta vía meta: todo autoalojado, sin CDNs.
- Vercel + GitHub con auto-deploy: publicar = `git push`.
- `cleanUrls` + rewrite para que la raíz sirva `/Anyeloski` sin extensión.

## Lanzamiento

- Countdown de lanzamiento implementado pero **desactivado**
  (`window.LAUNCH_ENABLED = false`) hasta la fecha real.
- Número de WhatsApp **de prueba** durante el desarrollo
  (ver docs/PENDIENTES.md).
