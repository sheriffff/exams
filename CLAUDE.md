# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack y comandos

Vue 3 (Composition API, `<script setup>`) + Vite + Tailwind v4. Generador de exámenes de matemáticas para ESO y Bachillerato españoles. Toda la UI en español. Alias `@` → `/src`. Markdown importable como string vía `?raw` (declarado en `vite.config.js` con `assetsInclude`).

- `npm run dev` levanta el dev server de Vite (sin funciones serverless)
- `vercel dev` levanta Vite + funciones de `/api` juntos (forma correcta para desarrollo local completo)
- `npm run build` produce `dist/`
- `npm run preview` sirve el build
- No hay tests ni linter

Nota: `package.json` fija `vite ^8.0.0-beta.13` mediante `overrides`. Es una beta. Si rompe algo en el futuro, bajar a 7.x estable.

## Flujo principal

1. Usuario escribe prompts en lenguaje natural por pregunta. Gemini devuelve LaTeX.
2. Las preguntas se ensamblan en un documento `.tex` completo con `buildTexDocument()`.
3. El `.tex` se compila a PDF llamando al servicio externo `latex.ytotech.com`.
4. Opcionalmente se genera un PDF de soluciones con `buildSolutionTexDocument()`.

## Rutas (`src/router.js`)

- `/` → `HomePage`
- `/create` → `ExamEditor`
- `/admin` → `AdminPanel` (lazy, oculta)

El admin se accede haciendo **triple click rápido sobre la palabra "por"** en el footer del HomePage. No hay enlace visible. Dentro, hay un check de password client-side con SHA-256 (decorativo, no es seguridad real). La página es un placeholder.

## Páginas (`src/pages/`)

- **HomePage** — Landing con CTA a `/create`. Tiene el easter egg del admin.
- **ExamEditor** — Núcleo de la app. Lista de `QuestionRow` editables, metadatos del examen (título, profesor, fecha, clase, modelo), instrucciones, selector de tamaño de fuente (12/14/17). Avisa si los puntos no suman 10. Botones para generar PDF de examen y PDF de soluciones.
- **AdminPanel** — Placeholder protegido.

## Componentes (`src/components/`)

- **QuestionRow** — Editor autocontenido de una pregunta: prompt en lenguaje natural, selector de dificultad, editor LaTeX, preview con KaTeX, botones para subir/bajar dificultad e iterar con instrucción libre.
- **LatexPreview** — Renderiza strings LaTeX a HTML usando KaTeX. Soporta delimitadores `\[ \]`, `\( \)`, `$$ $$`, `$ $`.
- **CourseSelector** — Dropdown de niveles (1-4 ESO, 1-2 Bachillerato). Usa `defineModel()`.

## Servicios (`src/services/`)

- **llm.js** — Capa de llamadas al modelo. Hace POST a `/api/call-openai` (función serverless en `api/call-openai.js`) que llama a OpenAI con `gpt-4.1-mini`. Los prompts viven como ficheros `.md` en `src/prompts/`, se importan con `?raw` y se rellenan con `fillTemplate()` (sintaxis `{{var}}`). El prompt `question-format.md` se concatena automáticamente a `generateQuestion`, `adjustDifficulty` e `iterateQuestion`. La respuesta del modelo puede venir con un encabezado `TÍTULO: ...\n---\n<latex>` que `parseResponse` separa.
- **latex.js** — Construye los `.tex` (examen y soluciones), escapa caracteres LaTeX, compila contra `latex.ytotech.com/builds/sync` (`pdflatex`), y descarga el blob resultante. La plantilla del documento está hardcodeada con `extarticle`, `babel` español, `amsmath`, márgenes 1.5cm.

## Backend (`api/`)

- **call-openai.js** — Función serverless de Vercel. Recibe `{ prompt }` por POST, llama a `https://api.openai.com/v1/chat/completions` con la `OPENAI_API_KEY` del entorno del servidor, devuelve `{ text }`. La key nunca llega al cliente.

## Prompts (`src/prompts/`)

- `generate-question.md` — Pregunta nueva desde cero
- `adjust-difficulty.md` — Subir o bajar dificultad de una existente
- `iterate-question.md` — Refinar con instrucción libre
- `solve-question.md` — Generar la solución (usado para el PDF de soluciones)
- `question-format.md` — Instrucciones de formato compartidas, se appendea a los tres primeros

Para añadir un prompt nuevo: crear `.md`, importarlo en `gemini.js` con `?raw`, exponer una función que llame a `callGemini`.

## Estilo

Tailwind v4 con `@theme` en `src/style.css`. Paleta:
- `primary-50` … `primary-700` (azul, hue oklch 254)
- `accent-400` … `accent-600` (verde, hue oklch 160)

Utility custom: `.glass` (fondo blanco translúcido + blur, para tarjetas).

## Entorno

- `OPENAI_API_KEY` requerido como env var del proyecto en Vercel (entornos Production, Preview y Development). Nunca con prefijo `VITE_`: si llevara ese prefijo Vite la inyectaría en el bundle del cliente y se filtraría.
- Añadir la var por CLI (`vercel env add OPENAI_API_KEY`), no por dashboard. El dashboard auto-marca como "sensitive" los valores tipo `sk-...` y eso impide pasarlos al entorno Development, rompiendo `vercel dev`. La CLI no aplica esa auto-detección.
- Para dev local: `vercel env pull` (baja las env vars al `.env.local` gitignorado) y luego `vercel dev`. `npm run dev` solo arranca Vite y no expone `/api`.
- La compilación de PDF depende de `latex.ytotech.com` (externo). Si se cae, la generación de PDF cae con él.
