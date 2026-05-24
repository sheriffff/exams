export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt } = req.body || {}
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Falta el campo "prompt"' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Falta OPENAI_API_KEY en el servidor' })
  }

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await r.json()
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || 'Error de OpenAI' })
    }

    return res.status(200).json({ text: data.choices?.[0]?.message?.content ?? '' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
