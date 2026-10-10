# Escala4x

PoC de **escalado de imágenes 4x en el navegador** con
[`realesr-general-x4v3.onnx`](https://github.com/xinntao/Real-ESRGAN) ejecutado dentro de un
**Web Worker** mediante **ONNX Runtime Web**. Estilada como landing de herramienta
(ver [`docs/master-template-blueprint.md`](docs/master-template-blueprint.md)).

> Fase 1: **PoC**. Sin backend, sin base de datos, sin cuentas. Todo corre en el cliente.

---

## Stack

| Pieza | Versión |
| --- | --- |
| Next.js (App Router) | 15.5 |
| React | 19 |
| TypeScript (strict) | 5.9 |
| Tailwind CSS | 4.3 |
| onnxruntime-web | 1.20.1 |
| Fuentes | `Inter` + `Space Grotesk` (`next/font`) |
| Gestor de paquetes | pnpm 12 |

---

## Rutas

| Ruta | Superficie | Descripción |
| --- | --- | --- |
| `/` | Home | Hero + tool + how-it-works + use cases + trust + FAQ + features |
| `/demo` | Landing SEO | H1 por intención + tool + intro + FAQ + related + features |

Ambas superficies reutilizan el **mismo** componente de tool (`ToolSection`).

---

## Arquitectura (Clean Architecture + DDD, 4 capas)

Se aplicó el skill `skill-clean-architecture`: **solo las 4 capas esenciales, sin
sobre-ingeniería**. Cada archivo empieza con un comentario `LAYER:`.

```
src/
├── domain/                     # Núcleo. Cero dependencias externas.
│   └── value-objects/          # RgbaImage, UpscaleOptions (invariantes)
│
├── application/                # Orquestación. Solo depende de Domain.
│   ├── ports/                  # ImageUpscaler, ImageCodec, Clock (contratos)
│   ├── dtos/                   # UpscaleImage DTOs
│   └── use-cases/              # UpscaleImageUseCase
│
├── infrastructure/             # Detalles técnicos. Depende de Domain + Application.
│   ├── onnx/                   # model.ts + WorkerImageUpscaler (implementa el puerto)
│   ├── workers/                # upscale.worker.ts (ONNX + tiling) + messages.ts
│   ├── image/                  # CanvasImageCodec
│   └── system/                 # PerformanceClock
│
├── interface/                  # Presentación. Solo depende de Application/Composition.
│   ├── layout/                 # SiteHeader, SiteFooter (shell)
│   ├── pages/                  # home-page, seo-landing-page (orquestadores)
│   ├── sections/               # how-it-works, use-cases, trust, faq, features
│   ├── tool/                   # tool-section, demo-filmstrip, upload-dropzone, result-display
│   ├── content/                # site, home, landings, samples (copy/datos)
│   ├── ui/                     # Container, Section, SectionHeading
│   ├── seo/                    # json-ld
│   └── hooks/                  # use-upscale-image
│
├── composition/
│   └── container.ts            # Composition root: cablea puertos con implementaciones
│
└── app/                        # Rutas Next.js
    ├── layout.tsx              # Shell global (header + footer + fuentes)
    ├── globals.css             # Tailwind + tokens de diseño (@theme)
    ├── page.tsx                # Home
    └── demo/page.tsx           # Landing SEO
```

### Regla de dependencia

```
Interface ──▶ Application ──▶ Domain
     │              ▲
     └──▶ Composition ──▶ Infrastructure ──▶ (implements ports)
```

- **Domain** no importa nada de las otras capas.
- **Application** define puertos y casos de uso; no conoce frameworks ni el DOM.
- **Infrastructure** implementa los puertos (ONNX, Worker, Canvas, performance).
- **Interface** solo consume el caso de uso (vía Composition); nunca toca Infra/Domain.

---

## Diseño (Master Template Blueprint)

- **Tema:** claro/oscuro monocromo, editorial. Sin sombras, gradientes ni pills. Toggle en el
  header; respeta `prefers-color-scheme` y se persiste en `localStorage`.
- **Tokens** (`src/app/globals.css`, `@theme` de Tailwind v4): `--color-ink`, `--color-paper`,
  `--color-muted`, `--color-faint`, `--color-hairline`, `--color-surface`, `--tracking-label`.
  El modo oscuro redefine esos mismos tokens bajo `html.dark`, así que toda la UI (incluidas las
  utilidades `bg-paper`/`text-ink`/`border-hairline`) se adapta sin `dark:` por componente.
- **Tipografía:** labels `uppercase` con tracking amplio (`tracking-label`); jerarquía por
  tipografía, no por color.
- **Contenedores:** `wide` (5xl) header/footer · `editorial` (3xl) secciones · `tool` (4xl) tool.
- **Ritmo:** `py-24 md:py-32`; divide lists con hairlines.

---

## Cómo funciona el escalado

1. El usuario elige una imagen (upload o sample del filmstrip).
2. `CanvasImageCodec` la decodifica a `RgbaImage` (píxeles RGBA).
3. `UpscaleImageUseCase` invoca `WorkerImageUpscaler` (puerto `ImageUpscaler`).
4. El worker (`upscale.worker.ts`):
   - Carga `realesr-general-x4v3.onnx` con **ONNX Runtime Web** (backend WASM).
   - Recorre la imagen por **tiles** con **solape** para evitar costuras y limitar memoria.
   - Convierte cada tile a **NCHW float32 RGB en [0,1]**, infiere y recorta el padding.
   - Reporta **progreso** tile a tile al hilo principal.
   - Devuelve la imagen 4x (escala fija **x4**).
5. Se codifica a PNG y se ofrece para previsualizar/descargar.

| | |
| --- | --- |
| Input | `input`, `[1, 3, H, W]`, float32, RGB en `[0,1]` (H/W dinámicos) |
| Output | `[1, 3, H*4, W*4]` |
| Escala | 4x |

---

## Puesta en marcha

```bash
pnpm install
pnpm dev
# Home:  http://localhost:3000/
# Demo:  http://localhost:3000/demo
```

El modelo está incluido en `public/models/realesr-general-x4v3.onnx` (4.87 MB) y los samples
del filmstrip en `public/samples/`.

### Scripts

```bash
pnpm dev        # servidor de desarrollo
pnpm build      # build de producción
pnpm start      # servir el build
pnpm typecheck  # tsc --noEmit
```

---

## Notas y limitaciones

- Backend ONNX Runtime **WASM** con `numThreads = 1` y `proxy = false` (sin requisitos de
  `SharedArrayBuffer` / COOP-COEP). Los `.wasm` se cargan desde CDN
  (`src/infrastructure/onnx/model.ts`).
- **WebGPU** no está habilitado todavía (siguiente experimento para medir rendimiento).
- El canal **alpha** no lo produce el modelo: se reconstruye por vecino más cercano.
- El resultado se descarga como **PNG**.
- `metadataBase` apunta a `https://escala4x.local` (placeholder); ajústalo al dominio real.
- Sin tests automatizados (el modelo requiere un navegador con Canvas/WASM).

## Licencia del modelo

`realesr-general-x4v3` pertenece a [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN)
(Tencent ARC Lab) bajo licencia **BSD-3-Clause**.
