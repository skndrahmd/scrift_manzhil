"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  History,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { formatDateTime } from "@/lib/date"
import { useToast } from "@/hooks/use-toast"

// ============================================
// Types
// ============================================

interface CronLog {
  id: string
  job_name: string
  status: "success" | "partial" | "failed" | "running"
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  records_processed: number
  records_succeeded: number
  records_failed: number
  result: Record<string, unknown> | null
  error_message: string | null
  created_at: string
}

interface WelcomeLog {
  id: string
  resident_id: string | null
  resident_name: string | null
  phone_number: string
  apartment_number: string | null
  status: "sent" | "failed" | "pending"
  error_message: string | null
  twilio_sid: string | null
  triggered_by: "bulk-import" | "manual" | "resend"
  triggered_by_user: string | null
  sent_at: string
  created_at: string
}

// ============================================
// Cron Logs Tab
// ============================================

function CronLogsTab() {
  const [logs, setLogs] = useState<CronLog[]>([])
  const [loading, setLoading] = useState(true)
  const [jobFilter, setJobFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (jobFilter !== "all") {
        params.set("job_name", jobFilter)
      }
      if (statusFilter !== "all") {
        params.set("status", statusFilter)
      }
      params.set("offset", String(page * pageSize))
      params.set("limit", String(pageSize))

      const res = await fetch(`/api/cron-logs?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch logs")
      }

      setLogs((data.logs as CronLog[]) || [])
      setTotalCount(data.total || 0)
    } catch (error) {
      console.error("Failed to fetch cron logs:", error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [jobFilter, statusFilter, page])

  function getStatusIcon(status: string) {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "partial":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return null
    }
  }

  function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "success":
        return "default"
      case "partial":
        return "secondary"
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }

  function formatDuration(ms: number | null): string {
    if (ms === null) return "—"
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  function getJobLabel(jobName: string): string {
    const labels: Record<string, string> = {
      "daily-reports": "Daily Reports",
      "maintenance-reminder": "Maintenance Reminder",
      "pending-complaints": "Pending Complaints",
      "booking-reminder": "Booking Reminder",
      "maintenance-confirmation": "Payment Confirmation",
    }
    return labels[jobName] || jobName
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={jobFilter} onValueChange={(v) => { setJobFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              <SelectItem value="daily-reports">Daily Reports</SelectItem>
              <SelectItem value="maintenance-reminder">Maintenance Reminder</SelectItem>
              <SelectItem value="pending-complaints">Pending Complaints</SelectItem>
              <SelectItem value="booking-reminder">Booking Reminder</SelectItem>
              <SelectItem value="maintenance-confirmation">Payment Confirmation</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchLogs}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-manzhil-teal" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No cron logs found
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Succeeded</TableHead>
                  <TableHead>Failed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-manzhil-teal/5">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-sm">{getJobLabel(log.job_name)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(log.status)}
                        <Badge variant={getStatusBadgeVariant(log.status)} className="text-xs capitalize">
                          {log.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(log.started_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDuration(log.duration_ms)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.records_processed}
                    </TableCell>
                    <TableCell className="text-sm text-green-600">
                      {log.records_succeeded}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.records_failed > 0 ? (
                        <span className="text-red-600">{log.records_failed}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// Welcome Logs Tab
// ============================================

function WelcomeLogsTab() {
  const [logs, setLogs] = useState<WelcomeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [triggerFilter, setTriggerFilter] = useState<string>("all")
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set())
  const [resending, setResending] = useState(false)
  const { toast } = useToast()
  const pageSize = 20

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.set("status", statusFilter)
      }
      if (triggerFilter !== "all") {
        params.set("triggered_by", triggerFilter)
      }
      params.set("offset", String(page * pageSize))
      params.set("limit", String(pageSize))

      const res = await fetch(`/api/welcome-logs?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch logs")
      }

      setLogs((data.logs as WelcomeLog[]) || [])
      setTotalCount(data.total || 0)
      setSelectedLogs(new Set())
    } catch (error) {
      console.error("Failed to fetch welcome logs:", error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [statusFilter, triggerFilter, page])

  function toggleLogSelection(id: string) {
    setSelectedLogs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleAllSelection() {
    const failedIds = logs.filter((l) => l.status === "failed").map((l) => l.id)
    if (selectedLogs.size === failedIds.length && failedIds.every((id) => selectedLogs.has(id))) {
      setSelectedLogs(new Set())
    } else {
      setSelectedLogs(new Set(failedIds))
    }
  }

  async function resendSelected() {
    if (selectedLogs.size === 0) return

    setResending(true)
    try {
      const res = await fetch("/api/residents/resend-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log_ids: Array.from(selectedLogs) }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend")
      }

      toast({
        title: "Resend Complete",
        description: `${data.results.succeeded} succeeded, ${data.results.failed} failed`,
      })

      fetchLogs()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resend",
        variant: "destructive",
      })
    } finally {
      setResending(false)
    }
  }

  function getTriggerIcon(trigger: string) {
    switch (trigger) {
      case "bulk-import":
        return <Users className="h-4 w-4" />
      case "manual":
        return <Send className="h-4 w-4" />
      case "resend":
        return <RefreshCw className="h-4 w-4" />
      default:
        return null
    }
  }

  function getTriggerLabel(trigger: string): string {
    const labels: Record<string, string> = {
      "bulk-import": "Bulk Import",
      "manual": "Manual",
      "resend": "Resend",
    }
    return labels[trigger] || trigger
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const failedCount = logs.filter((l) => l.status === "failed").length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={triggerFilter} onValueChange={(v) => { setTriggerFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Trigger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Triggers</SelectItem>
              <SelectItem value="bulk-import">Bulk Import</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="resend">Resend</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {selectedLogs.size > 0 && (
            <Button
              size="sm"
              onClick={resendSelected}
              disabled={resending}
              className="h-8"
            >
              {resending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Resend ({selectedLogs.size})
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-manzhil-teal" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No welcome message logs found
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={failedCount > 0 && selectedLogs.size === failedCount}
                      onChange={toggleAllSelection}
                      className="rounded border-gray-300"
                      title="Select all failed"
                    />
                  </TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trigger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className={`hover:bg-manzhil-teal/5 ${log.status === "failed" ? "bg-red-50/50" : ""}`}
                  >
                    <TableCell>
                      {log.status === "failed" && (
                        <input
                          type="checkbox"
                          checked={selectedLogs.has(log.id)}
                          onChange={() => toggleLogSelection(log.id)}
                          className="rounded border-gray-300"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDateTime(log.sent_at)}</TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">{log.resident_name || "Unknown"}</span>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{log.phone_number}</TableCell>
                    <TableCell>
                      {log.apartment_number ? (
                        <Badge variant="outline" className="text-xs">{log.apartment_number}</Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.status === "sent" ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Sent</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm">Failed</span>
                          </div>
                          {log.error_message && (
                            <span className="text-xs text-red-500 truncate max-w-[200px]" title={log.error_message}>
                              {log.error_message}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit text-xs">
                        {getTriggerIcon(log.triggered_by)}
                        <span>{getTriggerLabel(log.triggered_by)}</span>
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Page {page + 1} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// Main Logs Viewer Component
// ============================================

export function LogsViewer() {
  return (
    <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-manzhil-teal" />
          <span>System Logs</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cron" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="cron" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Cron Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="welcome" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span>Welcome Messages</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cron">
            <CronLogsTab />
          </TabsContent>
          <TabsContent value="welcome">
            <WelcomeLogsTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default LogsViewer
