"use client"

import { useEffect, useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Languages, Save, RotateCcw, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

interface TranslationEntry {
  message_key: string
  flow_group: string
  label: string
  description: string | null
  default_text: string
  custom_text: string | null
  variables: string[]
  sort_order: number
  english_text: string
  translated_text: string
  is_auto_translated: boolean
  translation_updated_at: string | null
}

type GroupedTranslations = Record<string, TranslationEntry[]>

const FLOW_GROUP_LABELS: Record<string, string> = {
  main_menu: "Main Menu",
  complaint: "Complaints",
  booking: "Bookings",
  hall: "Hall",
  staff: "Staff",
  visitor: "Visitors",
  feedback: "Feedback",
  payment: "Payment",
  amenity: "Amenities",
  status: "Status",
  errors: "Errors",
  navigation: "Navigation",
}

const FLOW_GROUP_ORDER = [
  "main_menu",
  "complaint",
  "booking",
  "hall",
  "staff",
  "visitor",
  "feedback",
  "payment",
  "amenity",
  "status",
  "errors",
  "navigation",
]

export function TranslationEditor({ languageCode }: { languageCode: string }) {
  const { toast } = useToast()
  const [translations, setTranslations] = useState<GroupedTranslations>({})
  const [loading, setLoading] = useState(true)
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({})
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set())
  const [retranslatingKeys, setRetranslatingKeys] = useState<Set<string>>(new Set())
  const [languageName, setLanguageName] = useState("")

  const fetchTranslations = useCallback(async () => {
    try {
      const res = await fetch(`/api/languages/${languageCode}/translations`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setTranslations(data.translations || {})
    } catch {
      toast({ title: "Error", description: "Failed to load translations", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [languageCode, toast])

  // Fetch language name
  useEffect(() => {
    async function fetchName() {
      try {
        const res = await fetch("/api/languages")
        if (res.ok) {
          const data = await res.json()
          const lang = (data.languages || []).find(
            (l: { language_code: string }) => l.language_code === languageCode
          )
          if (lang) {
            setLanguageName(lang.native_name || lang.language_name)
          }
        }
      } catch {
        // ignore
      }
    }
    fetchName()
  }, [languageCode])

  useEffect(() => {
    fetchTranslations()
  }, [fetchTranslations])

  const getEditedText = (key: string, entry: TranslationEntry): string => {
    return editedTexts[key] ?? entry.translated_text
  }

  const isDirty = (key: string, entry: TranslationEntry): boolean => {
    if (!(key in editedTexts)) return false
    return editedTexts[key] !== entry.translated_text
  }

  const handleTextChange = (key: string, value: string) => {
    setEditedTexts((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (entry: TranslationEntry) => {
    const key = entry.message_key
    const newText = editedTexts[key]
    if (newText === undefined) return

    setSavingKeys((prev) => new Set(prev).add(key))

    try {
      const res = await fetch(
        `/api/languages/${languageCode}/translations/${encodeURIComponent(key)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ translated_text: newText }),
        }
      )

      if (!res.ok) throw new Error("Failed to save")

      // Update local state
      setTranslations((prev) => {
        const updated = { ...prev }
        for (const group in updated) {
          updated[group] = updated[group].map((t) =>
            t.message_key === key
              ? { ...t, translated_text: newText, is_auto_translated: false }
              : t
          )
        }
        return updated
      })

      setEditedTexts((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })

      toast({ title: "Saved", description: `"${entry.label}" translation updated` })
    } catch {
      toast({ title: "Error", description: "Failed to save translation", variant: "destructive" })
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const handleRetranslate = async (entry: TranslationEntry) => {
    const key = entry.message_key

    setRetranslatingKeys((prev) => new Set(prev).add(key))

    try {
      const res = await fetch(
        `/api/languages/${languageCode}/translations/${encodeURIComponent(key)}/retranslate`,
        { method: "POST" }
      )

      if (!res.ok) throw new Error("Failed to retranslate")

      const data = await res.json()
      const newText = data.translation?.translated_text || ""

      // Update local state
      setTranslations((prev) => {
        const updated = { ...prev }
        for (const group in updated) {
          updated[group] = updated[group].map((t) =>
            t.message_key === key
              ? { ...t, translated_text: newText, is_auto_translated: true }
              : t
          )
        }
        return updated
      })

      // Clear any edits for this key
      setEditedTexts((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })

      toast({ title: "Re-translated", description: `"${entry.label}" has been re-translated from English` })
    } catch {
      toast({ title: "Error", description: "Failed to re-translate", variant: "destructive" })
    } finally {
      setRetranslatingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const insertVariable = (key: string, variable: string, entry: TranslationEntry) => {
    const textareaId = `textarea-${key}`
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null
    const currentText = getEditedText(key, entry)
    const varText = `{${variable}}`

    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newText = currentText.substring(0, start) + varText + currentText.substring(end)
      handleTextChange(key, newText)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + varText.length, start + varText.length)
      }, 0)
    } else {
      handleTextChange(key, currentText + varText)
    }
  }

  const sortedGroups = FLOW_GROUP_ORDER.filter((g) => translations[g]?.length > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-manzhil-teal" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/settings/languages">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-medium text-manzhil-dark flex items-center gap-2">
            <Languages className="h-6 w-6 text-manzhil-teal" />
            {languageName || languageCode} Translations
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Edit translations for each bot message. Auto-translated messages can be manually refined.
          </p>
        </div>
      </div>

      {sortedGroups.length === 0 ? (
        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
          <CardContent className="py-10 text-center text-gray-500">
            No translations found. Go back and add this language first.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={sortedGroups[0]} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            {sortedGroups.map((group) => (
              <TabsTrigger
                key={group}
                value={group}
                className="data-[state=active]:bg-manzhil-teal data-[state=active]:text-white rounded-full px-4 py-1.5 text-sm border"
              >
                {FLOW_GROUP_LABELS[group] || group}
              </TabsTrigger>
            ))}
          </TabsList>

          {sortedGroups.map((group) => (
            <TabsContent key={group} value={group} className="mt-6 space-y-4">
              {translations[group].map((entry) => {
                const key = entry.message_key
                const isSaving = savingKeys.has(key)
                const isRetranslating = retranslatingKeys.has(key)
                const dirty = isDirty(key, entry)
                const variables: string[] = Array.isArray(entry.variables) ? entry.variables : []

                return (
                  <Card key={key} className="border-0 shadow-lg shadow-manzhil-teal/5">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-medium">{entry.label}</CardTitle>
                          {entry.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{entry.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {entry.is_auto_translated ? (
                            <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                              Auto-translated
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-manzhil-teal/10 text-manzhil-teal">
                              Manually edited
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs font-mono">
                            {key}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* English original (read-only) */}
                      <div>
                        <p className="text-xs text-gray-400 mb-1 font-medium">English (original)</p>
                        <div className="bg-gray-50 rounded-md p-3 text-sm font-mono text-gray-600 whitespace-pre-wrap">
                          {entry.english_text}
                        </div>
                      </div>

                      {/* Variable chips */}
                      {variables.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-xs text-gray-400 self-center mr-1">Variables:</span>
                          {variables.map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => insertVariable(key, v, entry)}
                              className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-mono cursor-pointer"
                            >
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Translated text (editable) */}
                      <div>
                        <p className="text-xs text-gray-400 mb-1 font-medium">
                          {languageName || languageCode} translation
                        </p>
                        <Textarea
                          id={`textarea-${key}`}
                          value={getEditedText(key, entry)}
                          onChange={(e) => handleTextChange(key, e.target.value)}
                          rows={Math.min(12, Math.max(3, getEditedText(key, entry).split("\n").length + 1))}
                          className="font-mono text-sm resize-y"
                          dir="auto"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(entry)}
                          disabled={!dirty || isSaving}
                          className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all"
                        >
                          {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Save className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Save
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetranslate(entry)}
                          disabled={isRetranslating || isSaving}
                        >
                          {isRetranslating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Re-translate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
