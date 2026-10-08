# Connected Action · Lab

Versión experimental y autónoma de la **Connected Action** de FARCLIMATE, con la capa de datos de la Misión de Adaptación de la UE. Sirve para desarrollar y validar con el equipo las mejoras acordadas tras la reunión con el Secretariado de la Misión (6-oct-2026) **sin tocar la versión estable** del Transformation Hub.

- Origen: extraída de [`isInviable/farclimate_hub`](https://github.com/isInviable/farclimate_hub), `apps/web`, commit `e75dbae` (6-oct-2026). Solo las vistas `/connected/*`, sus componentes y su lógica.
- **Sitio 100 % estático**: sin servidor ni Supabase. Los datos se leen de `public/data/*.json`.
- Una vez validada, las mejoras se integran en `farclimate_hub` (componentes nuevos + tablas de la migración `sql/`).
- Estado, hoja de ruta y decisiones: doc vivo *Connected Action v2 · Hoja de ruta y estado* (https://claude.ai/code/artifact/17a165c0-fab4-47f9-8683-441f7f285f4d). Guías de validación y de revisión del Catálogo: doc *Connected Action v2 · Materiales de trabajo con la Misión*.

## Datos

`public/data/*.json` se genera con `pnpm data` (`scripts/build_data.py`) a partir de `data-src/`:

| Carpeta | Contenido | Origen |
| --- | --- | --- |
| `data-src/cordis/` | Proyectos, entidades, relaciones, riesgos, temas y productos (65 proyectos, 1.196 entidades, 1.632 relaciones) | Pipeline CORDIS de `farclimate_hub` (`pnpm cordis:download && pnpm cordis:parse`), ejecutado el 7-oct-2026: las mismas tablas que se cargan en Supabase |
| `data-src/mission/` | Tipo de proyecto (RIA/IA/CSA/Cascade), topic, agregados territoriales; 617 territorios y 869 relaciones proyecto–territorio (una fila duplicada del anexo excluida) | Barómetro de la Misión, 6.ª actualización (apéndices 4 y 5), limpiado por Inviable; ver el registro de correcciones en la carpeta del proyecto |
| `data-src/mission/catalogue_names_reviewed.csv` | Nombres del Catálogo de proyectos 2026 confirmados en la revisión manual (vacío hasta que se revise) | `30_trabajo/Connected_Action_v2/scripts/apply_catalogue_review.py` |
| `data-src/mission/EEA_…csv` | Firmantes de la Charter con código NUTS (309) | Servicio REST del EEA Adaptation Dashboard |

## Desarrollo

```bash
pnpm install
pnpm data        # regenera public/data/*.json
pnpm dev         # http://localhost:3000
pnpm build       # sitio estático en .output/public
```

Node ≥ 22.12 y pnpm 10.

## Despliegue (Cloudflare Pages)

Sitio estático: directorio de salida `.output/public`, comando `pnpm install --frozen-lockfile && pnpm build` (el build elimina `404.html` para que Pages sirva la app en cualquier ruta). Acceso abierto pero fuera de buscadores (`robots.txt`, `X-Robots-Tag` y meta `noindex`). Detalle en `docs/despliegue.md`.

## Cambios respecto al original

Ver `docs/cambios.md`.
