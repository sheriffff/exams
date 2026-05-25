import generateQuestionPrompt from '@/prompts/generate-question.md?raw'
import adjustDifficultyPrompt from '@/prompts/adjust-difficulty.md?raw'
import iterateQuestionPrompt from '@/prompts/iterate-question.md?raw'
import solveQuestionPrompt from '@/prompts/solve-question.md?raw'
import questionFormatPrompt from '@/prompts/question-format.md?raw'

const COURSE_AGES = {
  '1 ESO': '12-13',
  '2 ESO': '13-14',
  '3 ESO': '14-15',
  '4 ESO': '15-16',
  '1 Bachillerato': '16-17',
  '2 Bachillerato': '17-18',
}

function courseWithAge(course) {
  const age = COURSE_AGES[course]
  return age ? `${course} (${age} años)` : course
}

function fillTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

function parseResponse(text) {
  let clean = text.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim()
  clean = clean.replace(/^T[ÍI]TULO\s*:[^\n]*\n+/i, '')
  clean = clean.replace(/^\s*-{2,}\s*\n+/, '')
  return { title: '', latex: clean.trim() }
}

async function callLLM(prompt) {
  const r = await fetch('/api/call-openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || 'Error de la API')
  return data.text
}

export async function generateQuestion(prompt, course, difficulty = 'normal', questionType = 'analitico') {
  const filled = fillTemplate(generateQuestionPrompt, { prompt, course: courseWithAge(course), difficulty, questionType }) + '\n\n' + questionFormatPrompt
  return parseResponse(await callLLM(filled))
}

export async function adjustDifficulty(latex, course, direction) {
  const filled = fillTemplate(adjustDifficultyPrompt, { latex, course: courseWithAge(course), direction }) + '\n\n' + questionFormatPrompt
  return parseResponse(await callLLM(filled))
}

export async function iterateQuestion(latex, course, instruction) {
  const filled = fillTemplate(iterateQuestionPrompt, { latex, course: courseWithAge(course), instruction }) + '\n\n' + questionFormatPrompt
  return parseResponse(await callLLM(filled))
}

const DETAIL_INSTRUCTIONS = {
  bajo: 'Resuelve la pregunta de forma mínima: muestra solo el planteamiento imprescindible y la respuesta final. No incluyas pasos intermedios ni explicaciones con texto. Si hay operaciones, deja únicamente las estrictamente necesarias para llegar al resultado.',
  normal: 'Resuelve la pregunta mostrando los pasos clave del cálculo, sin explicaciones extensas con texto. Incluye solo las operaciones matemáticas necesarias para llegar a la respuesta, sin titular cada paso ni justificar con prosa.',
  largo: 'Resuelve la pregunta paso a paso, explicando cada paso con texto claro para que un alumno pueda entenderlo. Muestra todos los pasos intermedios con sus justificaciones.',
}

export async function solveQuestion(latex, course, detailLevel = 'normal') {
  const detailInstruction = DETAIL_INSTRUCTIONS[detailLevel] || DETAIL_INSTRUCTIONS.normal
  const filled = fillTemplate(solveQuestionPrompt, { latex, course: courseWithAge(course), detailInstruction })
  const text = await callLLM(filled)
  return text.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '').trim()
}
