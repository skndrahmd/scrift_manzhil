"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowUp,
  ArrowDown,
  Save,
  Loader2,
  ArrowLeft,
  GripVertical,
  Pencil,
  X,
  Check,
  RotateCcw,
  Languages,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

interface MenuOption {
  id: string
  action_key: string
  label: string
  emoji: string
  is_enabled: boolean
  sort_order: number
  handler_type: string
  created_at: string
  updated_at: string
}

interface Language {
  language_code: string
  language_name: string
  native_name: string | null
  is_enabled: boolean
}

interface MenuOptionTranslation {
  id: string
  menu_option_id: string
  language_code: string
  translated_label: string
  is_stale: boolean
  is_auto_translated: boolean
}

export function MenuOptionsManager() {
  const [options, setOptions] = useState<MenuOption[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  const [translations, setTranslations] = useState<MenuOptionTranslation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editEmoji, setEditEmoji] = useState("")
  const [translationsDialogOpen, setTranslationsDialogOpen] = useState(false)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [editingTranslation, setEditingTranslation] = useState<string | null>(null)
  const [editTranslationText, setEditTranslationText] = useState("")
  const [retranslating, setRetranslating] = useState(false)
  const [savingEditId, setSavingEditId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchOptions = useCallback(async () => {
    try {
      setLoading(true)
      const [optionsRes, languagesRes] = await Promise.all([
        fetch("/api/menu-options"),
        fetch("/api/languages"),
      ])
      
      if (!optionsRes.ok) throw new Error("Failed to fetch menu options")
      if (!languagesRes.ok) throw new Error("Failed to fetch languages")
      
      const optionsData = await optionsRes.json()
      const languagesData = await languagesRes.json()
      
      setOptions(optionsData.options || [])
      setLanguages(languagesData.languages || [])
      setHasChanges(false)
    } catch (err) {
      console.error("Failed to fetch menu options:", err)
      toast({
        title: "Error",
        description: "Failed to load menu options",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchTranslations = async (menuOptionId: string) => {
    try {
      const res = await fetch(`/api/menu-options/${menuOptionId}/translations`)
      if (res.ok) {
        const data = await res.json()
        setTranslations(data.translations || [])
      }
    } catch (err) {
      console.error("Failed to fetch translations:", err)
    }
  }

  const openTranslationsDialog = (optionId: string) => {
    setSelectedOptionId(optionId)
    setTranslationsDialogOpen(true)
    fetchTranslations(optionId)
  }

  const saveTranslation = async (translationId: string, newText: string) => {
    try {
      const res = await fetch(`/api/menu-options/translations/${translationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ translated_label: newText }),
      })
      
      if (!res.ok) throw new Error("Failed to update translation")
      
      setTranslations(prev =>
        prev.map(t => t.id === translationId ? { ...t, translated_label: newText, is_stale: false } : t)
      )
      setEditingTranslation(null)
      toast({ title: "Updated", description: "Translation saved" })
    } catch (err) {
      console.error("Failed to save translation:", err)
      toast({
        title: "Error",
        description: "Failed to save translation",
        variant: "destructive",
      })
    }
  }

  const retranslateAll = async () => {
    if (!selectedOptionId) return
    
    try {
      setRetranslating(true)
      const res = await fetch("/api/menu-options/retranslate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_option_id: selectedOptionId }),
      })
      
      if (!res.ok) throw new Error("Failed to retranslate")
      
      const data = await res.json()
      
      // Refresh translations
      await fetchTranslations(selectedOptionId)
      
      toast({ 
        title: "Retranslated", 
        description: `${data.retranslated_count || 0} translations updated` 
      })
    } catch (err) {
      console.error("Failed to retranslate:", err)
      toast({
        title: "Error",
        description: "Failed to retranslate",
        variant: "destructive",
      })
    } finally {
      setRetranslating(false)
    }
  }

  const getTranslationStatus = (optionId: string) => {
    const optionTranslations = translations.filter(t => t.menu_option_id === optionId)
    const enabledLanguages = languages.filter(l => l.is_enabled)
    
    if (enabledLanguages.length === 0) return null
    
    const translatedCount = optionTranslations.filter(t => !t.is_stale).length
    const staleCount = optionTranslations.filter(t => t.is_stale).length
    
    if (staleCount > 0) {
      return { status: "stale" as const, translated: translatedCount, total: enabledLanguages.length }
    }
    if (translatedCount === enabledLanguages.length) {
      return { status: "complete" as const, translated: translatedCount, total: enabledLanguages.length }
    }
    return { status: "partial" as const, translated: translatedCount, total: enabledLanguages.length }
  }

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  const moveUp = (index: number) => {
    if (index === 0) return
    const newOptions = [...options]
    const temp = newOptions[index]
    newOptions[index] = newOptions[index - 1]
    newOptions[index - 1] = temp
    // Reassign sort_order based on new positions
    newOptions.forEach((opt, i) => {
      opt.sort_order = i + 1
    })
    setOptions(newOptions)
    setHasChanges(true)
  }

  const moveDown = (index: number) => {
    if (index === options.length - 1) return
    const newOptions = [...options]
    const temp = newOptions[index]
    newOptions[index] = newOptions[index + 1]
    newOptions[index + 1] = temp
    // Reassign sort_order based on new positions
    newOptions.forEach((opt, i) => {
      opt.sort_order = i + 1
    })
    setOptions(newOptions)
    setHasChanges(true)
  }

  const toggleEnabled = (index: number) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], is_enabled: !newOptions[index].is_enabled }
    setOptions(newOptions)
    setHasChanges(true)
  }

  const startEditing = (opt: MenuOption) => {
    setEditingId(opt.id)
    setEditLabel(opt.label)
    setEditEmoji(opt.emoji)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditLabel("")
    setEditEmoji("")
  }

  const saveEdit = async (opt: MenuOption) => {
    if (!editLabel.trim()) {
      toast({
        title: "Error",
        description: "Label cannot be empty",
        variant: "destructive",
      })
      return
    }

    setSavingEditId(opt.id)
    try {
      const res = await fetch(`/api/menu-options/${opt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editLabel.trim(),
          emoji: editEmoji.trim() || opt.emoji,
        }),
      })

      if (!res.ok) throw new Error("Failed to update")

      const data = await res.json()
      // Update local state
      setOptions((prev) =>
        prev.map((o) => (o.id === opt.id ? { ...o, ...data.option } : o))
      )
      setEditingId(null)
      toast({
        title: "Updated",
        description: `"${editLabel.trim()}" saved successfully`,
      })
    } catch (err) {
      console.error("Failed to save edit:", err)
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setSavingEditId(null)
    }
  }

  const saveOrder = async () => {
    try {
      setSaving(true)
      const payload = options.map((opt) => ({
        id: opt.id,
        sort_order: opt.sort_order,
        is_enabled: opt.is_enabled,
      }))

      const res = await fetch("/api/menu-options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options: payload }),
      })

      if (!res.ok) throw new Error("Failed to save")

      const data = await res.json()
      setOptions(data.options || [])
      setHasChanges(false)
      toast({
        title: "Saved",
        description: "Menu order and visibility updated successfully",
      })
    } catch (err) {
      console.error("Failed to save order:", err)
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const enabledCount = options.filter((o) => o.is_enabled).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Menu Options</h2>
            <p className="text-muted-foreground">
              Manage WhatsApp bot main menu options — reorder, enable/disable, and edit labels.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={fetchOptions} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Discard
            </Button>
          )}
          <Button onClick={saveOrder} disabled={!hasChanges || saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Order
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-3">
        <Badge variant="secondary" className="text-sm">
          {options.length} total options
        </Badge>
        <Badge variant="default" className="text-sm">
          {enabledCount} enabled
        </Badge>
        <Badge variant="outline" className="text-sm">
          {options.length - enabledCount} disabled
        </Badge>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How it works</CardTitle>
          <CardDescription>
            Changes to order and visibility take effect immediately for the WhatsApp bot after saving.
            Residents will see only enabled options, numbered sequentially based on the order below.
            Use the edit button (pencil icon) to change the label or emoji of each option.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Options list */}
      <div className="space-y-2">
        {options.map((opt, index) => (
          <Card
            key={opt.id}
            className={`transition-all ${
              !opt.is_enabled ? "opacity-60 border-dashed" : ""
            }`}
          >
            <CardContent className="flex items-center gap-4 py-3 px-4">
              {/* Grip icon (visual only) */}
              <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />

              {/* Position number */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                {index + 1}
              </div>

              {/* Emoji + Label */}
              <div className="flex-1 min-w-0">
                {editingId === opt.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editEmoji}
                      onChange={(e) => setEditEmoji(e.target.value)}
                      className="w-16 text-center"
                      placeholder="📝"
                    />
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="flex-1"
                      placeholder="Option label"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(opt)
                        if (e.key === "Escape") cancelEditing()
                      }}
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => saveEdit(opt)}
                      disabled={savingEditId === opt.id}
                      className="text-green-600 hover:text-green-700"
                    >
                      {savingEditId === opt.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={cancelEditing}
                      disabled={savingEditId === opt.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{opt.emoji}</span>
                    <span className="font-medium">{opt.label}</span>
                    <Badge variant="outline" className="text-xs ml-2">
                      {opt.handler_type}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEditing(opt)}
                      className="h-7 w-7 ml-1"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {/* Translations button */}
                    {languages.filter(l => l.is_enabled).length > 0 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openTranslationsDialog(opt.id)}
                        className="h-7 w-7 ml-1"
                        title="View translations"
                      >
                        <Languages className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Move up/down */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="h-8 w-8"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => moveDown(index)}
                  disabled={index === options.length - 1}
                  className="h-8 w-8"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Enable/Disable toggle */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                  checked={opt.is_enabled}
                  onCheckedChange={() => toggleEnabled(index)}
                />
                <span className="text-xs text-muted-foreground w-14">
                  {opt.is_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">WhatsApp Menu Preview</CardTitle>
          <CardDescription>
            This is how the main menu will appear to residents in WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
            {`👋 Hello Resident!\n\nWelcome to *Manzhil*\n\n`}
            {options
              .filter((o) => o.is_enabled)
              .map((opt, i) => `${i + 1}. ${opt.emoji} ${opt.label}`)
              .join("\n")}
            {`\n\nReply 1-${enabledCount}`}
          </div>
        </CardContent>
      </Card>

      {/* Translations Dialog */}
      <Dialog open={translationsDialogOpen} onOpenChange={setTranslationsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Translations
            </DialogTitle>
            <DialogDescription>
              {selectedOptionId
                ? options.find(o => o.id === selectedOptionId)?.label
                : "Menu option translations"}
            </DialogDescription>
          </DialogHeader>
          
          {/* Retranslate button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={retranslateAll}
              disabled={retranslating || languages.filter(l => l.is_enabled).length === 0}
            >
              {retranslating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Retranslate All
            </Button>
          </div>
          
          <div className="space-y-3">
            {languages.filter(l => l.is_enabled).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No languages enabled. Enable languages in Settings to see translations.
              </p>
            ) : (
              languages
                .filter(l => l.is_enabled)
                .map(lang => {
                  const trans = translations.find(
                    t => t.language_code === lang.language_code && t.menu_option_id === selectedOptionId
                  )
                  const isEditing = editingTranslation === lang.language_code
                  
                  return (
                    <div key={lang.language_code} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {lang.native_name || lang.language_name}
                          </span>
                          {trans?.is_stale && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Needs retranslation
                            </Badge>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editTranslationText}
                              onChange={e => setEditTranslationText(e.target.value)}
                              className="flex-1"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => trans && saveTranslation(trans.id, editTranslationText)}
                              className="text-green-600"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingTranslation(null)}
                              className="text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {trans?.translated_label || "Not translated"}
                            </span>
                            {trans && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingTranslation(lang.language_code)
                                  setEditTranslationText(trans.translated_label)
                                }}
                                className="h-6 w-6"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
