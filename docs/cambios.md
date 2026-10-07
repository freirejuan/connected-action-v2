# Cambios respecto a farclimate_hub (apps/web, commit e75dbae)

Registro para la integración posterior. Cada cambio indica si debe volver al Hub.

## Extracción (base)

| Cambio | Archivos | ¿Vuelve al Hub? |
| --- | --- | --- |
| Solo vistas `/connected/*`; fuera explorer, stories, skills, admin, servidor, Nuxt Content, IA | todo el árbol | No (es la extracción) |
| Capa de datos estática: `cordisRepository` lee `/data/*.json` con las mismas funciones y la misma forma de salida que las consultas a Supabase | `app/utils/cordisRepository.ts` | No: en el Hub sigue Supabase |
| Totales de la portada calculados con el repositorio en vez de consultas `count` directas a Supabase | `app/pages/connected/index.vue` | Opcional |
| Cabecera y pie propios del Lab (aviso "Experimental", enlace a la versión estable, fuentes y fechas de corte) | `app/components/global/SiteHeader.vue`, `SiteFooter.vue` | El pie con fechas de corte, sí |
| `noindex` en todas las páginas | `app/app.vue` | No |

## Correcciones de errores que también afectan al Hub

| Error | Corrección | Archivo |
| --- | --- | --- |
| La vista UMAP colapsa todos los proyectos en la esquina superior izquierda cuando los datos llegan de golpe: el layout se calcula en `onMounted`, antes de que `useElementSize` conozca el tamaño (0×0). En producción no se ve porque los datos llegan en varias tandas y el `watch` de `projects` lo recalcula | Recalcular el layout (determinista, con semilla) cuando el contenedor tiene tamaño y cada vez que cambia | `app/components/connected/beta/umapProjectsNew.vue` |

## Capa de la Misión

| Cambio | Archivos | ¿Vuelve al Hub? |
| --- | --- | --- |
| Tipología de la Misión (RIA, IA, Cascade, CSA) con etiqueta corta y color propio | `app/utils/missionTypes.ts`, `app/types/mission.ts` | Sí |
| Dashboard: gráfico "Projects by Mission type" que filtra todo el panel como país, tema, riesgo o año; textos de ayuda para el nuevo filtro | `app/pages/connected/dashboard.vue` | Sí |
| Dashboard: fechas de corte por fuente visibles en la tarjeta de filtros | `app/pages/connected/dashboard.vue` | Sí |
| UMAP: color por tipo (activable), leyenda con recuento y resaltado por tipo; el tipo aparece en el tooltip | `app/pages/connected/ProjectsUmapNew.vue`, `app/components/connected/beta/umapProjectsNew.vue` | Sí |
