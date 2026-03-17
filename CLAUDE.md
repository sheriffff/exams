# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Vue 3 SPA (Composition API with `<script setup>`) for generating math exams using AI. The app targets Spanish education levels (ESO and Bachillerato). All UI text is in Spanish.

### Key Flow

1. User creates exam questions via natural language prompts → Gemini AI generates LaTeX
2. Questions are assembled into a full LaTeX document using `buildTexDocument()`
3. LaTeX is compiled to PDF via the external API at `latex.ytotech.com`
4. Users can create custom exam templates (from scratch or by uploading a PDF) using an AI chat interface

### Routes

- `/` — HomePage
- `/create` — ExamEditor
- `/templates/:id?` — TemplateEditor (lazy-loaded)
- `/admin` — AdminPanel (lazy-loaded, password-protected)

### Services (`src/services/`)

- **gemini.js** — Wraps `@google/genai` SDK. Uses markdown prompt templates from `src/prompts/*.md` (imported as raw strings via `?raw`). Template variables use `{{varName}}` syntax filled by `fillTemplate()`. Uses `gemini-2.5-flash-lite` for questions and `gemini-3-flash-preview` for templates. Prompt files: `generate-question`, `adjust-difficulty`, `iterate-question`, `iterate-template`, `analyze-template`, `question-format` (appended to question prompts as shared format instructions).
- **latex.js** — Builds complete `.tex` documents from questions + metadata. Handles both default layout and custom templates (with `%%PLACEHOLDER%%` markers like `%%TITLE%%`, `%%QUESTIONS%%`, `%%STUDENT%%`). `compilePdf()` sends LaTeX to the remote compiler API.
- **templates.js** — CRUD for exam templates stored in localStorage under key `exam-templates`.
- **pdf.js** — Extracts text from PDFs using `pdfjs-dist` and generates thumbnails.

### Pages (`src/pages/`)

- **HomePage** — Landing page with links to create exam or configure templates
- **ExamEditor** — Main exam creation page. Each question is a `QuestionRow` component with prompt → generate → preview workflow. Supports difficulty levels, per-question answer space, point tracking (warns if not summing to 10).
- **TemplateEditor** — Two modes: "from PDF" (upload → AI extracts format) or "from scratch" (checkbox field selection). Both modes support iterative AI chat to refine the LaTeX template. Live PDF preview on right side.
- **AdminPanel** — Password-protected admin page (client-side SHA-256 hash check). Currently a placeholder.

### Components (`src/components/`)

- **QuestionRow** — Self-contained question editor: prompt input, difficulty selector, LaTeX editor, KaTeX preview, difficulty adjustment buttons
- **LatexPreview** — Renders LaTeX strings to HTML using KaTeX. Handles `\[ \]`, `\( \)`, `$$ $$`, and `$ $` delimiters.
- **CourseSelector** — Dropdown for Spanish education levels (1-4 ESO, 1-2 Bachillerato). Uses `defineModel()` for v-model binding.

### Styling

Tailwind CSS 4 with a custom theme defined in `src/style.css`. Custom color tokens: `primary-50` through `primary-700` (blue, oklch hue 254) and `accent-400` through `accent-600` (green, oklch hue 160). A `.glass` utility class provides frosted-glass card styling.

### Environment

Requires `VITE_GEMINI_API_KEY` env var for the Google Gemini API. Path alias `@` maps to `/src`.
