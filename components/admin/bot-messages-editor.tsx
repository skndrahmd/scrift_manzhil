"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { MessageSquare, Save, RotateCcw, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

interface BotMessage {
  id: string
  message_key: string
  flow_group: string
  label: string
  description: string | null
  default_text: string
  custom_text: string | null
  variables: string[]
  sort_order: number
}

type GroupedMessages = Record<string, BotMessage[]>

const FLOW_GROUP_LABELS: Record<string, string> = {
  main_menu: "Main Menu",
  complaint: "Complaints",
  booking: "Bookings",
  hall: "Hall",
  staff: "Staff",
  visitor: "Visitors",
  feedback: "Feedback",
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
  "status",
  "errors",
  "navigation",
]

export function BotMessagesEditor() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<GroupedMessages>({})
  const [loading, setLoading] = useState(true)
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({})
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set())

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/bot-messages")
      if (!res.ok) {
        throw new Error("Failed to fetch messages")
      }
      const data = await res.json()
      setMessages(data.messages || {})
    } catch {
      toast({
        title: "Error",
        description: "Failed to load bot messages",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const getCurrentText = (msg: BotMessage): string => {
    return msg.custom_text ?? msg.default_text
  }

  const getEditedText = (key: string, msg: BotMessage): string => {
    return editedTexts[key] ?? getCurrentText(msg)
  }

  const isDirty = (key: string, msg: BotMessage): boolean => {
    if (!(key in editedTexts)) return false
    return editedTexts[key] !== getCurrentText(msg)
  }

  const isCustomized = (msg: BotMessage): boolean => {
    return msg.custom_text !== null && msg.custom_text !== msg.default_text
  }

  const handleTextChange = (key: string, value: string) => {
    setEditedTexts((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (msg: BotMessage) => {
    const key = msg.message_key
    const newText = editedTexts[key]
    if (newText === undefined) return

    setSavingKeys((prev) => new Set(prev).add(key))

    try {
      const res = await fetch(`/api/bot-messages/${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_text: newText }),
      })

      if (!res.ok) {
        throw new Error("Failed to save")
      }

      const data = await res.json()

      // Update the local message state
      setMessages((prev) => {
        const updated = { ...prev }
        for (const group in updated) {
          updated[group] = updated[group].map((m) =>
            m.message_key === key ? data.message : m
          )
        }
        return updated
      })

      // Clear the edited state
      setEditedTexts((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })

      toast({ title: "Saved", description: `"${msg.label}" updated successfully` })
    } catch {
      toast({
        title: "Error",
        description: "Failed to save message",
        variant: "destructive",
      })
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const handleReset = async (msg: BotMessage) => {
    const key = msg.message_key

    setSavingKeys((prev) => new Set(prev).add(key))

    try {
      const res = await fetch(`/api/bot-messages/${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_text: null }),
      })

      if (!res.ok) {
        throw new Error("Failed to reset")
      }

      const data = await res.json()

      // Update the local message state
      setMessages((prev) => {
        const updated = { ...prev }
        for (const group in updated) {
          updated[group] = updated[group].map((m) =>
            m.message_key === key ? data.message : m
          )
        }
        return updated
      })

      // Clear any edited state
      setEditedTexts((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })

      toast({ title: "Reset", description: `"${msg.label}" restored to default` })
    } catch {
      toast({
        title: "Error",
        description: "Failed to reset message",
        variant: "destructive",
      })
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const insertVariable = (key: string, variable: string, msg: BotMessage) => {
    const textareaId = `textarea-${key}`
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null
    const currentText = getEditedText(key, msg)
    const varText = `{${variable}}`

    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newText =
        currentText.substring(0, start) + varText + currentText.substring(end)
      handleTextChange(key, newText)
      // Restore cursor position after React re-render
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + varText.length, start + varText.length)
      }, 0)
    } else {
      handleTextChange(key, currentText + varText)
    }
  }

  // Sort groups by defined order
  const sortedGroups = FLOW_GROUP_ORDER.filter((g) => messages[g]?.length > 0)

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
            <MessageSquare className="h-6 w-6 text-manzhil-teal" />
            WhatsApp Bot Messages
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Customize the messages your WhatsApp bot sends to residents
          </p>
        </div>
      </div>

      {sortedGroups.length === 0 ? (
        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
          <CardContent className="py-10 text-center text-gray-500">
            No bot messages found. Run the seed SQL to populate messages.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={sortedGroups[0]} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
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
              {messages[group].map((msg) => {
                const key = msg.message_key
                const isSaving = savingKeys.has(key)
                const dirty = isDirty(key, msg)
                const customized = isCustomized(msg)
                const variables: string[] = Array.isArray(msg.variables)
                  ? msg.variables
                  : []

                return (
                  <Card
                    key={key}
                    className="border-0 shadow-lg shadow-manzhil-teal/5"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-medium">
                            {msg.label}
                          </CardTitle>
                          {msg.description && (
                            <p className="text-sm text-gray-500 mt-0.5">
                              {msg.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {customized && (
                            <Badge
                              variant="secondary"
                              className="bg-manzhil-teal/10 text-manzhil-teal"
                            >
                              Customized
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs font-mono">
                            {key}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Variable chips */}
                      {variables.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-xs text-gray-400 self-center mr-1">
                            Variables:
                          </span>
                          {variables.map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => insertVariable(key, v, msg)}
                              className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-mono cursor-pointer"
                            >
                              {`{${v}}`}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Textarea */}
                      <Textarea
                        id={`textarea-${key}`}
                        value={getEditedText(key, msg)}
                        onChange={(e) => handleTextChange(key, e.target.value)}
                        rows={Math.min(
                          12,
                          Math.max(3, getEditedText(key, msg).split("\n").length + 1)
                        )}
                        className="font-mono text-sm resize-y"
                      />

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(msg)}
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

                        {customized && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReset(msg)}
                            disabled={isSaving}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            Reset to Default
                          </Button>
                        )}
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
