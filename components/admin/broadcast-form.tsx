"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useAdmin } from "@/app/admin/layout"
import { BROADCAST_LIMITS } from "@/lib/supabase"
import {
    Send,
    Users,
    MessageSquare,
    Search,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertCircle,
    Download,
    Clock,
    AlertTriangle,
    Info,
    Timer,
    Building,
} from "lucide-react"

interface BroadcastResult {
    recipientId: string
    name: string
    phone: string
    apartment: string
    success: boolean
    error?: string
}

interface SendingState {
    isOpen: boolean
    isSending: boolean
    progress: number
    total: number
    sent: number
    success: number
    failed: number
    results: BroadcastResult[]
    isComplete: boolean
}

interface UsageStats {
    messagesToday: number
    dailyLimit: number
    remaining: number
    percentUsed: number
    lastBroadcastAt: string | null
    cooldownEndsAt: string | null
    canSend: boolean
    cooldownRemaining: number
}

export function BroadcastForm() {
    const { units } = useAdmin()
    const { toast } = useToast()

    // Message variables (matches template: {{1}} = Title, {{2}} = Body)
    const [variables, setVariables] = useState<Record<string, string>>({
        "1": "",
        "2": "",
    })

    // Filters
    const [floorFilter, setFloorFilter] = useState<string>("all")
    const [maintenanceFilter, setMaintenanceFilter] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")

    // Selection (unit IDs)
    const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set())

    // Usage stats
    const [usage, setUsage] = useState<UsageStats | null>(null)
    const [usageLoading, setUsageLoading] = useState(true)
    const [cooldownSeconds, setCooldownSeconds] = useState(0)

    // Sending state
    const [sendingState, setSendingState] = useState<SendingState>({
        isOpen: false,
        isSending: false,
        progress: 0,
        total: 0,
        sent: 0,
        success: 0,
        failed: 0,
        results: [],
        isComplete: false,
    })

    // Confirmation dialog
    const [showConfirmation, setShowConfirmation] = useState(false)

    // Fetch usage stats
    const fetchUsage = useCallback(async () => {
        try {
            const response = await fetch("/api/broadcast/usage")
            if (response.ok) {
                const data = await response.json()
                setUsage(data)
                setCooldownSeconds(data.cooldownRemaining || 0)
            }
        } catch (error) {
            console.error("Failed to fetch usage:", error)
        } finally {
            setUsageLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchUsage()
    }, [fetchUsage])

    // Cooldown countdown timer
    useEffect(() => {
        if (cooldownSeconds <= 0) return

        const timer = setInterval(() => {
            setCooldownSeconds(prev => {
                if (prev <= 1) {
                    fetchUsage() // Refresh usage when cooldown ends
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [cooldownSeconds, fetchUsage])

    // Get unique floors from units
    const floors = useMemo(() => {
        const uniqueFloors = new Set<string>()
        units.forEach(u => {
            if (u.floor_number) {
                uniqueFloors.add(u.floor_number)
            }
        })
        return Array.from(uniqueFloors).sort()
    }, [units])

    // Filter units
    const filteredUnits = useMemo(() => {
        return units.filter(u => {
            // Floor filter
            if (floorFilter !== "all" && u.floor_number !== floorFilter) {
                return false
            }

            // Maintenance filter
            if (maintenanceFilter === "paid" && !u.maintenance_paid) {
                return false
            }
            if (maintenanceFilter === "unpaid" && u.maintenance_paid) {
                return false
            }

            // Search filter (apartment number or resident name)
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                const matchesApartment = u.apartment_number.toLowerCase().includes(query)
                const matchesResident = u.profiles?.some(p =>
                    p.is_active && p.name.toLowerCase().includes(query)
                )
                return matchesApartment || matchesResident
            }

            return true
        })
    }, [units, floorFilter, maintenanceFilter, searchQuery])

    // Expand selected unit IDs to active profile IDs
    const selectedRecipientIds = useMemo(() => {
        const ids = new Set<string>()
        units.forEach(u => {
            if (selectedUnitIds.has(u.id)) {
                u.profiles?.forEach(p => {
                    if (p.is_active) ids.add(p.id)
                })
            }
        })
        return ids
    }, [units, selectedUnitIds])

    // Calculate estimated send time
    const estimatedSendTime = useMemo(() => {
        const count = selectedRecipientIds.size
        if (count === 0) return null

        // Calculate time based on rate limiting
        const batchCount = Math.ceil(count / BROADCAST_LIMITS.BATCH_SIZE)
        const messageDelayTotal = (count - 1) * (BROADCAST_LIMITS.MESSAGE_DELAY_MS / 1000)
        const batchDelayTotal = Math.max(0, batchCount - 1) * (BROADCAST_LIMITS.BATCH_DELAY_MS / 1000)
        const totalSeconds = messageDelayTotal + batchDelayTotal

        if (totalSeconds < 60) {
            return `~${Math.ceil(totalSeconds)} seconds`
        } else {
            const minutes = Math.ceil(totalSeconds / 60)
            return `~${minutes} minute${minutes > 1 ? 's' : ''}`
        }
    }, [selectedRecipientIds.size])

    // Check warnings
    const recipientWarning = useMemo(() => {
        const count = selectedRecipientIds.size
        if (count === 0) return null

        if (usage && count > usage.remaining) {
            return {
                type: "error" as const,
                message: `Exceeds daily limit. Only ${usage.remaining} messages remaining today.`
            }
        }

        if (count > BROADCAST_LIMITS.HARD_RECIPIENT_LIMIT) {
            return {
                type: "warning" as const,
                message: `Large broadcast (${count} recipients). Messages will be sent in batches over ${estimatedSendTime}.`
            }
        }

        if (count > BROADCAST_LIMITS.SOFT_RECIPIENT_LIMIT) {
            return {
                type: "info" as const,
                message: `${count} recipients selected. Estimated send time: ${estimatedSendTime}.`
            }
        }

        return null
    }, [selectedRecipientIds.size, usage, estimatedSendTime])

    // Selection handlers (unit-based)
    const toggleSelect = (unitId: string) => {
        const newSelected = new Set(selectedUnitIds)
        if (newSelected.has(unitId)) {
            newSelected.delete(unitId)
        } else {
            newSelected.add(unitId)
        }
        setSelectedUnitIds(newSelected)
    }

    const selectAll = () => {
        const newSelected = new Set(filteredUnits.map(u => u.id))
        setSelectedUnitIds(newSelected)
    }

    const clearSelection = () => {
        setSelectedUnitIds(new Set())
    }

    // Check if message is valid
    const isMessageValid = variables["1"].trim() !== "" || variables["2"].trim() !== ""

    // Check if can send
    const canSend = useMemo(() => {
        if (selectedRecipientIds.size === 0) return false
        if (!isMessageValid) return false
        if (cooldownSeconds > 0) return false
        if (usage && selectedRecipientIds.size > usage.remaining) return false
        return true
    }, [selectedRecipientIds.size, isMessageValid, cooldownSeconds, usage])

    // Handle send broadcast
    const handleSend = async () => {
        setShowConfirmation(false)

        const recipientIds = Array.from(selectedRecipientIds)

        setSendingState({
            isOpen: true,
            isSending: true,
            progress: 0,
            total: recipientIds.length,
            sent: 0,
            success: 0,
            failed: 0,
            results: [],
            isComplete: false,
        })

        try {
            const response = await fetch("/api/broadcast/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    variables,
                    recipientIds,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to send broadcast")
            }

            setSendingState(prev => ({
                ...prev,
                isSending: false,
                isComplete: true,
                progress: 100,
                sent: data.summary.total,
                success: data.summary.success,
                failed: data.summary.failed,
                results: data.results,
            }))

            toast({
                title: "Broadcast Complete",
                description: `Sent ${data.summary.success} messages successfully`,
            })

            // Refresh usage stats after successful broadcast
            fetchUsage()
        } catch (error) {
            console.error("Broadcast error:", error)
            setSendingState(prev => ({
                ...prev,
                isSending: false,
                isComplete: true,
            }))
            toast({
                title: "Broadcast Failed",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive",
            })
        }
    }

    // Download results as CSV
    const downloadResults = () => {
        const csv = [
            ["Name", "Apartment", "Phone", "Status", "Error"].join(","),
            ...sendingState.results.map(r => [
                `"${r.name}"`,
                r.apartment,
                r.phone,
                r.success ? "Sent" : "Failed",
                r.error ? `"${r.error}"` : "",
            ].join(","))
        ].join("\n")

        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `broadcast-results-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Close sending dialog
    const closeSendingDialog = () => {
        if (!sendingState.isSending) {
            setSendingState({
                isOpen: false,
                isSending: false,
                progress: 0,
                total: 0,
                sent: 0,
                success: 0,
                failed: 0,
                results: [],
                isComplete: false,
            })
        }
    }

    // Format cooldown time
    const formatCooldown = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="space-y-6">
            {/* Usage Stats Card */}
            <Card className="border-0 shadow-lg shadow-manzhil-teal/10">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-manzhil-dark text-base">
                        <Clock className="h-4 w-4 text-manzhil-teal" />
                        Daily Usage
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {usageLoading ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-manzhil-teal" />
                        </div>
                    ) : usage ? (
                        <>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Messages sent today</span>
                                    <span className="font-medium">{usage.messagesToday} of {usage.dailyLimit}</span>
                                </div>
                                <Progress value={usage.percentUsed} className="h-2" />
                                <p className="text-xs text-gray-500">
                                    {usage.remaining} messages remaining
                                </p>
                            </div>

                            {cooldownSeconds > 0 && (
                                <Alert variant="destructive" className="py-2">
                                    <Timer className="h-4 w-4" />
                                    <AlertTitle className="text-sm">Cooldown Active</AlertTitle>
                                    <AlertDescription className="text-xs">
                                        Please wait {formatCooldown(cooldownSeconds)} before sending another broadcast.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {selectedUnitIds.size > 0 && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Building className="h-4 w-4" />
                                        <span>{selectedUnitIds.size} units ({selectedRecipientIds.size} recipients)</span>
                                    </div>
                                    {estimatedSendTime && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Timer className="h-4 w-4" />
                                            <span>Estimated time: {estimatedSendTime}</span>
                                        </div>
                                    )}
                                    {usage.remaining >= selectedRecipientIds.size ? (
                                        <div className="flex items-center gap-2 text-green-600">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span>Within daily limit</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-red-600">
                                            <XCircle className="h-4 w-4" />
                                            <span>Exceeds daily limit</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-gray-500">Unable to load usage stats</p>
                    )}
                </CardContent>
            </Card>

            {/* Message Section */}
            <Card className="border-0 shadow-lg shadow-manzhil-teal/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-manzhil-dark">
                        <MessageSquare className="h-5 w-5 text-manzhil-teal" />
                        Message
                    </CardTitle>
                    <CardDescription>
                        Fill in the placeholder values for your announcement
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="var1">Title</Label>
                        <Input
                            id="var1"
                            placeholder="Building Maintenance Notice"
                            value={variables["1"]}
                            onChange={(e) => setVariables(v => ({ ...v, "1": e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="var2">Body</Label>
                        <Textarea
                            id="var2"
                            placeholder="Water supply will be off on Dec 20, 2025 from 10 AM to 2 PM for tank cleaning."
                            rows={4}
                            value={variables["2"]}
                            onChange={(e) => setVariables(v => ({ ...v, "2": e.target.value }))}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Recipients Section */}
            <Card className="border-0 shadow-lg shadow-manzhil-teal/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-manzhil-dark">
                        <Users className="h-5 w-5 text-manzhil-teal" />
                        Recipients
                    </CardTitle>
                    <CardDescription>
                        Filter and select units to broadcast to all active residents
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <Select value={floorFilter} onValueChange={setFloorFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="All Floors" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Floors</SelectItem>
                                {floors.map(floor => (
                                    <SelectItem key={floor} value={floor}>
                                        Floor {floor}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by apartment or resident name..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Selection Controls */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={selectAll}
                                className="border-manzhil-teal/20 text-manzhil-teal hover:bg-manzhil-teal/5"
                            >
                                Select All ({filteredUnits.length})
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearSelection}
                                className="border-gray-200"
                            >
                                Clear Selection
                            </Button>
                        </div>
                        <Badge variant="secondary" className="bg-manzhil-teal/10 text-manzhil-dark">
                            {selectedUnitIds.size} units ({selectedRecipientIds.size} recipients)
                        </Badge>
                    </div>

                    {/* Recipient Warning */}
                    {recipientWarning && (
                        <Alert
                            variant={recipientWarning.type === "error" ? "destructive" : "default"}
                            className={
                                recipientWarning.type === "warning"
                                    ? "border-amber-500 bg-amber-50 text-amber-900"
                                    : recipientWarning.type === "info"
                                        ? "border-blue-500 bg-blue-50 text-blue-900"
                                        : ""
                            }
                        >
                            {recipientWarning.type === "error" && <XCircle className="h-4 w-4" />}
                            {recipientWarning.type === "warning" && <AlertTriangle className="h-4 w-4" />}
                            {recipientWarning.type === "info" && <Info className="h-4 w-4" />}
                            <AlertDescription>{recipientWarning.message}</AlertDescription>
                        </Alert>
                    )}

                    {/* Units Table */}
                    <ScrollArea className="h-[300px] border rounded-lg">
                        <Table>
                            <TableHeader className="sticky top-0 bg-white z-10">
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={selectedUnitIds.size === filteredUnits.length && filteredUnits.length > 0}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    selectAll()
                                                } else {
                                                    clearSelection()
                                                }
                                            }}
                                        />
                                    </TableHead>
                                    <TableHead>Apartment</TableHead>
                                    <TableHead>Floor</TableHead>
                                    <TableHead>Residents</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUnits.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            No units found matching your filters
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUnits.map((unit) => {
                                        const activeResidents = unit.profiles?.filter(p => p.is_active) || []
                                        return (
                                            <TableRow
                                                key={unit.id}
                                                className="cursor-pointer hover:bg-manzhil-teal/5"
                                                onClick={() => toggleSelect(unit.id)}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedUnitIds.has(unit.id)}
                                                        onCheckedChange={() => toggleSelect(unit.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{unit.apartment_number}</TableCell>
                                                <TableCell>{unit.floor_number || "-"}</TableCell>
                                                <TableCell>
                                                    <span className="text-gray-600">{activeResidents.length}</span>
                                                </TableCell>
                                                <TableCell>
                                                    {unit.maintenance_paid ? (
                                                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                                                            Paid
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-red-100 text-red-700">
                                                            Unpaid
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Send Button */}
            <Card className="border-0 shadow-lg shadow-manzhil-teal/10">
                <CardContent className="py-4">
                    <Button
                        className="w-full bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:opacity-90 text-white shadow-md"
                        size="lg"
                        disabled={!canSend}
                        onClick={() => setShowConfirmation(true)}
                    >
                        {cooldownSeconds > 0 ? (
                            <>
                                <Timer className="h-5 w-5 mr-2" />
                                Wait {formatCooldown(cooldownSeconds)}
                            </>
                        ) : (
                            <>
                                <Send className="h-5 w-5 mr-2" />
                                Send Broadcast ({selectedRecipientIds.size} recipients)
                            </>
                        )}
                    </Button>
                    {!isMessageValid && selectedUnitIds.size > 0 && (
                        <p className="text-center text-sm text-amber-600 mt-2 flex items-center justify-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            Please fill in at least one placeholder value
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            Confirm Broadcast
                        </DialogTitle>
                        <DialogDescription>
                            You are about to send a broadcast to {selectedUnitIds.size} units ({selectedRecipientIds.size} residents).
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                            <p><strong>Title:</strong> {variables["1"] || "(empty)"}</p>
                            <p><strong>Body:</strong> {variables["2"] || "(empty)"}</p>
                        </div>

                        {selectedRecipientIds.size > BROADCAST_LIMITS.HARD_RECIPIENT_LIMIT && (
                            <Alert variant="default" className="border-amber-500 bg-amber-50 text-amber-900">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Large Broadcast</AlertTitle>
                                <AlertDescription>
                                    Sending to {selectedRecipientIds.size} recipients will take approximately {estimatedSendTime}.
                                    Messages are rate-limited to protect your WhatsApp account.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-manzhil-teal hover:bg-manzhil-dark"
                            onClick={handleSend}
                        >
                            <Send className="h-4 w-4 mr-2" />
                            Send to {selectedRecipientIds.size} Recipients
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sending Progress Dialog */}
            <Dialog open={sendingState.isOpen} onOpenChange={closeSendingDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {sendingState.isSending ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin text-manzhil-teal" />
                                    Sending Broadcast...
                                </>
                            ) : sendingState.isComplete ? (
                                <>
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    Broadcast Complete!
                                </>
                            ) : null}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {sendingState.isSending && (
                            <>
                                <Progress value={sendingState.progress} className="h-2" />
                                <p className="text-center text-sm text-gray-500">
                                    Please wait while messages are being sent...
                                    <br />
                                    <span className="text-xs">
                                        (Rate limited to protect your WhatsApp account)
                                    </span>
                                </p>
                            </>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-green-50 rounded-lg p-3">
                                <div className="flex items-center justify-center gap-2 text-green-600">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span className="text-2xl font-bold">{sendingState.success}</span>
                                </div>
                                <p className="text-xs text-green-700 mt-1">Delivered</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                                <div className="flex items-center justify-center gap-2 text-red-600">
                                    <XCircle className="h-5 w-5" />
                                    <span className="text-2xl font-bold">{sendingState.failed}</span>
                                </div>
                                <p className="text-xs text-red-700 mt-1">Failed</p>
                            </div>
                        </div>

                        {sendingState.isComplete && sendingState.failed > 0 && (
                            <div className="border rounded-lg p-3 bg-red-50/50">
                                <p className="text-sm font-medium text-red-700 mb-2">Failed Recipients:</p>
                                <ScrollArea className="h-[100px]">
                                    {sendingState.results
                                        .filter(r => !r.success)
                                        .map((r, i) => (
                                            <div key={i} className="text-xs text-red-600 py-1">
                                                {r.name} ({r.apartment}): {r.error}
                                            </div>
                                        ))}
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                    {sendingState.isComplete && (
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button
                                variant="outline"
                                onClick={downloadResults}
                                className="w-full sm:w-auto"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download Report
                            </Button>
                            <Button
                                onClick={closeSendingDialog}
                                className="w-full sm:w-auto bg-manzhil-teal hover:bg-manzhil-dark"
                            >
                                Done
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
