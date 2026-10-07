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

`pnpm build` ya elimina `404.html`, de modo que Pages sirve la app en cualquier ruta (modo SPA). `public/_headers` añade `noindex` a todo el sitio.

## 2. Cerrar el acceso (recomendado)

Cloudflare **Zero Trust → Access → Applications → Add an application → Self-hosted**:

- *Application domain*: el dominio `*.pages.dev` del proyecto (y, si se quiere, también las URL de vista previa).
- *Policy*: **Allow**, regla *Emails* con las direcciones del equipo (o *Emails ending in* `@inviable.is` si aplica).
- *Login method*: **One-time PIN** (código por email; no hace falta otra cuenta).

Desde el panel del proyecto de Pages también se puede activar con **Settings → General → Access policy → Enable**.

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
