const KEY = 'exams_generated_count'
const FREE_LIMIT = 2

export function getExamCount() {
  try {
    return parseInt(localStorage.getItem(KEY) || '0', 10) || 0
  } catch {
    return 0
  }
}

export function incrementExamCount() {
  try {
    const next = getExamCount() + 1
    localStorage.setItem(KEY, String(next))
    return next
  } catch {
    return 0
  }
}

export function shouldPrependMessage() {
  return getExamCount() >= FREE_LIMIT
}
