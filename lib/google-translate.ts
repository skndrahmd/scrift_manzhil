/**
 * Google Cloud Translation API v2 utility
 * Uses the REST API directly to avoid heavy SDK dependency.
 *
 * Placeholder Protection:
 * Messages contain {variable} placeholders (e.g. {name}, {options}).
 * Before sending to Google Translate, we wrap them in <span translate="no">
 * tags and use format:"html" so the API preserves them untouched.
 * After translation, we strip the spans and decode HTML entities.
 */

const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY
const BASE_URL = "https://translation.googleapis.com/language/translate/v2"

interface TranslateResult {
  translatedText: string
  detectedSourceLanguage?: string
}

/**
 * Wrap {variable} placeholders in translate="no" spans so Google Translate
 * leaves them intact.
 */
function protectPlaceholders(text: string): string {
  return text.replace(
    /\{(\w+)\}/g,
    '<span translate="no">{$1}</span>'
  )
}

/**
 * Strip the <span translate="no"> wrappers to recover original {variable} placeholders.
 * Handles potential whitespace or attribute variations added by Google Translate.
 */
function restorePlaceholders(text: string): string {
  return text.replace(
    /<span[^>]*translate\s*=\s*"no"[^>]*>\s*\{(\w+)\}\s*<\/span>/gi,
    "{$1}"
  )
}

/**
 * Decode common HTML entities that Google Translate returns in HTML mode.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

/**
 * Translate a single text string to the target language.
 * Placeholders like {name} are automatically preserved.
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = "en"
): Promise<string> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY is not set")
  }

  const protected_text = protectPlaceholders(text)

  const response = await fetch(`${BASE_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: protected_text,
      source: sourceLanguage,
      target: targetLanguage,
      format: "html",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google Translate API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const raw = data.data.translations[0].translatedText
  return decodeHtmlEntities(restorePlaceholders(raw))
}

/**
 * Translate multiple texts in a single API call (batch).
 * Google Translate v2 supports up to 128 texts per request.
 * Placeholders like {name} are automatically preserved.
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
    const batch = texts.slice(i, i + BATCH_SIZE).map(protectPlaceholders)

    const response = await fetch(`${BASE_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: batch,
        source: sourceLanguage,
        target: targetLanguage,
        format: "html",
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google Translate API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const translated = data.data.translations.map(
      (t: TranslateResult) => decodeHtmlEntities(restorePlaceholders(t.translatedText))
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
