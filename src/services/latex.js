function escapeLatex(text) {
  return text.replace(/[\\&%$#_{}~^]/g, m => ({
    '\\': '\\textbackslash{}',
    '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#',
    '_': '\\_', '{': '\\{', '}': '\\}',
    '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
  })[m])
}

function buildQuestionsBlock(questions) {
  return questions
    .filter(q => q.latex)
    .map(q => {
      let item = '\\item'
      if (q.points) item += ` \\textbf{(${q.points} pts)}`
      item += `\n${q.latex}`
      return item
    })
    .join('\n\n')
}

export function buildHeaderLatex(examMeta, course, options = {}, fontSize = 12) {
  const lines = []
  const titleSize = Math.round(fontSize * 1.7)
  const titleSkip = Math.round(titleSize * 1.2)
  const nameSize = Math.round(fontSize * 1.15)
  const nameSkip = Math.round(nameSize * 1.2)

  if (examMeta.title) {
    lines.push(`\\begin{center}`)
    lines.push(`{\\fontsize{${titleSize}}{${titleSkip}}\\selectfont \\textbf{${escapeLatex(examMeta.title)}}}`)
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

  lines.push(`\\noindent {\\fontsize{${nameSize}}{${nameSkip}}\\selectfont \\textbf{NOMBRE:}}`)
  lines.push('')
  lines.push('\\vspace{0.5cm}')

  return lines.join('\n')
}

export function buildTexDocument(questions, examMeta, course, options = {}, fontSize = 12) {
  const questionsBlock = buildQuestionsBlock(questions)

  const header = buildHeaderLatex(examMeta, course, options, fontSize)

  return `\\documentclass[a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[spanish]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage[margin=1.5cm]{geometry}

\\pagestyle{empty}

\\begin{document}

\\fontsize{${fontSize}}{${Math.round(fontSize * 1.2)}}\\selectfont

${header}
\\begin{enumerate}
${questionsBlock}
\\end{enumerate}

\\end{document}
`
}

export async function compilePdf(texSource) {
  const res = await fetch('https://latex.ytotech.com/builds/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compiler: 'pdflatex',
      resources: [{ main: true, content: texSource }],
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
