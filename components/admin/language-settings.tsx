"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Globe, ArrowLeft, Loader2, Plus, Trash2, Languages, Search, RefreshCw } from "lucide-react"
import Link from "next/link"

interface EnabledLanguage {
  id: string
  language_code: string
  language_name: string
  native_name: string | null
  is_enabled: boolean
  sort_order: number
}

interface SupportedLanguage {
  language: string
  name: string
}

export function LanguageSettings() {
  const { toast } = useToast()
  const [languages, setLanguages] = useState<EnabledLanguage[]>([])
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSupported, setLoadingSupported] = useState(false)
  const [addingLanguage, setAddingLanguage] = useState(false)
  const [togglingCode, setTogglingCode] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EnabledLanguage | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddSection, setShowAddSection] = useState(false)
  const [retranslatingCode, setRetranslatingCode] = useState<string | null>(null)

  const fetchLanguages = useCallback(async () => {
    try {
      const res = await fetch("/api/languages")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setLanguages(data.languages || [])
    } catch {
      toast({ title: "Error", description: "Failed to load languages", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchSupportedLanguages = useCallback(async () => {
    setLoadingSupported(true)
    try {
      const res = await fetch("/api/languages/supported")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setSupportedLanguages(data.languages || [])
    } catch {
      toast({ title: "Error", description: "Failed to load supported languages", variant: "destructive" })
    } finally {
      setLoadingSupported(false)
    }
  }, [toast])

  useEffect(() => {
    fetchLanguages()
  }, [fetchLanguages])

  const enabledCount = languages.filter((l) => l.is_enabled).length
  const addedCodes = new Set(languages.map((l) => l.language_code))

  const filteredSupported = supportedLanguages.filter(
    (sl) =>
      !addedCodes.has(sl.language) &&
      sl.language !== "en" &&
      sl.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenAddSection = () => {
    setShowAddSection(true)
    if (supportedLanguages.length === 0) {
      fetchSupportedLanguages()
    }
  }

  const handleAddLanguage = async (lang: SupportedLanguage) => {
    setAddingLanguage(true)
    try {
      const res = await fetch("/api/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language_code: lang.language,
          language_name: lang.name,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Failed to add language", variant: "destructive" })
        return
      }

      toast({
        title: "Language Added",
        description: data.warning
          ? `${lang.name} added. ${data.warning}`
          : `${lang.name} added with ${data.translations_count} translations`,
      })

      setSearchQuery("")
      setShowAddSection(false)
      await fetchLanguages()
    } catch {
      toast({ title: "Error", description: "Failed to add language", variant: "destructive" })
    } finally {
      setAddingLanguage(false)
    }
  }

  const handleToggle = async (lang: EnabledLanguage) => {
    const newEnabled = !lang.is_enabled

    if (newEnabled && enabledCount >= 5) {
      toast({ title: "Limit Reached", description: "Maximum 5 languages can be enabled at once", variant: "destructive" })
      return
    }

    setTogglingCode(lang.language_code)
    try {
      const res = await fetch(`/api/languages/${lang.language_code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: newEnabled }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast({ title: "Error", description: data.error || "Failed to update", variant: "destructive" })
        return
      }

      setLanguages((prev) =>
        prev.map((l) =>
          l.language_code === lang.language_code ? { ...l, is_enabled: newEnabled } : l
        )
      )

      toast({
        title: newEnabled ? "Enabled" : "Disabled",
        description: `${lang.language_name} has been ${newEnabled ? "enabled" : "disabled"}`,
      })
    } catch {
      toast({ title: "Error", description: "Failed to update language", variant: "destructive" })
    } finally {
      setTogglingCode(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/languages/${deleteTarget.language_code}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        toast({ title: "Error", description: "Failed to remove language", variant: "destructive" })
        return
      }

      toast({
        title: "Removed",
        description: `${deleteTarget.language_name} and all its translations have been removed`,
      })

      setDeleteTarget(null)
      await fetchLanguages()
    } catch {
      toast({ title: "Error", description: "Failed to remove language", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const handleRetranslateAll = async (lang: EnabledLanguage) => {
    setRetranslatingCode(lang.language_code)
    try {
      const res = await fetch(`/api/languages/${lang.language_code}/retranslate-all`, {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Failed to retranslate", variant: "destructive" })
        return
      }

      toast({
        title: "Retranslation Complete",
        description: `${data.bot_translations_count || 0} bot messages + ${data.menu_translations_count || 0} menu options retranslated for ${lang.language_name}`,
      })
    } catch {
      toast({ title: "Error", description: "Failed to retranslate", variant: "destructive" })
    } finally {
      setRetranslatingCode(null)
    }
  }

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
        <Link href="/admin/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-medium text-manzhil-dark flex items-center gap-2">
            <Globe className="h-6 w-6 text-manzhil-teal" />
            Bot Languages
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage languages for the WhatsApp chatbot. Enabled languages appear as options when residents send &quot;0&quot;.
          </p>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-manzhil-teal border-manzhil-teal">
          {enabledCount}/5 enabled
        </Badge>
        {enabledCount === 0 && (
          <span className="text-sm text-gray-500">
            English only (no language prompt shown)
          </span>
        )}
        {enabledCount > 0 && (
          <span className="text-sm text-gray-500">
            Residents will see a language selection menu
          </span>
        )}
      </div>

      {/* Languages list */}
      {languages.length > 0 && (
        <div className="space-y-3">
          {languages.map((lang) => (
            <Card key={lang.language_code} className="border-0 shadow-md shadow-manzhil-teal/5">
              <CardContent className="flex items-center justify-between flex-wrap gap-3 py-4 px-6">
                <div className="flex items-center gap-4">
                  <Languages className="h-5 w-5 text-manzhil-teal" />
                  <div>
                    <p className="font-medium text-manzhil-dark">
                      {lang.language_name}
                      {lang.native_name && (
                        <span className="text-gray-500 ml-2">({lang.native_name})</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">Code: {lang.language_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetranslateAll(lang)}
                    disabled={retranslatingCode === lang.language_code}
                  >
                    {retranslatingCode === lang.language_code ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Retranslating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retranslate All
                      </>
                    )}
                  </Button>
                  <Link href={`/admin/settings/languages/${lang.language_code}`}>
                    <Button variant="outline" size="sm">
                      Edit Translations
                    </Button>
                  </Link>
                  <Switch
                    checked={lang.is_enabled}
                    onCheckedChange={() => handleToggle(lang)}
                    disabled={togglingCode === lang.language_code}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteTarget(lang)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add language section */}
      {!showAddSection ? (
        <Button
          onClick={handleOpenAddSection}
          className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Language
        </Button>
      ) : (
        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-manzhil-teal" />
              Add a Language
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Search for a language below. Adding a language will auto-translate all ~115 bot messages using Google Translate. This may take a few seconds.
            </p>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search languages (e.g. Urdu, Arabic, Hindi...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
                autoFocus
              />
            </div>

            {loadingSupported ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-manzhil-teal" />
                <span className="ml-2 text-sm text-gray-500">Loading supported languages...</span>
              </div>
            ) : addingLanguage ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-manzhil-teal" />
                <span className="ml-2 text-sm text-gray-500">Adding language and translating all messages...</span>
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="max-h-60 overflow-y-auto space-y-1 border rounded-md p-2">
                {filteredSupported.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No matching languages found</p>
                ) : (
                  filteredSupported.slice(0, 20).map((sl) => (
                    <button
                      key={sl.language}
                      onClick={() => handleAddLanguage(sl)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-manzhil-teal/10 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-sm">{sl.name}</span>
                      <span className="text-xs text-gray-400">{sl.language}</span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Type at least 2 characters to search</p>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setShowAddSection(false)
                setSearchQuery("")
              }}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.language_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all translations for {deleteTarget?.language_name}. If you want to re-add it later, all messages will need to be re-translated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removing...
                </>
              ) : (
                "Remove Language"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
