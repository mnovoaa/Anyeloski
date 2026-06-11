# ANYELOSKI — Portfolio y reservas de estudio de tatuajes

Sitio web del estudio de tatuajes **Anyeloski** (Miguel Muñoz · Talca, Chile).
Portfolio de obra, presentación del artista y del estudio, y un flujo de
cotización/reserva ("El Ritual") cuya pieza central es un **selector
anatómico 3D holográfico** con 58 zonas corporales de precisión profesional.

**Producción:** https://anyeloski.vercel.app
**Repositorio:** https://github.com/mnovoaa/Anyeloski

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS + JavaScript vainilla (sin frameworks, sin build) |
| 3D | Three.js r149 (UMD, autoalojado en `vendor/`) |
| Malla humana | "Low Poly Male Base Mesh" — CC0 dominio público (OpenGameArt) |
| Hosting | Vercel (sitio estático, auto-deploy desde GitHub `main`) |
| Contacto | WhatsApp vía enlaces `wa.me` (sin backend) |

No hay dependencias de npm, bundler ni servidor: es un sitio 100 % estático.

## Estructura

```
Anyeloski.html        Página única (todas las secciones)
styles.css            Todos los estilos (tema oscuro + acento cian)
app.js                Lógica de la página: navegación, carruseles,
                      flujo "El Ritual", countdown, panel Tweaks
body3d.js             Selector anatómico 3D (holograma + mapa de zonas)
image-slot.js         Editor local de slots de imagen (herramienta admin)
.image-slots.state.json  Estado guardado de los slots de imagen
vendor/
  three.min.js        Three.js r149 autoalojado (la CSP no permite CDNs)
  human.obj           Malla humana CC0 (1641 vértices, quads)
  human.obj.js        La misma malla incrustada como JS (funciona en file://)
images/               Obra del portfolio y fotos del taller
media/autor.mp4       Video de presentación del artista
vercel.json           cleanUrls + rewrite de / → /Anyeloski
docs/                 Documentación del proyecto (ver abajo)
```

## Desarrollo local

No hay build. Dos formas de abrir el sitio:

```bash
# recomendada: servidor local (igual a producción)
npx serve -l 8765
# → http://localhost:8765/Anyeloski

# alternativa: doble clic en Anyeloski.html (file://)
# funciona porque la malla 3D va incrustada en vendor/human.obj.js;
# el editor de slots de imagen tiene limitaciones bajo file://
```

> Nota sobre `serve`: al redirigir quita la extensión `.html` **y el query
> string**. Usa siempre URLs sin extensión (`/Anyeloski`, no `/Anyeloski.html`).

## Deploy

Cada `git push` a `main` despliega automáticamente en Vercel (repo conectado
al proyecto `anyeloski`). También se puede forzar manualmente:

```bash
vercel --prod --yes
```

`.vercelignore` excluye los artefactos locales (screenshots, uploads, docs
de trabajo) del deploy.

## Documentación

| Documento | Contenido |
|---|---|
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Cómo está construido: módulos, CSP, selector 3D en profundidad, mapa de zonas, shader |
| [docs/DECISIONES.md](docs/DECISIONES.md) | Decisiones de diseño y UX, con su porqué |
| [docs/PENDIENTES.md](docs/PENDIENTES.md) | Checklist previa al lanzamiento real |
| [docs/VERIFICACION.md](docs/VERIFICACION.md) | Técnica de verificación headless del selector 3D |

## ⚠️ Antes del lanzamiento real

1. El número de WhatsApp actual es **de prueba** (+56 9 5790 2862, en 5 enlaces).
2. El countdown de lanzamiento está desactivado (`window.LAUNCH_ENABLED = false` en `app.js`).

Detalle completo en [docs/PENDIENTES.md](docs/PENDIENTES.md).
