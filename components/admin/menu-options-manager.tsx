"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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

export function MenuOptionsManager() {
  const [options, setOptions] = useState<MenuOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editEmoji, setEditEmoji] = useState("")
  const { toast } = useToast()

  const fetchOptions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/menu-options")
      if (!res.ok) throw new Error("Failed to fetch menu options")
      const data = await res.json()
      setOptions(data.options || [])
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
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={cancelEditing}
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
    </div>
  )
}
