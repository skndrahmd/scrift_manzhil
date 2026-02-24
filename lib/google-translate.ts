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
 * Prepare text for HTML-mode translation:
 * 1. Convert \n to <br> so line breaks survive (HTML mode collapses \n to whitespace)
 * 2. Wrap {variable} placeholders in translate="no" spans
 */
function prepareForTranslation(text: string): string {
  return text
    .replace(/\n/g, "<br>")
    .replace(/\{(\w+)\}/g, '<span translate="no">{$1}</span>')
}

/**
 * Restore text after HTML-mode translation:
 * 1. Strip <span translate="no"> wrappers to recover {variable} placeholders
 * 2. Convert <br> back to \n to restore line breaks
 * Handles potential whitespace or attribute variations added by Google Translate.
 */
function restoreFromTranslation(text: string): string {
  return text
    .replace(/<span[^>]*translate\s*=\s*"no"[^>]*>\s*\{(\w+)\}\s*<\/span>/gi, "{$1}")
    .replace(/<br\s*\/?>/gi, "\n")
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
 *
 * For multi-line texts (e.g. \n-delimited label lists), each line is
 * translated as a separate segment so Google Translate cannot reorder
 * or merge lines — this prevents garbled translations for menu labels.
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = "en"
): Promise<string> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY is not set")
  }

  // For multi-line texts (label lists), translate each line individually
  // so Google Translate cannot reorder or merge them
  const lines = text.split("\n")
  if (lines.length > 1) {
    const translated = await translateBatch(lines, targetLanguage, sourceLanguage)
    return translated.join("\n")
  }

  const protected_text = prepareForTranslation(text)

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
  return decodeHtmlEntities(restoreFromTranslation(raw))
}

/**
 * Translate multiple texts in a single API call (batch).
 * Google Translate v2 supports up to 128 texts per request.
 * Placeholders like {name} are automatically preserved.
 *
 * Multi-line texts (e.g. \n-delimited label lists) are expanded into
 * individual lines for translation, then recombined. This prevents
 * Google Translate from garbling line order in menu labels.
 */
export async function translateBatch(
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string = "en"
): Promise<string[]> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY is not set")
  }

  // Expand multi-line texts into individual lines for accurate translation.
  // Track which original index each flattened segment belongs to, and how
  // many lines it was split into, so we can recombine after translation.
  const flatSegments: string[] = []
  const lineCountPerText: number[] = []

  for (const text of texts) {
    const lines = text.split("\n")
    lineCountPerText.push(lines.length)
    flatSegments.push(...lines)
  }

  // Google Translate v2 supports up to 128 segments per request
  const BATCH_SIZE = 128
  const flatResults: string[] = []

  for (let i = 0; i < flatSegments.length; i += BATCH_SIZE) {
    const batch = flatSegments.slice(i, i + BATCH_SIZE).map(prepareForTranslation)

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
      (t: TranslateResult) => decodeHtmlEntities(restoreFromTranslation(t.translatedText))
    )
    flatResults.push(...translated)
  }

  // Recombine: group flat results back into multi-line strings
  const results: string[] = []
  let offset = 0
  for (const count of lineCountPerText) {
    const lines = flatResults.slice(offset, offset + count)
    results.push(lines.join("\n"))
    offset += count
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
