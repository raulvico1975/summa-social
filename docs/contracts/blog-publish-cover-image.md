# Contracte extern: OpenClaw -> Blog Summa

Aquest document descriu el contracte real entre **OpenClaw** i **Summa Social** per publicar posts al blog públic.

## 1. Visió general

Summa **no** genera ni el contingut del post ni la imatge de portada. Aquest rol és extern.

**Model actual:**
- **OpenClaw** genera el post, la portada i el text alternatiu de la portada.
- **Summa** valida, desa i publica aquest contingut al blog públic.

Per tant, Summa actua com a **servei de persistència i publicació**, no com a editor ni com a generador creatiu.

## 2. Responsabilitats

### OpenClaw

- Decideix el tema i redacta el contingut
- Genera la imatge de portada
- Construeix el `slug`
- Envia la portada a Summa
- Envia el post final a Summa amb la `coverImageUrl` retornada
- Reintenta només de manera segura i controlada

### Summa

- Valida autenticació Bearer
- Valida format i coherència del payload
- Desa la portada
- Desa el post
- Bloqueja `slug` duplicats
- Revalida `/blog` i `/blog/{slug}` després d'una publicació correcta

## 3. Flux complet punta a punta

1. OpenClaw genera el contingut final del post.
2. OpenClaw genera la portada.
3. OpenClaw crida `POST /api/blog/upload-cover`.
4. Summa retorna `coverImageUrl`, `path` i `storage`.
5. OpenClaw construeix el payload final del post.
6. OpenClaw crida `POST /api/blog/publish`.
7. Summa valida, persisteix i revalida el blog públic.

## 4. Preconditions

- Secret requerit: `BLOG_PUBLISH_SECRET`
- Organització del blog: `BLOG_ORG_ID`
- Auth obligatòria a totes dues rutes:

```http
Authorization: Bearer <BLOG_PUBLISH_SECRET>
```

- `contentHtml` ha d'arribar **ja renderitzat com HTML final**
- `slug` ha de ser URL-safe i estable

> Nota important: del codi actual se'n desprèn que Summa **no converteix Markdown a HTML** ni fa edició del contingut. OpenClaw ha d'entregar `contentHtml` llest per renderitzar.

## 5. Endpoint 1: upload de portada

### Ruta

- `POST /api/blog/upload-cover`

### Body JSON

```json
{
  "slug": "post-de-prova",
  "imageBase64": "iVBORw0KGgoAAA...",
  "mimeType": "image/png"
}
```

### Camps

| Camp | Obligatori | Regla |
|------|------------|-------|
| `slug` | Sí | Només minúscules, números i guions (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) |
| `imageBase64` | Sí | Base64 pur o `data:image/...;base64,...` |
| `mimeType` | Recomanat | Si no arriba separat, es pot deduir des del `data:` URL |

### MIME permesos

- `image/png`
- `image/jpeg`
- `image/jpg`
- `image/webp`
- `image/gif`

### Límit

- mida màxima: **10 MB**

### Resposta OK

```json
{
  "success": true,
  "coverImageUrl": "https://firebasestorage.googleapis.com/...",
  "path": "blog/covers/post-de-prova-12345678.png",
  "storage": "firebase"
}
```

### Semàntica

- En local, si el mode és `local-file`, la imatge es desa a `public/blog-covers/*`
- En entorn real, la imatge es desa a Firebase Storage
- La resposta retorna una URL final que OpenClaw ha de reutilitzar al publish

### Errors esperats

| HTTP | `error` | Significat |
|------|---------|------------|
| `401` | `unauthorized` | Secret absent o incorrecte |
| `400` | `invalid_payload` | Payload invàlid, `slug` incorrecte, base64 invàlid, MIME no admès, mida excedida |
| `503` | `misconfigured_storage` | Configuració prohibida o inconsistent |
| `500` | `internal_error` | Error intern inesperat |

## 6. Endpoint 2: publicació del post

### Ruta

- `POST /api/blog/publish`

### Body JSON

```json
{
  "title": "Post de prova",
  "slug": "post-de-prova",
  "seoTitle": "Post de prova | Summa Social",
  "metaDescription": "Resum curt per SEO",
  "excerpt": "Resum curt visible al llistat",
  "contentHtml": "<p>Contingut HTML del post</p>",
  "tags": ["blog", "producte"],
  "category": "operativa",
  "publishedAt": "2026-03-22T12:00:00.000Z",
  "coverImageUrl": "https://firebasestorage.googleapis.com/...",
  "coverImageAlt": "Portada del post"
}
```

### Camps i regles

| Camp | Obligatori | Regla |
|------|------------|-------|
| `title` | Sí | String no buit |
| `slug` | Sí | URL-safe |
| `seoTitle` | Sí | String no buit |
| `metaDescription` | Sí | String no buit |
| `excerpt` | Sí | String no buit |
| `contentHtml` | Sí | HTML final no buit |
| `tags` | Sí | Array de strings no buits |
| `category` | Sí | String no buit |
| `publishedAt` | Sí | ISO datetime vàlid |
| `coverImageUrl` | No | URL absoluta `http` o `https`, `null` o omès |
| `coverImageAlt` | No | Només vàlid si hi ha `coverImageUrl` |

### Regles importants

- `slug` duplicat queda bloquejat
- `id`, `orgId`, `createdAt` i `updatedAt` **no** s'accepten des del client extern
- `publishedAt` es normalitza a ISO vàlid
- si `coverImageAlt` arriba sense `coverImageUrl`, el payload es rebutja

### Categories

El backend actual **no imposa un enum estricte** per `category`, però la UI del detall del blog té etiquetes específiques per:

- `criteri-operatiu`
- `fiscal`
- `operativa`

Si arriba una categoria diferent, es mostrarà el text cru.

### Resposta OK

```json
{
  "success": true,
  "url": "https://summasocial.app/blog/post-de-prova",
  "orgId": "blog-org"
}
```

### Errors esperats

| HTTP | `error` | Significat |
|------|---------|------------|
| `401` | `unauthorized` | Secret absent o incorrecte |
| `400` | `invalid_payload` | Falten camps, format incorrecte o valors no admesos |
| `409` | `duplicate_slug` | Ja existeix un post amb aquest `slug` |
| `503` | `misconfigured_storage` | Configuració prohibida en l'entorn actual |
| `503` | `write_verification_failed` | Firestore no confirma l'escriptura com esperada |
| `500` | `internal_error` | Error intern inesperat |

## 7. Garanties que dona Summa

- Si el publish retorna `success: true`, Summa ha escrit el post i ha intentat revalidar:
  - `/blog`
  - `/blog/{slug}`
- En mode Firestore, Summa verifica que el document persistit coincideixi amb el payload esperat
- En mode local, Summa escriu el post a un store local JSON per facilitar proves de punta a punta

## 8. Guardrails operatius

### Producció

- `local-file` està **prohibit** en producció
- la portada ha d'anar a Firebase Storage
- la publicació exigeix secret vàlid

### Desenvolupament local

- `npm run dev` prepara `.env.local` amb:
  - `BLOG_PUBLISH_SECRET`
  - `BLOG_PUBLISH_BASE_URL`
  - `BLOG_ORG_ID`
- per defecte, el blog local usa:
  - base URL `http://localhost:9002`
  - org local `local-blog`
- el store local de posts queda a:
  - `tmp/blog-publish-local-store.json`

### Smoke test local

- existeix prova de punta a punta:

```bash
npm run test:blog-publish-local
```

Valida:
- upload de portada
- publish amb portada
- publish sense portada
- persistència local
- coherència de `coverImageUrl` i `coverImageAlt`

## 9. Recomanacions per a OpenClaw

- Generar `slug` estable abans d'upload i reutilitzar exactament el mateix al publish
- Enviar sempre `coverImageAlt` quan hi hagi portada
- No reintentar `publish` cegament si reps `409 duplicate_slug`
- Tractar `upload-cover` i `publish` com a dues operacions separades

> Inferència operativa a partir del codi actual: `upload-cover` no és transaccional amb `publish`. Si OpenClaw puja una portada però després falla el publish, la imatge pot quedar creada sense post associat.

## 10. Què NO fa Summa en aquest flux

- No genera el text del post
- No genera la imatge
- No converteix Markdown a HTML
- No tria el `slug`
- No edita ni revisa el contingut rebut
- No exposa encara cap endpoint d'edició o d'esborrat de posts

## 11. Referències de codi

- API publish: `src/app/api/blog/publish/handler.ts`
- API upload portada: `src/app/api/blog/upload-cover/handler.ts`
- Validació payload post: `src/lib/blog/validateBlogPost.ts`
- Resolució d'org i lectura blog: `src/lib/blog/firestore.ts`
- Store local de desenvolupament: `src/lib/blog/publish-local-store.ts`
- Smoke test local: `scripts/test-blog-publish-local.ts`
