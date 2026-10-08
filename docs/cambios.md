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
| En la vista UMAP las burbujas quedan debajo del panel de leyenda (a la derecha) y de la leyenda de tamaño (abajo a la izquierda) | El área del gráfico termina donde empieza el panel (`md:right-[312px]`); la leyenda de tamaño pasa dentro del panel; el margen horizontal del layout se limita al 20 % del ancho | `app/pages/connected/ProjectsUmapNew.vue`, `app/components/connected/beta/umapProjectsNew.vue` |
| Nombres de CORDIS con comillas escapadas dos veces (`"NCSR ""D"""`, Riga Energy Agency) | `org_name()` en el script de datos quita la capa de escape sobrante | `scripts/build_data.py` (en el Hub, en la carga a Supabase) |
| La vista UMAP colapsa todos los proyectos en la esquina superior izquierda cuando los datos llegan de golpe: el layout se calcula en `onMounted`, antes de que `useElementSize` conozca el tamaño (0×0). En producción no se ve porque los datos llegan en varias tandas y el `watch` de `projects` lo recalcula | Recalcular el layout (determinista, con semilla) cuando el contenedor tiene tamaño y cada vez que cambia | `app/components/connected/beta/umapProjectsNew.vue` |

## Capa de la Misión

| Cambio | Archivos | ¿Vuelve al Hub? |
| --- | --- | --- |
| Tipología de la Misión (RIA, IA, Cascade, CSA) con etiqueta corta y color propio | `app/utils/missionTypes.ts`, `app/types/mission.ts` | Sí |
| Dashboard: gráfico "Projects by Mission type" que filtra todo el panel como país, tema, riesgo o año; textos de ayuda para el nuevo filtro | `app/pages/connected/dashboard.vue` | Sí |
| Dashboard: fechas de corte por fuente visibles en la tarjeta de filtros | `app/pages/connected/dashboard.vue` | Sí |
| UMAP: color por tipo (activable), leyenda con recuento y resaltado por tipo; el tipo aparece en el tooltip | `app/pages/connected/ProjectsUmapNew.vue`, `app/components/connected/beta/umapProjectsNew.vue` | Sí |
| Vista nueva "Territories" (05): mapa NUTS-3 de dónde actúan los proyectos (anexo 5), dónde tienen sede sus socios (CORDIS) y contraste; filtro por tipo; MIP4Adapt opcional; autoridades nacionales y NUTS-1 fuera por defecto; contorno de firmantes de la Charter (EEA); ficha por proyecto (actúa en / sedes / ambos) y por región; firmantes sin ningún proyecto de la Misión; territorios fuera del mapa | `app/pages/connected/territories.vue`, `app/components/mission/MissionTerritoryMap.vue`, `app/composables/useMissionTerritories.ts`, `app/assets/geo/NUTS_RG_60M_2021_4326_LEVL_3_UK.json` | Sí |
| Ficha de proyecto: bloque "EU Mission" con tipo, ciclo de vida, regiones, firmantes, demostradores, replicadores y topic | `app/components/connected/ui/CaProjectDetailModal.vue` | Sí |
| Portada y navegación: quinta vista | `app/pages/connected/index.vue`, `app/components/connected/connectedNav.ts`, `i18n/locales/*.json` | Sí |

## Auditoría de Beatriz (8-oct-2026)

| Cambio | Archivos | ¿Vuelve al Hub? |
| --- | --- | --- |
| Datos: la fila "Arousa" (ES114) de FARCLIMATE se excluye por duplicar "Pontevedra: Ría de Pontevedra, Ría de Arousa" (Catálogo 2026, p. 48 lista 23 regiones). Queda en el registro con categoría `duplicado`; territorios 618 → 617, relaciones 870 → 869 | `data-src/mission/*.csv` (generados en `30_trabajo/Connected_Action_v2/scripts/clean_annex5.py`) | Sí, con la carga de datos |
| Cobertura visible: Territories y Dashboard dicen que el anexo 5 trae regiones para 63 de 65 proyectos y nombran los dos sin regiones | `app/pages/connected/territories.vue`, `app/pages/connected/dashboard.vue` | Sí |
| Nota por proyecto sin regiones (`territory_note`): AdaptationHubs, escala nacional (27 hubs, 54 hermanamientos); REGILIENCE+, materiales para actores regionales y nacionales | `scripts/build_data.py`, `app/types/mission.ts`, `CaProjectDetailModal.vue`, `territories.vue` | Sí (campo nuevo en `project_mission_attributes`) |
| MIP4Adapt identificado como contrato de servicio, no proyecto Horizon | `app/pages/connected/territories.vue` | Sí |
| Nombre del Catálogo de proyectos 2026 junto al del anexo 5 cuando la revisión manual lo confirma (`catalogue_name`, opcional; se lee de `data-src/mission/catalogue_names_reviewed.csv`, vacío hasta que se haga la revisión) | `scripts/build_data.py`, `app/types/mission.ts`, `app/pages/connected/territories.vue` | Sí, tras la revisión |
| Territories: colores del mapa separados de los del tipo de proyecto. Antes el mapa reutilizaba los cuatro colores de tipo (azul IA para «dónde actúan», naranja Cascade para «sedes», verde azulado RIA para «ambos», marrón CSA para «firmantes sin proyecto»). Ahora: violeta (escala) para dónde actúan, gris tinta (escala) para sedes de socios, y en contraste y ficha de proyecto relleno violeta = actúa, rayado = sede, ambos = violeta rayado. Firmantes con contorno discontinuo. Cifras en tinta con muestra al lado; el tipo se muestra siempre con su código en listas y filtros; la leyenda nombra el filtro de tipo activo y avisa de que el color del mapa no es el tipo | `app/pages/connected/territories.vue`, `app/components/mission/MissionTerritoryMap.vue` | Sí |

## Prioridades del 8-oct (doc Recursos, §5)

| Cambio | Archivos | ¿Vuelve al Hub? |
| --- | --- | --- |
| Vista nueva «Research ↔ Demonstration» (06): matriz RIA × IA de organizaciones compartidas (CORDIS) y de NUTS-3 compartidas (anexo 5, solo autoridades regionales y locales); organizaciones puente; proyectos de investigación sin vínculo | `app/pages/connected/links.vue`, `connectedNav.ts`, `pages/connected/index.vue`, `i18n` | Sí |
| Territories: filtro por papel del territorio (demostrador / replicador) en mapa, fichas y listas | `app/pages/connected/territories.vue`, `app/composables/useMissionTerritories.ts` | Sí |
| Territories: indicadores al estilo del Barómetro (autoridades por proyecto, autoridades en varios proyectos, firmantes por tipo y por papel) y lista de autoridades con proyecto que no son firmantes | `app/pages/connected/territories.vue` | Sí |
| Cadencia de actualización prevista por fuente en el pie | `scripts/build_data.py`, `SiteFooter.vue`, `app/types/mission.ts` | Sí |

## Territories v2 (8-oct-2026, doc "Territories (Lab v2): diagnóstico y alternativas")

| Cambio | Archivos | ¿Vuelve al Hub? |
| --- | --- | --- |
| Catálogo único de entidades: une autoridades del anexo 5, firmantes EEA y socios CORDIS (cruce por país, territorio y nombre normalizado) y clasifica su naturaleza (autoridad local/regional/nacional, otro organismo público, universidad, centro de investigación, empresa, ONG, otra). Cruces de confianza alta aplicados; el resto, en revisión manual | `scripts/entity_catalogue.py`, `public/data/actors.json`, `data-src/mission/entity_candidates.csv`, `entity_nature_auto.csv` | Sí, como tabla nueva en Supabase |
| Libro de revisión del catálogo y lectura de las decisiones | `scripts/entity_review_workbook.py`, `scripts/apply_entity_review.py` (→ `entity_review.csv`, `entity_nature_review.csv`) | Pipeline |
| Vista Territories reescrita desde el territorio: mapa por perfil (proyectos actúan directamente / socios locales / firmantes, contorno discontinuo), selector NUTS-3 / NUTS-2, buscador de territorios y entidades, ficha con proyectos aquí y "desde arriba", firmantes con su rol y entidades que participan aquí o en otros territorios, tabla de entidades con filtros de rol y naturaleza. Se retiran los modos "dónde actúan / sedes / contraste", la selección de proyecto y las listas de huecos de firmantes y de no firmantes (ahora son filtros de la tabla) | `app/pages/connected/territories.vue`, `app/composables/useTerritoryProfiles.ts`, `app/components/mission/MissionAnnexCards.vue` | Sí, tras validar |
| Contornos NUTS-2 por disolución de las NUTS-3 del Lab | `scripts/build_nuts2.py`, `app/assets/geo/NUTS2_from_NUTS3.json` | Sí |
| `pnpm run data` ejecuta también `entity_catalogue.py` | `package.json` | Sí |
| Revisión aplicada (8-oct): decisiones de `Revision_Catalogo_Entidades_v2_revisado.xlsx` en `entity_review.csv` y `entity_nature_review.csv`; el cruce automático ya no une solo un nombre de ciudad con uno de región (p. ej. Žilina Region ≠ Mesto Žilina) | `scripts/entity_catalogue.py`, `data-src/mission/entity_*review.csv`, `public/data/actors.json` | Sí |
| Revisión asistida por agentes: libro v2 con la propuesta de un agente con búsqueda web por pareja y por tipo de entidad, separado en dudas y resueltos; el script de aplicación lee los libros v1 y v2 | `scripts/entity_agent_workbook.py`, `scripts/apply_entity_review.py` | Pipeline |
