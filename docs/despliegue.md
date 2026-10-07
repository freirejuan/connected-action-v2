# Despliegue en Cloudflare Pages

El Lab es un sitio estático: no necesita servidor, base de datos ni variables de entorno.

## 1. Crear el proyecto (una vez)

1. Cloudflare → **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**.
2. Autorizar GitHub para la cuenta `freirejuan` (basta con dar acceso a este repositorio) y elegir `connected-action-v2`.
3. Configuración de compilación:

| Campo | Valor |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Build command | `pnpm install --frozen-lockfile && pnpm build` |
| Build output directory | `.output/public` |
| Variable de entorno | `NODE_VERSION` = `22` |

4. **Save and Deploy**. La URL queda en `https://<nombre-del-proyecto>.pages.dev`.
5. En **Settings → Builds → Branch control**, dejar *Preview branches* en **None** si no se quieren despliegues de otras ramas.

`wrangler.toml` fija la carpeta de salida (`.output/public`) aunque el panel diga otra cosa; el comando de compilación sí hay que ponerlo en el panel. `pnpm build` ya elimina `404.html`, de modo que Pages sirve la app en cualquier ruta (modo SPA). `public/_headers` añade `noindex` a todo el sitio.

## 2. Acceso abierto pero discreto

El sitio es público para quien tenga el enlace, pero no se anuncia a buscadores:

- `public/robots.txt` pide a todos los rastreadores que no recorran el sitio (`Disallow: /`).
- `public/_headers` envía `X-Robots-Tag: noindex, nofollow` en todas las respuestas, y cada página lleva además `<meta name="robots" content="noindex, nofollow">`.
- En **Settings → Builds → Branch control**, *Preview branches* en **None**: así no aparecen URL de vista previa adicionales.

Lo que esto no cubre: cualquiera con el enlace puede abrirlo y descargar los datos (`/data/*.json`, que son públicos en CORDIS y en el Portal de la Misión). Para que el enlace no acabe en un buscador basta con no publicarlo en páginas abiertas; compartirlo por correo o en canales internos no lo expone.

Si más adelante hace falta cerrarlo, Cloudflare Pages → **Settings → General → Access policy → Enable** lo protege con código por email sin tocar el código.

## 3. Actualizar

Cada `git push` a `main` vuelve a compilar y publicar. Para regenerar los datos:

```bash
pnpm data          # reconstruye public/data/*.json desde data-src/
git commit -am "Refresh data" && git push
```

Para refrescar CORDIS: en `farclimate_hub`, `pnpm cordis:download --refresh && pnpm cordis:parse`, y copiar `packages/cordis/data/csv/*.csv` a `data-src/cordis/`.
Para una nueva edición del Barómetro: repetir la limpieza del anexo 5 (scripts en la carpeta del proyecto, `30_trabajo/Connected_Action_v2/scripts/`) y copiar los CSV resultantes a `data-src/mission/`.

## Alternativa sin conectar GitHub

```bash
pnpm install && pnpm build
npx wrangler login
npx wrangler pages deploy .output/public --project-name connected-action-lab
```

## Si la URL devuelve 404

Si `/robots.txt` o `/data/meta.json` responden pero la portada da 404, Cloudflare está publicando la carpeta `public/` del repositorio sin compilar. En **Settings → Builds → Build configuration** comprobar que *Build command* es `pnpm install --frozen-lockfile && pnpm build` y volver a desplegar (**Deployments → … → Retry deployment**).
