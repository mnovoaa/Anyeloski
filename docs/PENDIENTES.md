# Pendientes y checklist de lanzamiento

## 🔴 Obligatorio antes del lanzamiento real

- [ ] **Cambiar el número de WhatsApp.** El actual es de prueba:
  `+56 9 5790 2862`, presente en **5 enlaces** `wa.me` de
  `Anyeloski.html`. Buscar `56957902862` y reemplazar por el número real
  del estudio.
- [ ] **Activar el countdown de lanzamiento** si se quiere usar:
  en `app.js`, `window.LAUNCH_ENABLED = false` → `true`, y revisar la
  fecha objetivo configurada junto a esa bandera.
- [ ] Revisión final de textos (ortografía, datos del estudio, dirección).

## 🟡 Recomendado (rendimiento / SEO)

- [ ] Comprimir `media/autor.mp4` (4.8 MB) — H.264/H.265 a ~1–2 MB.
- [ ] Convertir los JPG de `images/` a WebP (las fotos del taller ya lo son).
- [ ] Recortar la carga de Google Fonts a los pesos realmente usados.
- [ ] Añadir metadatos Open Graph / Twitter Card (título, descripción,
  imagen) para compartir en redes.
- [ ] Favicon definitivo.

## 🟢 Ideas futuras (no comprometidas)

- [ ] Dominio propio en vez de `anyeloski.vercel.app`.
- [ ] Analytics ligero (p. ej. Vercel Analytics) si se quiere medir tráfico.
- [ ] Galería filtrable por estilo en el Archivo.

## Cómo desplegar cambios

```bash
git add -A
git commit -m "..."
git push          # Vercel despliega automáticamente
```
