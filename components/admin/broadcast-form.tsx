"use client"

import { useState, useMemo } from "react"
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
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useAdmin } from "@/app/admin/layout"
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
} from "lucide-react"
import type { Profile } from "@/lib/supabase"

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

export function BroadcastForm() {
    const { profiles } = useAdmin()
    const { toast } = useToast()

    // Message variables (matches template: {{1}} = Title, {{2}} = Body)
    const [variables, setVariables] = useState<Record<string, string>>({
        "1": "",
        "2": "",
    })

    // Filters
    const [blockFilter, setBlockFilter] = useState<string>("all")
    const [maintenanceFilter, setMaintenanceFilter] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

    // Get unique blocks from profiles
    const blocks = useMemo(() => {
        const uniqueBlocks = new Set<string>()
        profiles.forEach(p => {
            if (p.building_block) {
                uniqueBlocks.add(p.building_block)
            }
        })
        return Array.from(uniqueBlocks).sort()
    }, [profiles])

    // Filter profiles
    const filteredProfiles = useMemo(() => {
        return profiles.filter(p => {
            // Only active profiles
            if (!p.is_active) return false

            // Block filter
            if (blockFilter !== "all" && p.building_block !== blockFilter) {
                return false
            }

            // Maintenance filter
            if (maintenanceFilter === "paid" && !p.maintenance_paid) {
                return false
            }
            if (maintenanceFilter === "unpaid" && p.maintenance_paid) {
                return false
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                return (
                    p.name.toLowerCase().includes(query) ||
                    p.apartment_number.toLowerCase().includes(query) ||
                    p.phone_number.includes(query)
                )
            }

            return true
        })
    }, [profiles, blockFilter, maintenanceFilter, searchQuery])

    // Selection handlers
    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const selectAll = () => {
        const newSelected = new Set(filteredProfiles.map(p => p.id))
        setSelectedIds(newSelected)
    }

    const clearSelection = () => {
        setSelectedIds(new Set())
    }

    // Check if message is valid
    const isMessageValid = variables["1"].trim() !== "" || variables["2"].trim() !== ""

    // Handle send broadcast
    const handleSend = async () => {
        setShowConfirmation(false)

        const recipientIds = Array.from(selectedIds)

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

    return (
        <div className="space-y-6">
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
                        Filter and select residents to receive the broadcast
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <Select value={blockFilter} onValueChange={setBlockFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="All Blocks" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Blocks</SelectItem>
                                {blocks.map(block => (
                                    <SelectItem key={block} value={block}>
                                        {block}
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
                                placeholder="Search by name, apartment, phone..."
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
                                Select All ({filteredProfiles.length})
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
                            {selectedIds.size} of {filteredProfiles.length} selected
                        </Badge>
                    </div>

                    {/* Recipients Table */}
                    <ScrollArea className="h-[300px] border rounded-lg">
                        <Table>
                            <TableHeader className="sticky top-0 bg-white z-10">
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={selectedIds.size === filteredProfiles.length && filteredProfiles.length > 0}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    selectAll()
                                                } else {
                                                    clearSelection()
                                                }
                                            }}
                                        />
                                    </TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Apartment</TableHead>
                                    <TableHead>Block</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProfiles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            No residents found matching your filters
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProfiles.map((profile) => (
                                        <TableRow
                                            key={profile.id}
                                            className="cursor-pointer hover:bg-manzhil-teal/5"
                                            onClick={() => toggleSelect(profile.id)}
                                        >
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedIds.has(profile.id)}
                                                    onCheckedChange={() => toggleSelect(profile.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{profile.name}</TableCell>
                                            <TableCell>{profile.apartment_number}</TableCell>
                                            <TableCell>{profile.building_block || "-"}</TableCell>
                                            <TableCell>
                                                {profile.maintenance_paid ? (
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
                                    ))
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
                        disabled={selectedIds.size === 0 || !isMessageValid}
                        onClick={() => setShowConfirmation(true)}
                    >
                        <Send className="h-5 w-5 mr-2" />
                        Send Broadcast ({selectedIds.size})
                    </Button>
                    {!isMessageValid && (
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
                            You are about to send a broadcast message to {selectedIds.size} recipients.
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                            <p><strong>Title:</strong> {variables["1"] || "(empty)"}</p>
                            <p><strong>Body:</strong> {variables["2"] || "(empty)"}</p>
                        </div>
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
                            Send to {selectedIds.size} Recipients
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
