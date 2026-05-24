import generateQuestionPrompt from '@/prompts/generate-question.md?raw'
import adjustDifficultyPrompt from '@/prompts/adjust-difficulty.md?raw'
import iterateQuestionPrompt from '@/prompts/iterate-question.md?raw'
import solveQuestionPrompt from '@/prompts/solve-question.md?raw'
import questionFormatPrompt from '@/prompts/question-format.md?raw'

function fillTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

function parseResponse(text) {
  const clean = text.replace(/^```latex?\n?/, '').replace(/\n?```$/, '').trim()
  const match = clean.match(/^TÍTULO:\s*(.+)\n---\n([\s\S]+)$/)
  if (match) return { title: match[1].trim(), latex: match[2].trim() }
  return { title: '', latex: clean }
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
  const filled = fillTemplate(generateQuestionPrompt, { prompt, course, difficulty, questionType }) + '\n\n' + questionFormatPrompt
  return parseResponse(await callLLM(filled))
}

export async function adjustDifficulty(latex, course, direction) {
  const filled = fillTemplate(adjustDifficultyPrompt, { latex, course, direction }) + '\n\n' + questionFormatPrompt
  return parseResponse(await callLLM(filled))
}

export async function iterateQuestion(latex, course, instruction) {
  const filled = fillTemplate(iterateQuestionPrompt, { latex, course, instruction }) + '\n\n' + questionFormatPrompt
  return parseResponse(await callLLM(filled))
}

export async function solveQuestion(latex, course) {
  const filled = fillTemplate(solveQuestionPrompt, { latex, course })
  const text = await callLLM(filled)
  return text.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '').trim()
}
