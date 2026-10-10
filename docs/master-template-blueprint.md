# Master Template Blueprint — Tool Landing

Plantilla maestra reutilizable para landings de **herramienta online** (producto en el navegador).
No es un brief de un producto concreto: define estructura, secciones, sistema visual y reglas de
composición. Al instanciar, sustituye los placeholders (`{{BRAND}}`, `{{TOOL}}`, etc.).

---

## Superficies del template

| Superficie | Ruta patrón | Rol | En este proyecto |
|------------|-------------|-----|------------------|
| **Home** | `/` | Producto primero: hero + `{{TOOL}}` + SEO editorial | `src/app/page.tsx` |
| **Landing SEO** | `/demo` | Intención: H1 + mismo `{{TOOL}}` + copy + FAQ + related | `src/app/demo/page.tsx` |
| **Shell** | Layout global | Header sticky + Footer (SEO hub + legal) | `src/app/layout.tsx` |

Una sola composición en el primer viewport. El tool es el ancla; el resto es soporte.

---

## Dirección visual (contrato)

**Estilo:** minimal / monochrome / editorial limpio.

| Knob | Valor implementado |
|------|--------------------|
| Craft | Alto — cada pixel deliberado |
| Motion | Bajo — hover, transición de progreso |
| Density | Baja — `py-24 md:py-32` |
| Color | Blanco/negro/grises (`--color-ink`, `--color-paper`, `--color-muted`, `--color-hairline`). Modo oscuro con los mismos tokens bajo `html.dark` + toggle |
| Borders | Hairline (`border-hairline`), sin sombras |
| Radius | Nulo (no se usan clases `rounded-*`) |
| Tipografía | `Space Grotesk` (display/labels) + `Inter` (cuerpo); labels `uppercase` + `tracking-label` (0.22em) |

### Contenedores

| Zona | Max width | Componente |
|------|-----------|------------|
| Header / Footer | `max-w-5xl` | `Container size="wide"` |
| Editorial (FAQ, features, steps) | `max-w-3xl` | `Container size="editorial"` |
| Tool (home) | `max-w-4xl` | `Container size="tool"` |
| Tool (SEO landing) | `max-w-3xl`–`max-w-4xl` | `Container size="tool"` |

### Patrones de layout (reutilizados)

| Patrón | Dónde |
|--------|-------|
| **Divide list** (`divide-y` + `border-y`) | `how-it-works`, `faq`, `features`, `related` |
| **Label + body row** | `how-it-works`, `features` |
| **Section rhythm** | `ui/section.tsx` → `Section` |
| **One job / section** | cada sección un H2 + un bloque |

---

## Wireframe A — Home

```
HEADER (sticky)  Escala4x · nav · Escalar ahora
─────────────────────────────────────────────
H1 (uppercase, tracking) + subtítulo
[ TOOL  #tool ] [ Filmstrip vertical ]
─────────────────────────────────────────────
HOW IT WORKS      (divide list)
USE CASES         (grid 2 cols → /demo)
TRUST / PRIVACY   (centrado)
FAQ               (details/summary)
FEATURES          (label | body)
FOOTER
```

Implementación: `src/interface/pages/home-page.tsx` (orquestador) + `src/interface/sections/*`.

---

## Wireframe B — Landing SEO (`/demo`)

```
HEADER
─────────────────────────────────────────────
H1 = intención + TOOL (#tool)
─────────────────────────────────────────────
INTRO (2–5 párrafos)
FAQ (por intención)
RELATED
FEATURES (compartido con home)
FOOTER
```

Implementación: `src/interface/pages/seo-landing-page.tsx` + `src/interface/content/landings.ts`
(registry). El tool es el mismo componente `ToolSection` en ambas superficies.

---

## Slot — Tool (núcleo)

| Estado | UI |
|--------|----|
| **Demo** (default) | Filmstrip de samples + dropzone |
| **Input / loading** | Preview + barra de progreso por tile |
| **Completed** | Original \| Resultado + descarga PNG + reiniciar |

Layout canónico: `[ Preview/Input (flex-1) ] [ Filmstrip vertical ]`.
Archivos: `src/interface/tool/{tool-section,demo-filmstrip,upload-dropzone,result-display}.tsx`.

---

## SEO del template (estructura)

| Superficie | Datos estructurados |
|------------|---------------------|
| Home | `WebSite` + `HowTo` + `FAQPage` |
| Landing SEO | `BreadcrumbList` + `FAQPage` + `SoftwareApplication` |

Helper: `src/interface/seo/json-ld.tsx`.

---

## Checklist de composición

- [x] Primer viewport = marca + H1 + 1 frase + tool
- [x] Una job por sección
- [x] Divide lists + uppercase labels
- [x] Tool anclado en `#tool` y reutilizado en Home y `/demo`
- [x] Home y landing no divergen en el núcleo del producto
- [x] Copy centralizado en `src/interface/content/*`
- [x] Responsive: filmstrip horizontal en mobile, nav colapsa
- [x] Sin cards/pills/glow/stats en hero

---

## Instance (rellenada)

| Campo | Valor |
|-------|-------|
| Proyecto | `escalar-imagen-yt` — PoC de escalado de imagen en el navegador |
| `{{BRAND}}` | Escala4x |
| `{{PRIMARY_ACTION}}` | Escalar imagen 4x |
| `{{TOOL}}` descripción | Escalador 4x en navegador (ONNX Runtime Web + Web Worker con tiling). Estados: demo (filmstrip de samples) → upload → progreso por tile → done (descarga PNG). Opciones avanzadas: modelo, tile size, padding, denoise |
| Locales | `es` (sin i18n) |
| Landings SEO (keys) | `escalar-imagen-4x` → `/demo` |
| Claim de producto | “Escala tus imágenes 4x, gratis y 100% en tu navegador. Tus fotos nunca salen de tu dispositivo.” |
| Caps técnicos | `realesr-general-x4v3` (~4.9 MB), escala fija **x4**, backend **WASM** (`numThreads=1`, `proxy=false`), tiling, sin WebGPU todavía |
| Orchestrator Home | `src/app/page.tsx` → `src/interface/pages/home-page.tsx` |
| Orchestrator SEO | `src/app/demo/page.tsx` → `src/interface/pages/seo-landing-page.tsx` |
| Tokens CSS | `src/app/globals.css` (`@theme` + override `html.dark`) |
| Tema | Claro/oscuro con toggle en el header (`src/interface/theme/theme-toggle.tsx`), persistido en `localStorage`, default = `prefers-color-scheme` |
| Fuentes | `Inter` (cuerpo) + `Space Grotesk` (display) vía `next/font/google` |
| Estilos | Tailwind CSS v4 (`@tailwindcss/postcss`) |

### Notas de instanciación

- La arquitectura Clean (Domain/Application/Infrastructure/Interface) se mantiene: todo el shell,
  secciones y tool viven en `src/interface/`, que solo consume `src/application`/`src/composition`.
- Los samples del filmstrip están en `public/samples/` (fotos reales 240×180).
- `metadataBase` apunta a `https://escala4x.local` (placeholder de la PoC); ajústalo al dominio real.
