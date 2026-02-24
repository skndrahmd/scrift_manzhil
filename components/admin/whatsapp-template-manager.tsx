"use client"

import { useEffect, useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Loader2,
  Search,
  Plus,
  Save,
  Send,
  ChevronDown,
  ChevronRight,
  Zap,
  FileCode,
  Info,
  Trash2,
  Pencil,
  X,
  Copy,
  Check,
} from "lucide-react"
import Link from "next/link"

interface TemplateVariable {
  key: string
  label: string
  description: string
  example: string
}

interface WhatsAppTemplate {
  id: string
  template_key: string
  name: string
  description: string | null
  category: string
  template_sid: string | null
  env_var_name: string | null
  variables: TemplateVariable[]
  trigger_description: string | null
  trigger_source: string | null
  message_body_draft: string | null
  fallback_message: string | null
  is_active: boolean
  is_draft: boolean
  sort_order: number
  created_at: string
  updated_at: string
  updated_by: string | null
}

type GroupedTemplates = Record<string, WhatsAppTemplate[]>

const CATEGORY_LABELS: Record<string, string> = {
  account: "Account",
  maintenance: "Maintenance",
  booking: "Bookings",
  complaint: "Complaints",
  parcel: "Parcels",
  visitor: "Visitors",
  broadcast: "Broadcast",
  payment: "Payment",
  auth: "Auth",
  admin: "Admin",
}

const CATEGORY_ORDER = [
  "account",
  "maintenance",
  "booking",
  "complaint",
  "parcel",
  "visitor",
  "broadcast",
  "payment",
  "auth",
  "admin",
]

export function WhatsAppTemplateManager() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<GroupedTemplates>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingSids, setEditingSids] = useState<Record<string, string>>({})
  const [savingSids, setSavingSids] = useState<Set<string>>(new Set())

  // Dialog states
  const [testDialog, setTestDialog] = useState<WhatsAppTemplate | null>(null)
  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState<WhatsAppTemplate | null>(null)
  const [infoBannerOpen, setInfoBannerOpen] = useState(false)

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp-templates")
      if (!res.ok) throw new Error("Failed to fetch templates")
      const data = await res.json()
      setTemplates(data.templates || {})
    } catch {
      toast({
        title: "Error",
        description: "Failed to load WhatsApp templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleSidSave = async (templateKey: string) => {
    const newSid = editingSids[templateKey]
    if (newSid === undefined) return

    if (newSid && !newSid.startsWith("HX")) {
      toast({ title: "Invalid SID", description: "Template SID must start with HX", variant: "destructive" })
      return
    }

    setSavingSids((prev) => new Set(prev).add(templateKey))

    try {
      const res = await fetch(`/api/whatsapp-templates/${templateKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_sid: newSid || null }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save")
      }

      toast({ title: "Saved", description: "Template SID updated successfully" })
      setEditingSids((prev) => {
        const next = { ...prev }
        delete next[templateKey]
        return next
      })
      fetchTemplates()
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" })
    } finally {
      setSavingSids((prev) => {
        const next = new Set(prev)
        next.delete(templateKey)
        return next
      })
    }
  }

  const getFilteredTemplates = (category: string): WhatsAppTemplate[] => {
    const categoryTemplates = templates[category] || []
    if (!searchQuery.trim()) return categoryTemplates

    const q = searchQuery.toLowerCase()
    return categoryTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.template_key.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.trigger_description?.toLowerCase().includes(q)
    )
  }

  const availableCategories = CATEGORY_ORDER.filter(
    (cat) => templates[cat] && templates[cat].length > 0
  )

  // Also include any non-standard categories from the data
  const allCategories = [
    ...availableCategories,
    ...Object.keys(templates).filter((c) => !CATEGORY_ORDER.includes(c)),
  ]

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
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/settings"
            className="text-sm text-gray-500 hover:text-manzhil-teal flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Settings
          </Link>
          <h1 className="text-2xl font-medium text-manzhil-dark">
            WhatsApp Template Manager
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage Twilio Content Templates — view triggers, edit SIDs, test delivery, and create drafts
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Collapsible open={infoBannerOpen} onOpenChange={setInfoBannerOpen}>
        <Card className="border-blue-200 bg-blue-50/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer py-3">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Info className="h-4 w-4" />
                How WhatsApp Templates Work
                {infoBannerOpen ? (
                  <ChevronDown className="h-4 w-4 ml-auto" />
                ) : (
                  <ChevronRight className="h-4 w-4 ml-auto" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 text-sm text-blue-700 space-y-2">
              <p>
                Templates are required for messages sent <strong>outside WhatsApp&apos;s 24-hour session window</strong>.
                After a resident&apos;s last message, you have 24 hours to send freeform replies.
                Beyond that, only pre-approved Twilio Content Templates can be delivered.
              </p>
              <p>
                Each template has a <strong>Template SID</strong> (starts with HX) assigned by Twilio after Meta approves it.
                You can update SIDs here without changing code or environment variables.
              </p>
              <p>
                Use <strong>Test Send</strong> to verify a template delivers correctly before relying on it in production.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Action Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => setCreateDialog(true)}
          className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Category Tabs */}
      {allCategories.length === 0 ? (
        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
          <CardContent className="py-12 text-center text-gray-500">
            No templates found. Run the seed SQL to populate template data.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={allCategories[0]} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {allCategories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {CATEGORY_LABELS[cat] || cat}
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                  {(templates[cat] || []).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {allCategories.map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-4 space-y-4">
              {getFilteredTemplates(cat).length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  {searchQuery ? "No templates match your search" : "No templates in this category"}
                </p>
              ) : (
                getFilteredTemplates(cat).map((tmpl) => (
                  <TemplateCard
                    key={tmpl.id}
                    template={tmpl}
                    editingSid={editingSids[tmpl.template_key]}
                    isSaving={savingSids.has(tmpl.template_key)}
                    onSidChange={(val) =>
                      setEditingSids((prev) => ({ ...prev, [tmpl.template_key]: val }))
                    }
                    onSidSave={() => handleSidSave(tmpl.template_key)}
                    onSidCancel={() =>
                      setEditingSids((prev) => {
                        const next = { ...prev }
                        delete next[tmpl.template_key]
                        return next
                      })
                    }
                    onTestSend={() => setTestDialog(tmpl)}
                    onEdit={() => setEditDialog(tmpl)}
                  />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Dialogs */}
      {testDialog && (
        <TestSendDialog
          template={testDialog}
          onClose={() => setTestDialog(null)}
        />
      )}

      {createDialog && (
        <CreateTemplateDialog
          onClose={() => setCreateDialog(false)}
          onCreated={() => {
            setCreateDialog(false)
            fetchTemplates()
          }}
        />
      )}

      {editDialog && (
        <EditTemplateDialog
          template={editDialog}
          onClose={() => setEditDialog(null)}
          onSaved={() => {
            setEditDialog(null)
            fetchTemplates()
          }}
        />
      )}
    </div>
  )
}

// ─── Template Card ───────────────────────────────────────

function TemplateCard({
  template,
  editingSid,
  isSaving,
  onSidChange,
  onSidSave,
  onSidCancel,
  onTestSend,
  onEdit,
}: {
  template: WhatsAppTemplate
  editingSid: string | undefined
  isSaving: boolean
  onSidChange: (val: string) => void
  onSidSave: () => void
  onSidCancel: () => void
  onTestSend: () => void
  onEdit: () => void
}) {
  const [fallbackOpen, setFallbackOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyBody = async () => {
    if (!template.message_body_draft) return
    try {
      await navigator.clipboard.writeText(template.message_body_draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = template.message_body_draft
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isEditing = editingSid !== undefined
  const currentSid = isEditing ? editingSid : template.template_sid || ""

  return (
    <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-medium">
              {template.name}
            </CardTitle>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {template.template_key}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {template.is_draft && (
              <Badge variant="outline" className="border-purple-300 text-purple-600 text-[10px]">
                Draft
              </Badge>
            )}
            <Badge
              variant={template.is_active ? "default" : "secondary"}
              className={
                template.is_active
                  ? "bg-green-100 text-green-700 hover:bg-green-100 text-[10px]"
                  : "text-[10px]"
              }
            >
              {template.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge
              variant="outline"
              className={
                template.template_sid
                  ? "border-blue-300 text-blue-600 text-[10px]"
                  : "border-orange-300 text-orange-600 text-[10px]"
              }
            >
              {template.template_sid ? "Configured" : "No SID"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        {template.description && (
          <p className="text-sm text-gray-600">{template.description}</p>
        )}

        {/* Trigger info */}
        <div className="space-y-1.5">
          {template.trigger_description && (
            <div className="flex items-start gap-2 text-sm text-gray-500">
              <Zap className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
              <span>{template.trigger_description}</span>
            </div>
          )}
          {template.trigger_source && (
            <div className="flex items-start gap-2 text-sm text-gray-400">
              <FileCode className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <code className="text-xs">{template.trigger_source}</code>
            </div>
          )}
        </div>

        {/* SID field */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">Template SID</Label>
          <div className="flex items-center gap-2">
            <Input
              value={currentSid}
              onChange={(e) => onSidChange(e.target.value)}
              placeholder="HXabc123..."
              className="font-mono text-sm"
            />
            {isEditing && (
              <>
                <Button
                  size="sm"
                  onClick={onSidSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={onSidCancel}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
          {template.env_var_name && (
            <p className="text-[10px] text-gray-400">
              Env fallback: <code>{template.env_var_name}</code>
            </p>
          )}
        </div>

        {/* Variables table */}
        {template.variables && template.variables.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Variables</Label>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-500">#</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-500">Label</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-500 hidden sm:table-cell">Description</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-500">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {template.variables.map((v) => (
                    <tr key={v.key}>
                      <td className="px-3 py-1.5 font-mono text-gray-400">{v.key}</td>
                      <td className="px-3 py-1.5 font-medium">{v.label}</td>
                      <td className="px-3 py-1.5 text-gray-500 hidden sm:table-cell">{v.description}</td>
                      <td className="px-3 py-1.5 text-gray-400 font-mono">{v.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Suggested Template Body */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-500">Suggested Template Body</Label>
            <div className="flex items-center gap-1.5">
              {template.message_body_draft && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyBody}
                  className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-green-600" />
                      <span className="text-green-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={onEdit}
                className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </div>
          {template.message_body_draft ? (
            <pre className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto">
              {template.message_body_draft}
            </pre>
          ) : (
            <div className="p-3 border border-dashed border-gray-300 rounded-md text-xs text-gray-400 text-center">
              No suggested body added yet. Click Edit Details to add one.
            </div>
          )}
        </div>

        {/* Fallback message */}
        {template.fallback_message && (
          <Collapsible open={fallbackOpen} onOpenChange={setFallbackOpen}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
              {fallbackOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Fallback Message
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-2 p-3 bg-gray-50 rounded-md text-xs text-gray-600 whitespace-pre-wrap font-mono overflow-x-auto">
                {template.fallback_message}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onTestSend} disabled={!template.template_sid}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Test Send
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Test Send Dialog ────────────────────────────────────

function TestSendDialog({
  template,
  onClose,
}: {
  template: WhatsAppTemplate
  onClose: () => void
}) {
  const { toast } = useToast()
  const [phone, setPhone] = useState("")
  const [variables, setVariables] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const v of template.variables) {
      initial[v.key] = v.example
    }
    return initial
  })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; sid?: string; error?: string } | null>(null)

  const handleSend = async () => {
    if (!phone.trim()) {
      toast({ title: "Error", description: "Enter a phone number", variant: "destructive" })
      return
    }

    setSending(true)
    setResult(null)

    try {
      const res = await fetch("/api/whatsapp-templates/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_key: template.template_key,
          phone: phone.trim(),
          variables,
        }),
      })

      const data = await res.json()
      setResult(data)

      if (data.ok) {
        toast({ title: "Sent!", description: `Message SID: ${data.sid}` })
      }
    } catch {
      setResult({ ok: false, error: "Network error" })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Test Send: {template.name}</DialogTitle>
          <DialogDescription>
            Send a test message using this template to verify it works correctly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input
              placeholder="+923001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-[10px] text-gray-400">Include country code (e.g., +92 for Pakistan)</p>
          </div>

          {template.variables.length > 0 && (
            <div className="space-y-3">
              <Label>Template Variables</Label>
              {template.variables.map((v) => (
                <div key={v.key} className="space-y-1">
                  <Label className="text-xs text-gray-500">
                    {`{{${v.key}}}`} — {v.label}
                  </Label>
                  <Input
                    value={variables[v.key] || ""}
                    onChange={(e) =>
                      setVariables((prev) => ({ ...prev, [v.key]: e.target.value }))
                    }
                    placeholder={v.example}
                  />
                </div>
              ))}
            </div>
          )}

          {result && (
            <div
              className={`p-3 rounded-md text-sm ${
                result.ok
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {result.ok ? (
                <>Message sent successfully. SID: <code className="text-xs">{result.sid}</code></>
              ) : (
                <>Error: {result.error}</>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Create Template Dialog ──────────────────────────────

function CreateTemplateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [creating, setCreating] = useState(false)

  // Step 1
  const [name, setName] = useState("")
  const [templateKey, setTemplateKey] = useState("")
  const [category, setCategory] = useState("account")
  const [description, setDescription] = useState("")

  // Step 2
  const [variables, setVariables] = useState<TemplateVariable[]>([])

  // Step 3
  const [draftBody, setDraftBody] = useState("")

  // Step 4 — optional SID
  const [templateSid, setTemplateSid] = useState("")

  // Auto-generate key from name
  const handleNameChange = (val: string) => {
    setName(val)
    setTemplateKey(
      val
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "_")
        .replace(/^_+|_+$/g, "")
    )
  }

  const addVariable = () => {
    const nextKey = String(variables.length + 1)
    setVariables((prev) => [
      ...prev,
      { key: nextKey, label: "", description: "", example: "" },
    ])
  }

  const removeVariable = (idx: number) => {
    setVariables((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      // Re-number keys
      return next.map((v, i) => ({ ...v, key: String(i + 1) }))
    })
  }

  const updateVariable = (idx: number, field: keyof TemplateVariable, val: string) => {
    setVariables((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: val } : v))
    )
  }

  const handleCreate = async () => {
    if (!name.trim() || !templateKey.trim()) {
      toast({ title: "Error", description: "Name and key are required", variant: "destructive" })
      return
    }

    setCreating(true)

    try {
      const res = await fetch("/api/whatsapp-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_key: templateKey,
          name: name.trim(),
          description: description.trim() || null,
          category,
          variables,
          message_body_draft: draftBody.trim() || null,
          template_sid: templateSid.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create")
      }

      toast({ title: "Created", description: "Template draft created successfully" })
      onCreated()
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Step {step} of 4 — {step === 1 ? "Basic Info" : step === 2 ? "Variables" : step === 3 ? "Draft Body" : "Review"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input
                placeholder="e.g. Payment Receipt"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Template Key</Label>
              <Input
                placeholder="payment_receipt"
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                className="font-mono"
              />
              <p className="text-[10px] text-gray-400">Lowercase, underscores only</p>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe when and why this template is sent..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Define the numbered placeholder variables used in this template.
              Twilio uses {`{{1}}, {{2}}`}, etc.
            </p>
            {variables.map((v, idx) => (
              <div key={idx} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium font-mono">{`{{${v.key}}}`}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeVariable(idx)}
                    className="text-red-500 h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input
                  placeholder="Label (e.g. Resident Name)"
                  value={v.label}
                  onChange={(e) => updateVariable(idx, "label", e.target.value)}
                />
                <Input
                  placeholder="Description"
                  value={v.description}
                  onChange={(e) => updateVariable(idx, "description", e.target.value)}
                />
                <Input
                  placeholder="Example value"
                  value={v.example}
                  onChange={(e) => updateVariable(idx, "example", e.target.value)}
                />
              </div>
            ))}
            <Button variant="outline" onClick={addVariable} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Variable
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Draft the message body using Twilio&apos;s {`{{1}}, {{2}}`} syntax for variables.
              This is for your reference when submitting to Twilio Console.
            </p>
            <Textarea
              placeholder={`e.g. Hello {{1}}, your payment of Rs. {{2}} has been received.`}
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            {variables.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {variables.map((v) => (
                  <Badge
                    key={v.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100 text-xs"
                    onClick={() => setDraftBody((prev) => prev + `{{${v.key}}}`)}
                  >
                    {`{{${v.key}}}`} {v.label}
                  </Badge>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Template SID (optional)</Label>
              <Input
                placeholder="HXabc123... (paste if already approved)"
                value={templateSid}
                onChange={(e) => setTemplateSid(e.target.value)}
                className="font-mono"
              />
              <p className="text-[10px] text-gray-400">
                Leave empty to save as draft. Add later once Twilio/Meta approves it.
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Card className="border">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div><strong>Name:</strong> {name}</div>
                <div><strong>Key:</strong> <code className="text-xs">{templateKey}</code></div>
                <div><strong>Category:</strong> {CATEGORY_LABELS[category]}</div>
                {description && <div><strong>Description:</strong> {description}</div>}
                {variables.length > 0 && (
                  <div>
                    <strong>Variables:</strong> {variables.map((v) => `{{${v.key}}} ${v.label}`).join(", ")}
                  </div>
                )}
                {draftBody && (
                  <div>
                    <strong>Draft Body:</strong>
                    <pre className="mt-1 p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap font-mono">{draftBody}</pre>
                  </div>
                )}
                <div>
                  <strong>Status:</strong>{" "}
                  {templateSid ? "Active (SID provided)" : "Draft (no SID)"}
                </div>
              </CardContent>
            </Card>

            {!templateSid && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="pt-4 text-sm text-amber-800 space-y-1">
                  <p className="font-medium">Next steps after creating this draft:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-xs">
                    <li>Copy the body text to Twilio Console &gt; Content Template Builder</li>
                    <li>Submit for Meta approval (1-2 business days)</li>
                    <li>Once approved, paste the HX SID into the SID field on this card</li>
                  </ol>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && (!name.trim() || !templateKey.trim())}
                className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create {templateSid ? "Template" : "Draft"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Template Dialog ────────────────────────────────

function EditTemplateDialog({
  template,
  onClose,
  onSaved,
}: {
  template: WhatsAppTemplate
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description || "")
  const [triggerDescription, setTriggerDescription] = useState(template.trigger_description || "")
  const [triggerSource, setTriggerSource] = useState(template.trigger_source || "")
  const [fallbackMessage, setFallbackMessage] = useState(template.fallback_message || "")
  const [draftBody, setDraftBody] = useState(template.message_body_draft || "")
  const [isActive, setIsActive] = useState(template.is_active)
  const [variables, setVariables] = useState<TemplateVariable[]>(template.variables || [])

  const canDelete = template.is_draft && !template.env_var_name

  const addVariable = () => {
    const nextKey = String(variables.length + 1)
    setVariables((prev) => [
      ...prev,
      { key: nextKey, label: "", description: "", example: "" },
    ])
  }

  const removeVariable = (idx: number) => {
    setVariables((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      return next.map((v, i) => ({ ...v, key: String(i + 1) }))
    })
  }

  const updateVariable = (idx: number, field: keyof TemplateVariable, val: string) => {
    setVariables((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: val } : v))
    )
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const res = await fetch(`/api/whatsapp-templates/${template.template_key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          trigger_description: triggerDescription.trim() || null,
          trigger_source: triggerSource.trim() || null,
          fallback_message: fallbackMessage.trim() || null,
          message_body_draft: draftBody.trim() || null,
          is_active: isActive,
          variables,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save")
      }

      toast({ title: "Saved", description: "Template updated successfully" })
      onSaved()
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)

    try {
      const res = await fetch(`/api/whatsapp-templates/${template.template_key}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete")
      }

      toast({ title: "Deleted", description: "Template deleted successfully" })
      onSaved()
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit: {template.name}</DialogTitle>
          <DialogDescription>
            Update template details, variables, and metadata.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Trigger Description</Label>
            <Input
              value={triggerDescription}
              onChange={(e) => setTriggerDescription(e.target.value)}
              placeholder="When is this template sent?"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Trigger Source (code path)</Label>
            <Input
              value={triggerSource}
              onChange={(e) => setTriggerSource(e.target.value)}
              placeholder="lib/twilio/notifications/..."
              className="font-mono text-sm"
            />
          </div>

          {/* Variables */}
          <div className="space-y-2">
            <Label>Variables</Label>
            {variables.map((v, idx) => (
              <div key={idx} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium font-mono">{`{{${v.key}}}`}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeVariable(idx)}
                    className="text-red-500 h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input
                  placeholder="Label"
                  value={v.label}
                  onChange={(e) => updateVariable(idx, "label", e.target.value)}
                />
                <Input
                  placeholder="Description"
                  value={v.description}
                  onChange={(e) => updateVariable(idx, "description", e.target.value)}
                />
                <Input
                  placeholder="Example"
                  value={v.example}
                  onChange={(e) => updateVariable(idx, "example", e.target.value)}
                />
              </div>
            ))}
            <Button variant="outline" onClick={addVariable} size="sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Variable
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>Draft Message Body</Label>
            <Textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={4}
              className="font-mono text-sm"
              placeholder="Message body with {{1}} variables..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fallback Message</Label>
            <Textarea
              value={fallbackMessage}
              onChange={(e) => setFallbackMessage(e.target.value)}
              rows={4}
              className="font-mono text-sm"
              placeholder="Freeform fallback text..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="is-active" className="cursor-pointer">Active</Label>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                Delete Draft
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
