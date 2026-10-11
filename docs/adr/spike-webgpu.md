# Spike: WebGPU EP con Real-ESRGAN (`realesr-general-x4v3`)

**Status:** ✅ Completado — WebGPU funciona end-to-end
**Date:** 2026-10-11
**Branch:** `feat/webgpu-native-formats`
**Relacionado:** [ADR 001](./001-webgpu-and-multi-format-support.md)

---

## Objetivo

Determinar si el modelo real (`public/models/realesr-general-x4v3.onnx`, 4.7 MB) puede
ejecutarse con el **execution provider WebGPU** de `onnxruntime-web`, con fallback a WASM,
y cuantificar el impacto en servidor y usuario.

---

## Cambios aplicados

| # | Cambio | Fichero |
|---|--------|---------|
| 1 | `onnxruntime-web` `1.20.1` → `1.30.0` | `package.json` |
| 2 | Import del bundle con WebGPU: `onnxruntime-web/webgpu` | `upscale.worker.ts` |
| 3 | Detección `navigator.gpu` + fallback `['webgpu','wasm']` | `upscale.worker.ts`, `webgpu-support.ts` |
| 4 | Diagnóstico de backend (badge + probe pre-ejecución) | `result-display.tsx`, `tool-section.tsx`, `use-upscale-image.ts` |
| 5 | **Ventana de tile constante + `freeDimensionOverrides`** (fix crítico) | `upscale.worker.ts`, `model.ts` |
| 6 | CDN de wasm pineado a `1.30.0` | `model.ts` |

---

## Hallazgo principal 🔑

### Sin el fix, la inferencia en WebGPU falla

Al crear la sesión con WebGPU y ejecutar el modelo tal cual, `OrtRun()` falla:

```
Shape mismatch attempting to re-use buffer. {1,136,136,3} != {1,544,544,3}.
Validate usage of dim_value ... and dim_param ...
```

**Causa:** el modelo declara dimensiones **simbólicas** (`batch_size`, `height`, `width`).
El planificador de memoria de ORT reutiliza el buffer de la entrada para la salida
(4× más grande, 544 = 136×4) porque cree que las dims simbólicas son iguales.

### El fix: `freeDimensionOverrides` + ventana constante

1. **Fijar las dims simbólicas** al crear la sesión:
   ```ts
   freeDimensionOverrides: { batch_size: 1, height: WIN, width: WIN }
   ```
2. **Alimentar siempre el mismo tamaño** (`WIN`): el override es un contrato estricto.
   Si la entrada no coincide exactamente, falla con:
   `Got invalid dimensions for input: input ... Got: 64 Expected: 32`.
   Por eso el worker ahora usa una **ventana de tamaño constante** (`tile + 2*padding`)
   con replicación de bordes (clamp) en lugar de ventanas variables.

> Confirmado empíricamente: FDO con tamaño coincidente → salida **correcta**
> (`outMean 0.509` para entrada `0.5`, dims `256×256` para entrada `64×64`).

---

## Evidencia (E2E headless Chromium 156 + SwiftShader)

Entorno de prueba: Chromium headless con `--enable-unsafe-webgpu` y **SwiftShader (Vulkan
software)**. Los tiempos **no son representativos de hardware real** (no hay GPU).

| Escenario | Backend (badge) | Resultado | Tiempo |
|-----------|-----------------|-----------|--------|
| Con adaptador WebGPU (flags) | **WEBGPU** | `128×128` ✅ | 27.2 s |
| Sin adaptador (fallback) | **WASM** | `128×128` ✅ | 4.4 s |
| Imagen real 240×180, default | — | (no testeado E2E por lentitud de SwiftShader) | — |

- **El wasm de ORT se descarga del CDN** (`cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/...`),
  **no** del servidor. El `.onnx` sí se sirve desde el servidor.
- El fallback WASM funciona correctamente: ORT descarta `webgpu` y usa `wasm`
  (`removing requested execution provider "webgpu" ... not available`).

---

## Impacto en el servidor

| Aspecto | Resultado |
|---------|-----------|
| Cómputo del servidor | **0** — toda la inferencia es client-side |
| wasm de ORT | Servido desde **CDN de jsdelivr** (no consume ancho de banda propio) |
| `.onnx` (4.7 MB) | Servido desde el servidor (sin cambios) |
| Bundle JS | +~117 KB (worker, chunk separado) |
| **Peso muerto en build** | ⚠️ El build emite `ort-wasm-simd-threaded.asyncify.wasm` (**26.7 MB**) en `.next/static/media/`. En runtime **no se usa** (el `wasmPaths` a CDN gana), pero engorda la imagen Docker. Ver trabajo pendiente |

> El bundle de ORT fija `wasmPaths` a un asset local **solo si `wasmPaths` no está definido**
> (`!o.in.wasm.wasmPaths && ...`). Como el worker lo define a CDN, el asset local queda sin uso.

---

## Impacto en el usuario

| Aspecto | Resultado |
|---------|-----------|
| Velocidad | GPU real esperada 5-10× vs WASM (no medible con SwiftShader) |
| Cobertura | WebGPU **solo Chromium** (ORT Web no soporta Safari/Firefox aún) → fallback WASM |
| Memoria GPU | A vigilar en móvil (tile grande = más VRAM) |
| Privacidad | Sin cambios (todo local) |

---

## Limitaciones y trabajo pendiente

1. **Benchmark real pendiente**: medir en GPU de hardware (NVIDIA/AMD/Intel/Apple) — SwiftShader
   invalida las cifras. Idealmente con Chrome real en desktop y móvil.
2. **Peso muerto de 26.7 MB** en el build: excluir el wasm emitido (p. ej. condición webpack
   `onnxruntime-web-use-extern-wasm`, o regla para no emitir el asset).
3. **Dims simbólicas hardcodeadas** (`batch_size`/`height`/`width`): válidas para el modelo por
   defecto. Hay un `try/catch` que reintenta sin overrides para modelos personalizados.
4. **Re-creación de sesión** al cambiar el tamaño de tile (el override depende de `WIN`). Correcto
   pero con coste de recarga del modelo.
5. **Diagnóstico temporal**: el badge/probe se pueden mantener como telemetría o retirar antes de
   producción.
6. **`onnxruntime-web/webgpu` es experimental** según ORT; versionar y testear en cada actualización.

---

## Conclusión

**WebGPU es viable para este modelo.** El bloqueo inicial (shape mismatch) es un bug conocido de
ORT con dims simbólicas, resoluble con `freeDimensionOverrides` + ventana constante, ya
implementado. El fallback WASM garantiza compatibilidad en Safari/Firefox. El impacto en el
servidor es nulo (solo el peso muerto del wasm en el build, fácil de eliminar).
