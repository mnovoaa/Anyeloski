# Verificación headless del selector 3D

Técnica usada para calibrar y verificar el mapa anatómico sin abrir el
navegador a mano. Útil para regresiones si el mapa o la malla cambian.

## Principios

- Servidor local: `npx serve -l 8765`. **URLs sin extensión** (`serve`
  quita `.html` y el query string al redirigir).
- Chrome headless con `--screenshot` dispara al terminar la carga; para
  controlar el momento con `--timeout=N` se añade a la página un recurso
  que nunca carga: `<img src="http://10.255.255.1/never">` (IP no ruteable
  mantiene la carga pendiente).
- Para volcar texto (no imagen): `--dump-dom` + `--virtual-time-budget=N`
  (avanza los timers en tiempo virtual).

## Página de sondeo (probe)

Página temporal `__probe.html` (los `__*.html` están en .gitignore) que:

1. Carga `vendor/three.min.js`, `vendor/human.obj.js` y `body3d.js`,
   e inicializa `__initBody3D` en un contenedor de 600×760.
2. Recorre un **grid de taps sintéticos** (PointerEvent pointerdown+up)
   sobre el canvas y registra la zona que respondió cada celda en un `<pre>`.
3. Gira con un **arrastre síncrono** (pointerdown → pointermove ±px →
   pointerup; 285.6 px = 180°) para sondear frente, espalda y perfil.

```
chrome --headless=new --disable-gpu --virtual-time-budget=10000 \
  --timeout=14000 --dump-dom http://localhost:8765/__probe
```

El volcado es un mapa pantalla→zona que delata umbrales mal puestos
(mucho más fiable que apuntar taps a ciegas).

## Trampas conocidas (aprendidas a golpes)

- **Giro y taps en el mismo timeout = matrices viejas.** El raycast usa
  `matrixWorld`, que solo se refresca en el frame; bajo tiempo virtual
  puede no correr ningún frame entre giro y tap. Mitigado en producto
  (`pick()` fuerza `updateWorldMatrix`) pero en probes conviene separar
  giro y grid en timeouts distintos.
- **`worldToLocal` actualiza el grupo pero no los hijos** (three r149):
  causaba puntos "imposibles" (raycast con matriz vieja del mesh +
  conversión con matriz nueva del grupo).
- Los taps cerca de la **silueta rozan superficies laterales** con normal
  ambigua: por eso las divisiones frontal/posterior usan la normal de la
  cara golpeada, no la posición z.
- Calibrar umbrales **midiendo la malla con node** (parsear el OBJ,
  aplicar las mismas transformaciones de body3d.js y volcar rangos x/z
  por banda de altura) en vez de adivinar.

## Captura visual de la página real

Wrapper temporal `__shot.html`: iframe a `/Anyeloski#ritual`, scroll del
visor al centro, y acciones por query string:

```
http://localhost:8765/__shot?a=zoom:in:2,pan:200,spin:120,tap:0.5:0.3
```

```
chrome --headless=new --window-size=1280,900 --timeout=9000 \
  --screenshot=out.png "http://localhost:8765/__shot?a=zoom:in:2,pan:200"
```

(390×844 para móvil.)

## Hook de depuración en producto

`window.__B3D_DEBUG = true` hace que cada pick guarde
`window.__B3D_LAST = {p, n, ry}` (punto local, normal de la cara y
rotación) — clave para diagnosticar clasificaciones erróneas.
