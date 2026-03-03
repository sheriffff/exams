const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
}

function escapeLatex(text) {
  return text.replace(/[\\&%$#_{}~^]/g, m => ({
    '\\': '\\textbackslash{}',
    '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#',
    '_': '\\_', '{': '\\{', '}': '\\}',
    '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
  })[m])
}

function buildQuestionsBlock(questions, options) {
  return questions
    .filter(q => q.latex)
    .map(q => {
      let item = '\\item'
      if (q.points) item += ` \\textbf{(${q.points} pts)}`
      item += `\n${q.latex}`
      const space = options.perQuestionSpace ? (q.answerSpace || 0) : (options.answerSpace ? options.answerSpaceCm : 0)
      if (space > 0) item += `\n\\vspace{${space}cm}`
      return item
    })
    .join('\n\n')
}

export function buildTexDocument(questions, examMeta, course, options = {}, customTemplate = null) {
  const title = examMeta.title || 'Examen de Matemáticas'
  const date = formatDate(examMeta.date)
  const teacher = examMeta.teacher || ''
  const className = examMeta.className || ''
  const modelo = examMeta.modelo || ''
  const questionsBlock = buildQuestionsBlock(questions, options)
  const totalPoints = questions.filter(q => q.latex).reduce((sum, q) => sum + (q.points || 0), 0)

  if (customTemplate) {
    let studentLine = 'Nombre del alumno/a: \\hrulefill'
    if (totalPoints > 0) studentLine += `\n\n\\hfill \\textbf{Total: ${totalPoints} puntos}`

    let beforeEnum = ''
    if (options.instructions?.trim()) {
      beforeEnum = `\\noindent \\textit{${escapeLatex(options.instructions.trim())}}\n\n\\vspace{0.3cm}\n\n`
    }

    return customTemplate
      .replace('%%TITLE%%', title)
      .replace('%%TEACHER%%', teacher)
      .replace('%%DATE%%', date)
      .replace('%%COURSE%%', course || '')
      .replace('%%CLASS%%', className)
      .replace('%%MODELO%%', modelo ? `Modelo: ${modelo}` : '')
      .replace('%%STUDENT%%', studentLine)
      .replace('%%QUESTIONS%%', questionsBlock)
      .replace('\\begin{enumerate}', beforeEnum + '\\begin{enumerate}')
  }

  const header = [
    course && className ? `${course} — ${className}` : course || className,
    teacher ? `Profesor/a: ${teacher}` : '',
    date,
  ].filter(Boolean).join(' \\hfill ')

  const modeloLine = modelo ? `\\noindent Modelo: ${modelo}\n\n` : ''

  let afterName = ''
  if (totalPoints > 0) afterName = `\n\\hfill \\textbf{Total: ${totalPoints} puntos}\n`

  let instructionsBlock = ''
  if (options.instructions?.trim()) {
    instructionsBlock = `\\noindent \\textit{${escapeLatex(options.instructions.trim())}}\n\n\\vspace{0.3cm}\n`
  }

  return `\\documentclass[a4paper,12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[spanish]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage[margin=2.5cm]{geometry}

\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large \\textbf{${title}}}
\\end{center}

\\noindent ${header}

\\vspace{0.5cm}

${modeloLine}\\noindent Nombre del alumno/a: \\hrulefill
${afterName}
\\vspace{0.5cm}

${instructionsBlock}\\begin{enumerate}
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
