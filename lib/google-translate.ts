/**
 * Google Cloud Translation API v2 utility
 * Uses the REST API directly to avoid heavy SDK dependency.
 */

const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY
const BASE_URL = "https://translation.googleapis.com/language/translate/v2"

interface TranslateResult {
  translatedText: string
  detectedSourceLanguage?: string
}

/**
 * Translate a single text string to the target language.
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = "en"
): Promise<string> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY is not set")
  }

  const response = await fetch(`${BASE_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: sourceLanguage,
      target: targetLanguage,
      format: "text",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google Translate API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.data.translations[0].translatedText
}

/**
 * Translate multiple texts in a single API call (batch).
 * Google Translate v2 supports up to 128 texts per request.
 */
export async function translateBatch(
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string = "en"
): Promise<string[]> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY is not set")
  }

  // Google Translate v2 supports up to 128 segments per request
  const BATCH_SIZE = 128
  const results: string[] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)

    const response = await fetch(`${BASE_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: batch,
        source: sourceLanguage,
        target: targetLanguage,
        format: "text",
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google Translate API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const translated = data.data.translations.map(
      (t: TranslateResult) => t.translatedText
    )
    results.push(...translated)
  }

  return results
}

/**
 * Fetch the list of supported languages from Google Translate.
 */
export async function getSupportedLanguages(): Promise<
  { language: string; name: string }[]
> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY is not set")
  }

  const response = await fetch(
    `${BASE_URL}/languages?key=${GOOGLE_TRANSLATE_API_KEY}&target=en`,
    { method: "GET" }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google Translate API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.data.languages
}
