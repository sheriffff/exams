import { GoogleGenAI } from '@google/genai'
import generateQuestionPrompt from '@/prompts/generate-question.md?raw'
import adjustDifficultyPrompt from '@/prompts/adjust-difficulty.md?raw'
import analyzeTemplatePrompt from '@/prompts/analyze-template.md?raw'
import iterateTemplatePrompt from '@/prompts/iterate-template.md?raw'

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
    model: 'gemini-3-flash-preview',
    contents: prompt,
  })
  return parseResponse(response.text)
}

export async function generateQuestion(prompt, course) {
  const filled = fillTemplate(generateQuestionPrompt, { prompt, course })
  return callGemini(filled)
}

export async function adjustDifficulty(latex, course, direction) {
  const filled = fillTemplate(adjustDifficultyPrompt, { latex, course, direction })
  return callGemini(filled)
}

export async function analyzeTemplate(base64Data, mimeType) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      { inlineData: { data: base64Data, mimeType } },
      analyzeTemplatePrompt,
    ],
  })
  return response.text.replace(/^```latex?\n?/, '').replace(/\n?```$/, '').trim()
}

export async function iterateTemplate(currentTex, userMessage, pdfContext, recentMessages) {
  const recentFormatted = recentMessages
    .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
    .join('\n')

  const pdfBlock = pdfContext
    ? `## Texto extraído del PDF de referencia\n\n${pdfContext}`
    : ''

  const filled = fillTemplate(iterateTemplatePrompt, {
    currentTex: currentTex || '(vacía — crear desde cero)',
    userMessage,
    pdfContext: pdfBlock,
    recentMessages: recentFormatted || '(ninguno)',
  })

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: filled,
  })

  const text = response.text
  const latexMatch = text.match(/```latex\s*\n([\s\S]*?)```/)
  if (latexMatch) {
    const explanation = text.slice(0, text.indexOf('```latex')).trim()
    return { texTemplate: latexMatch[1].trim(), explanation }
  }

  const codeMatch = text.match(/```\s*\n([\s\S]*?)```/)
  if (codeMatch) {
    const explanation = text.slice(0, text.indexOf('```')).trim()
    return { texTemplate: codeMatch[1].trim(), explanation }
  }

  return { texTemplate: text.trim(), explanation: '' }
}
