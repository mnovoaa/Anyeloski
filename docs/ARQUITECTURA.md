# Arquitectura

Sitio estático de página única, sin build ni dependencias. Cuatro módulos JS
independientes que se comunican por DOM y eventos.

```
Anyeloski.html
 ├── styles.css          (carga directa)
 ├── app.js              (carga directa; orquesta todo)
 │     └── carga perezosa al acercarse a "El Ritual":
 │           vendor/three.min.js  +  vendor/human.obj.js
 │           └── body3d.js  →  window.__initBody3D(...)
 └── image-slot.js       (editor admin de imágenes, independiente)
```

## Seguridad (CSP)

La página declara una Content-Security-Policy por `<meta>`:

```
default-src 'self'; script-src 'self' 'unsafe-inline'; ... connect-src 'self'
```

Consecuencia de diseño: **todo recurso debe estar autoalojado** — por eso
Three.js vive en `vendor/` y no en un CDN.

## app.js — la página

IIFE única. Responsabilidades:

- Navegación, reveals, carruseles del portfolio y cursor custom.
- **El Ritual** (reserva en 4 pasos): I La Zona · II La Escala · III La Idea ·
  IV El Compromiso. Estado en objeto `ritual` persistido en `localStorage`.
  El resumen final se envía por WhatsApp (`wa.me` con texto prellenado;
  `wa.me` no permite adjuntar imágenes — las fotos de referencia se piden
  dentro del chat).
- Selección de zona: `selectZona(name)` — fuente de verdad compartida entre
  el 3D y la lista de chips. El 3D puede entregar lado ("Pecho izq."); el
  chip se marca por nombre base. **Seleccionar no avanza de paso**: el
  visitante avanza cuando quiere.
- Carga perezosa del 3D vía `IntersectionObserver` (rootMargin 700px).
  Si Three/WebGL/malla fallan (evento `b3dfail`), el visor se oculta y la
  lista de chips se abre como respaldo: la reserva nunca se bloquea.
- Countdown de lanzamiento: desactivado con `window.LAUNCH_ENABLED = false`
  (la lógica queda lista; ver docs/PENDIENTES.md).
- Panel "Tweaks": ajustes visuales en vivo (p. ej. `--accent`) persistidos.

## body3d.js — selector anatómico 3D

`window.__initBody3D(container, onSelect)` → `{ setZone(name) }`.

### Malla

- `vendor/human.obj` — CC0 (OpenGameArt "Low Poly Male Base Mesh"),
  1641 vértices, 1640 quads, sin normales/UVs.
- Va **incrustada** en `vendor/human.obj.js` como `window.__HUMAN_OBJ`
  (string), cargada por `<script>`: así funciona también bajo `file://`
  donde `fetch()` está bloqueado por CORS. El `fetch` directo queda de
  respaldo.
- Parser OBJ mínimo propio: vértices + triangulación fan de quads →
  `BufferGeometry` + `computeVertexNormals()` (sombreado suave).
- Normalización: altura 4.55, suelo y=−1.80, frente a +Z.
- Deformaciones procedurales al cargar:
  - cuello alargado: `y += .12 · smoothstep(2.00, 2.50, y)`
  - brazos de T-pose a pose relajada: rotación de ~64° (ANG −1.12 rad)
    alrededor del pivote del hombro (.62, 1.89) con mezcla suave en la axila.

### Estética

ShaderMaterial holográfico: fresnel cian en contornos
(`pow(1−|n·v|, 2.6)`), scanlines animadas, AdditiveBlending, DoubleSide,
sin depthWrite. El color se lee en vivo de la variable CSS `--accent`.

### Mapa de zonas (el corazón del sistema)

Las zonas **no son piezas separadas**: cada punto se clasifica por región
anatómica con una función `zoneOf(p, n)` que vive **duplicada y sincronizada
en JS (raycast del clic/hover) y en GLSL (iluminar la región en el shader)**.
Si se toca una, hay que tocar la otra.

- 30 regiones base; las pares llevan lado: `id = base + 100 (izq, x>0)
  ó + 200 (der)` → 58 zonas efectivas.
- Cadena del brazo por **distancia al eje del brazo** (cuelga en diagonal):
  hombro → brazo → codo → antebrazo → muñeca → mano (parámetro s sobre el eje).
- El resto por bandas de altura + frente/espalda + franja lateral.
- Las divisiones frontal/posterior de **piernas** y la **clavícula** usan la
  **normal de la superficie golpeada** (`hit.face.normal` / varying `vNo`),
  no la posición z: es inmune a roces tangenciales en la silueta.
- Un id sin lado (elegido desde la lista de chips) ilumina ambos lados.
- Umbrales calibrados contra la geometría real de la malla (ver
  docs/VERIFICACION.md).

### Interacción

- Arrastre horizontal: rotación 360° en Y.
- Arrastre vertical: **paneo** cabeza↔pies; el rango crece con el zoom y se
  anula cuando el cuerpo completo cabe en pantalla (límites: suelo/coronilla).
- Zoom: rueda, pellizco (2 dedos) y botones ± — `CAM = {min 5.4, max 12.0,
  def 8.7}`, animado con lerp.
- Táctil: `touch-action` dinámico — sin zoom, el gesto vertical es scroll de
  página; con zoom, navega el modelo.
- Hover: glow de región + etiqueta flotante con el nombre (`.b3d-tip`).
- Clic (si el puntero se movió <7px): selecciona y llama `onSelect(nombre)`.
- Botones Frente/Espalda animan la rotación (camino corto); el activo se
  enciende. Etiqueta viva Frente/Perfil/Espalda.
- **Sin rotación automática, sin avance de paso al seleccionar** (decisión
  de UX deliberada).
- Render pausado fuera del viewport (`IntersectionObserver`);
  `ResizeObserver` para el tamaño.
- `pick()` llama `group.updateWorldMatrix(true, true)` antes del raycast:
  `worldToLocal` solo actualiza el grupo (no los hijos) y sin un frame de
  por medio el raycast usaría la matriz vieja del mesh.
- Hook de depuración: con `window.__B3D_DEBUG = true`, cada pick guarda
  `window.__B3D_LAST = {p, n, ry}`.

## image-slot.js — editor admin

Herramienta local para reemplazar imágenes del sitio sin tocar código
(estado en `.image-slots.state.json`). No es parte de la experiencia del
visitante. Limitado bajo `file://`.

## Deploy

- GitHub `mnovoaa/Anyeloski` (rama `main`) conectado al proyecto Vercel
  `anyeloski`: **cada push despliega**.
- `vercel.json`: `cleanUrls: true` + rewrite `/` → `/Anyeloski`.
- `.vercelignore` / `.gitignore`: fuera quedan `screenshots/`, `uploads/`,
  `.claude/`, archivos temporales `__*.html`.
