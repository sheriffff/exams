function needsTikz(sources) {
  return sources.some(s => s && /\\begin\{tikzpicture\}/.test(s))
}

function needsPgfplots(sources) {
  return sources.some(s => s && /\\begin\{(axis|loglogaxis|semilogxaxis|semilogyaxis|polaraxis)\}/.test(s))
}

function needsCaption(sources) {
  return sources.some(s => s && /\\caption\*/.test(s))
}

function needsMarvosym(sources) {
  return sources.some(s => s && /\\Letter\b/.test(s))
}

function needsEnumitem(sources) {
  return sources.some(s => s && /\\begin\{(enumerate|itemize|description)\}\[/.test(s))
}

function needsGraphicx(sources) {
  return sources.some(s => s && /\\includegraphics\b/.test(s))
}

function preamble(fontSize, sources = []) {
  const lines = [
    `\\documentclass[a4paper,${fontSize}pt]{extarticle}`,
    `\\usepackage[utf8]{inputenc}`,
    `\\usepackage[T1]{fontenc}`,
    `\\usepackage[spanish]{babel}`,
    `\\usepackage{amsmath,amssymb}`,
    `\\usepackage[table]{xcolor}`,
  ]
  if (needsTikz(sources) || needsPgfplots(sources)) {
    lines.push(`\\usepackage{tikz}`)
    lines.push(`\\usetikzlibrary{arrows.meta,calc,patterns,decorations.pathreplacing,angles,quotes}`)
  }
  if (needsPgfplots(sources)) {
    lines.push(`\\usepackage{pgfplots}`)
    lines.push(`\\pgfplotsset{compat=1.18}`)
  }
  if (needsCaption(sources)) {
    lines.push(`\\usepackage{caption}`)
  }
  if (needsMarvosym(sources)) {
    lines.push(`\\usepackage{marvosym}`)
  }
  if (needsEnumitem(sources)) {
    lines.push(`\\usepackage{enumitem}`)
  }
  if (needsGraphicx(sources)) {
    lines.push(`\\usepackage{graphicx}`)
  }
  lines.push(`\\usepackage[margin=1.5cm]{geometry}`)
  lines.push('')
  lines.push(`\\pagestyle{empty}`)
  return lines.join('\n') + '\n'
}

function escapeLatex(text) {
  return text.replace(/[\\&%$#_{}~^]/g, m => ({
    '\\': '\\textbackslash{}',
    '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#',
    '_': '\\_', '{': '\\{', '}': '\\}',
    '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
  })[m])
}

function buildQuestionsBlock(questions, opts = {}) {
  const { includePoints = true, spacingCm = 0 } = opts
  const valid = questions.filter(q => q.latex)
  return valid
    .map((q, i) => {
      let item = '\\item'
      if (includePoints && q.points) item += ` \\textbf{(${q.points} pts)}`
      item += `\n${q.latex}`
      if (spacingCm > 0 && i < valid.length - 1) {
        item += `\n\n\\vspace{${spacingCm}cm}`
      }
      return item
    })
    .join('\n\n')
}

export function buildHeaderLatex(examMeta, course, options = {}) {
  const lines = []

  if (examMeta.title) {
    lines.push(`\\begin{center}`)
    lines.push(`{\\LARGE \\textbf{${escapeLatex(examMeta.title)}}}`)
    lines.push(`\\end{center}`)
    lines.push('')
  }

  const datePart = examMeta.date ? escapeLatex(examMeta.date) : ''
  const courseLabel = examMeta.className ? 'CLASE' : 'CURSO'
  const courseValue = examMeta.className ? `${escapeLatex(course)} ${escapeLatex(examMeta.className)}` : escapeLatex(course)

  const rows = []
  if (datePart) rows.push(`\\textbf{FECHA:} & ${datePart}`)
  rows.push(`\\textbf{${courseLabel}:} & ${courseValue}`)
  if (examMeta.modelo) rows.push(`\\textbf{MODELO:} & ${escapeLatex(examMeta.modelo)}`)

  const tabular = `\\begin{tabular}{rr}\n${rows.join(' \\\\\n')}\n\\end{tabular}`

  if (examMeta.teacher) {
    lines.push(`\\noindent`)
    lines.push(`\\begin{minipage}[t]{0.4\\textwidth}`)
    lines.push(`\\textbf{PROFESOR:} ${escapeLatex(examMeta.teacher)}`)
    lines.push(`\\end{minipage}%`)
    lines.push(`\\hfill`)
    lines.push(`\\begin{minipage}[t]{0.5\\textwidth}`)
    lines.push(`\\raggedleft`)
    lines.push(tabular)
    lines.push(`\\end{minipage}`)
  } else {
    lines.push(`\\begin{flushright}`)
    lines.push(tabular)
    lines.push(`\\end{flushright}`)
  }
  lines.push('')

  if (options.instructions?.trim()) {
    for (const line of options.instructions.split('\n')) {
      if (line.trim()) lines.push(`\\noindent ${escapeLatex(line.trim())}`)
    }
    lines.push('')
  }

  lines.push('\\vspace{0.3cm}')
  lines.push('\\noindent\\rule{\\textwidth}{0.4pt}')
  lines.push('\\vspace{0.3cm}')
  lines.push('')

  lines.push(`\\noindent \\textbf{NOMBRE:}`)
  lines.push('')
  lines.push('\\vspace{0.5cm}')

  return lines.join('\n')
}

function buildMessagePage() {
  return `\\thispagestyle{empty}
\\vspace*{1cm}
\\begin{center}
\\includegraphics[height=2cm]{escuelia-logo.png}
\\end{center}

\\vspace{1.5cm}

\\noindent Hola, soy Manu.

\\vspace{0.5cm}

\\noindent He creado esta herramienta porque creo que nos puede dar buenas ideas y ahorrar horas a los profes de matemáticas al preparar exámenes.

\\vspace{0.5cm}

\\noindent Detrás de esto no hay una gran empresa. Soy yo solo, y he dejado mi trabajo para volcarme a tiempo completo en desarrollar esta y otras herramientas para clase.

\\vspace{0.5cm}

\\noindent Si te está sirviendo y crees que a tu departamento o a tu centro le cuadraría usarla de forma oficial y customizarla, escríbeme por favor un mail y lo vemos.

\\vspace{0.5cm}

\\noindent \\Letter\\ \\texttt{manuel.lopez.sheriff@gmail.com}

\\vspace{0.5cm}

\\noindent Y pásate por \\texttt{www.escuelia.es} para ver el resto :)

\\newpage
`
}

export function buildTexDocument(questions, examMeta, course, options = {}, fontSize = 12) {
  const questionsBlock = buildQuestionsBlock(questions, {
    includePoints: options.includePoints !== false,
    spacingCm: options.spacingCm || 0,
  })

  const header = buildHeaderLatex(examMeta, course, options)

  const messagePage = options.prependMessage ? buildMessagePage() : ''

  const sources = [...questions.map(q => q.latex), messagePage]

  return `${preamble(fontSize, sources)}
\\begin{document}

${messagePage}${header}
\\begin{enumerate}
${questionsBlock}
\\end{enumerate}

\\end{document}
`
}

export function buildSolutionTexDocument(questions, solutions, examMeta, course, fontSize = 12, options = {}) {
  const title = examMeta.title ? escapeLatex(examMeta.title) : 'Examen'
  const valid = questions.filter(q => q.latex)
  const includePoints = options.includePoints !== false
  const items = valid
    .map((q, i) => {
      let item = '\\item'
      if (includePoints && q.points) item += ` \\textbf{(${q.points} pts)}`
      item += `\n${q.latex}`
      item += `\n\n\\vspace{0.3cm}\n\\textbf{Solución:}\n\\vspace{0.2cm}\n\n${solutions[i] || 'Sin solución'}`
      return item
    })
    .join('\n\n\\vspace{0.5cm}\n\n')

  const sources = [...valid.map(q => q.latex), ...solutions]

  return `${preamble(fontSize, sources)}
\\begin{document}

\\begin{center}
{\\LARGE \\textbf{${title} — Soluciones}}
\\end{center}

\\vspace{0.3cm}
\\noindent\\rule{\\textwidth}{0.4pt}
\\vspace{0.5cm}

\\begin{enumerate}
${items}
\\end{enumerate}

\\end{document}
`
}

export async function compilePdf(texSource, extraResources = []) {
  const res = await fetch('https://latex.ytotech.com/builds/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compiler: 'pdflatex',
      resources: [{ main: true, content: texSource }, ...extraResources],
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LaTeX compilation failed: ${text}`)
  }
  return res.blob()
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
