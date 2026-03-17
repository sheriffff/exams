import { GoogleGenAI } from '@google/genai'
import generateQuestionPrompt from '@/prompts/generate-question.md?raw'
import adjustDifficultyPrompt from '@/prompts/adjust-difficulty.md?raw'
import iterateQuestionPrompt from '@/prompts/iterate-question.md?raw'
import questionFormatPrompt from '@/prompts/question-format.md?raw'

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY })

function fillTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

function parseResponse(text) {
  const clean = text.replace(/^```latex?\n?/, '').replace(/\n?```$/, '').trim()
  const match = clean.match(/^TÍTULO:\s*(.+)\n---\n([\s\S]+)$/)
  if (match) return { title: match[1].trim(), latex: match[2].trim() }
  return { title: '', latex: clean }
}

async function callGemini(prompt) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: prompt,
  })
  return parseResponse(response.text)
}

export async function generateQuestion(prompt, course, difficulty = 'normal', questionType = 'analitico') {
  const filled = fillTemplate(generateQuestionPrompt, { prompt, course, difficulty, questionType }) + '\n\n' + questionFormatPrompt
  return callGemini(filled)
}

export async function adjustDifficulty(latex, course, direction) {
  const filled = fillTemplate(adjustDifficultyPrompt, { latex, course, direction }) + '\n\n' + questionFormatPrompt
  return callGemini(filled)
}

export async function iterateQuestion(latex, course, instruction) {
  const filled = fillTemplate(iterateQuestionPrompt, { latex, course, instruction }) + '\n\n' + questionFormatPrompt
  return callGemini(filled)
}
