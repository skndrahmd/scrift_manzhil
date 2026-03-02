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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  History,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  FileText,
  Bell,
  Check,
} from "lucide-react"
import { formatDateTime } from "@/lib/date"

interface NotificationLog {
  id: string
  unit_id: string | null
  profile_id: string | null
  payment_id: string | null
  notification_type: "invoice" | "reminder" | "confirmation"
  status: "sent" | "failed"
  error_message: string | null
  phone_number: string
  recipient_name: string | null
  amount: number | null
  month_year: string | null
  triggered_by: "cron" | "manual"
  triggered_by_user: string | null
  sent_at: string
  created_at: string
  units?: { apartment_number: string } | null
}

interface MaintenanceLogsTableProps {
  unitId?: string
  limit?: number
}

export function MaintenanceLogsTable({ unitId, limit = 50 }: MaintenanceLogsTableProps) {
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (unitId) {
        params.set("unitId", unitId)
      }
      if (typeFilter !== "all") {
        params.set("type", typeFilter)
      }
      if (statusFilter !== "all") {
        params.set("status", statusFilter)
      }
      params.set("limit", String(limit))

      const res = await fetch(`/api/maintenance/logs?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch logs")
      }

      setLogs((data.logs as NotificationLog[]) || [])
    } catch (error) {
      console.error("Failed to fetch logs:", error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [unitId, typeFilter, statusFilter, limit])

  function getTypeIcon(type: string) {
    switch (type) {
      case "invoice":
        return <FileText className="h-4 w-4" />
      case "reminder":
        return <Bell className="h-4 w-4" />
      case "confirmation":
        return <Check className="h-4 w-4" />
      default:
        return null
    }
  }

  function getTypeBadgeVariant(type: string): "default" | "secondary" | "outline" {
    switch (type) {
      case "invoice":
        return "default"
      case "reminder":
        return "secondary"
      case "confirmation":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-white">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-manzhil-teal" />
            <span>Notification History</span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="confirmation">Confirmation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
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
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-manzhil-teal" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No notification logs found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trigger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-manzhil-teal/5">
                    <TableCell className="text-sm">
                      {formatDateTime(log.sent_at)}
                    </TableCell>
                    <TableCell>
                      {log.units ? (
                        <Badge variant="outline" className="text-xs">
                          {log.units.apartment_number}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getTypeBadgeVariant(log.notification_type)}
                        className="flex items-center gap-1 w-fit"
                      >
                        {getTypeIcon(log.notification_type)}
                        <span className="capitalize">{log.notification_type}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {log.recipient_name || "Unknown"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {log.phone_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.amount ? (
                        <span className="text-sm">
                          Rs. {Number(log.amount).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
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
                            <span className="text-xs text-red-500 truncate max-w-[200px]">
                              {log.error_message}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={log.triggered_by === "cron" ? "outline" : "secondary"}
                        className="text-xs capitalize"
                      >
                        {log.triggered_by}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Modal wrapper for displaying logs in a dialog
export function MaintenanceLogsModal({ unitId }: { unitId?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          View Logs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notification History</DialogTitle>
        </DialogHeader>
        <MaintenanceLogsTable unitId={unitId} limit={100} />
      </DialogContent>
    </Dialog>
  )
}
