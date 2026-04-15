"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { parseUtilityBillCSV } from "@/lib/bulk-import-utility-bills"
import type { MatchedBill, ParsedBill } from "@/lib/bulk-import-utility-bills"
import { BROADCAST_LIMITS } from "@/lib/supabase"
import {
    Upload,
    FileText,
    ImageIcon,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Send,
} from "lucide-react"

type Step = "upload" | "preview" | "sending" | "complete"

interface SendResult {
    houseNo: string
    phone: string
    success: boolean
    error?: string
}

interface UtilityBillModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function UtilityBillBroadcastModal({ open, onOpenChange }: UtilityBillModalProps) {
    const { toast } = useToast()
    const csvInputRef = React.useRef<HTMLInputElement>(null)
    const imageInputRef = React.useRef<HTMLInputElement>(null)

    const [step, setStep] = React.useState<Step>("upload")
    const [csvFile, setCsvFile] = React.useState<File | null>(null)
    const [imageFiles, setImageFiles] = React.useState<File[]>([])
    const [isParsing, setIsParsing] = React.useState(false)

    // Parse results
    const [matched, setMatched] = React.useState<MatchedBill[]>([])
    const [unmatched, setUnmatched] = React.useState<ParsedBill[]>([])
    const [parseErrors, setParseErrors] = React.useState<{ row: number; message: string }[]>([])

    // Sending state
    const [isSending, setIsSending] = React.useState(false)
    const [sendProgress, setSendProgress] = React.useState(0)
    const [sendResults, setSendResults] = React.useState<SendResult[]>([])
    const [sendPhase, setSendPhase] = React.useState<"uploading" | "sending">("uploading")
    const [uploadProgress, setUploadProgress] = React.useState(0)

    const estimatedMinutes = React.useMemo(() => {
        const totalMs =
            matched.length * BROADCAST_LIMITS.MESSAGE_DELAY_MS +
            Math.floor(matched.length / BROADCAST_LIMITS.BATCH_SIZE) * BROADCAST_LIMITS.BATCH_DELAY_MS
        return Math.ceil(totalMs / 60000)
    }, [matched.length])

    const resetState = () => {
        setStep("upload")
        setCsvFile(null)
        setImageFiles([])
        setMatched([])
        setUnmatched([])
        setParseErrors([])
        setSendResults([])
        setSendProgress(0)
        setUploadProgress(0)
        setIsSending(false)
    }

    const handleClose = (open: boolean) => {
        if (!open && isSending) return // block close while sending
        if (!open) resetState()
        onOpenChange(open)
    }

    const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) setCsvFile(file)
        e.target.value = ""
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        setImageFiles(prev => {
            const existing = new Map(prev.map(f => [f.name, f]))
            for (const f of files) existing.set(f.name, f)
            return Array.from(existing.values())
        })
        e.target.value = ""
    }

    const handleParse = async () => {
        if (!csvFile) return
        setIsParsing(true)
        try {
            const result = await parseUtilityBillCSV(csvFile, imageFiles)
            setMatched(result.matched)
            setUnmatched(result.unmatched)
            setParseErrors(result.errors)
            setStep("preview")
        } catch (err) {
            toast({ title: "Parse failed", description: String(err), variant: "destructive" })
        } finally {
            setIsParsing(false)
        }
    }

    const handleSend = async () => {
        if (matched.length === 0) return
        setStep("sending")
        setIsSending(true)
        setSendPhase("uploading")
        setSendProgress(0)
        setUploadProgress(0)

        try {
            // Step 1: Upload all images
            const formData = new FormData()
            for (const bill of matched) {
                formData.append("images", bill.file)
            }

            const uploadRes = await fetch("/api/utility-bills/upload", {
                method: "POST",
                body: formData,
            })
            const uploadData = await uploadRes.json()

            if (!uploadData.success) {
                toast({ title: "Upload failed", description: uploadData.error, variant: "destructive" })
                setIsSending(false)
                setStep("preview")
                return
            }

            const urlMap: Record<string, { url: string; error?: string }> = uploadData.results

            // Build recipients — only those whose upload succeeded
            const recipients = matched
                .map(bill => ({
                    phone: bill.phone,
                    houseNo: bill.houseNo,
                    billUrl: urlMap[bill.file.name]?.url || "",
                }))
                .filter(r => !!r.billUrl)

            const uploadFailed = matched.filter(b => !urlMap[b.file.name]?.url || urlMap[b.file.name]?.error)
            if (uploadFailed.length > 0) {
                toast({
                    title: `${uploadFailed.length} image(s) failed to upload`,
                    description: "Sending to remaining recipients.",
                    variant: "destructive",
                })
            }

            setUploadProgress(100)
            setSendPhase("sending")

            if (recipients.length === 0) {
                toast({ title: "No bills to send", description: "All image uploads failed.", variant: "destructive" })
                setIsSending(false)
                setStep("preview")
                return
            }

            // Step 2: Send messages
            const sendRes = await fetch("/api/utility-bills/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipients }),
            })
            const sendData = await sendRes.json()

            if (!sendData.success && !sendData.results) {
                toast({ title: "Send failed", description: sendData.error, variant: "destructive" })
                setIsSending(false)
                setStep("preview")
                return
            }

            setSendResults(sendData.results || [])
            setSendProgress(100)
            setStep("complete")
        } catch (err) {
            toast({ title: "Error", description: String(err), variant: "destructive" })
            setIsSending(false)
            setStep("preview")
        } finally {
            setIsSending(false)
        }
    }

    const successCount = sendResults.filter(r => r.success).length
    const failedCount = sendResults.filter(r => !r.success).length

    const showSoftWarning =
        matched.length > BROADCAST_LIMITS.SOFT_RECIPIENT_LIMIT &&
        matched.length <= BROADCAST_LIMITS.HARD_RECIPIENT_LIMIT
    const showHardWarning = matched.length > BROADCAST_LIMITS.HARD_RECIPIENT_LIMIT

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-manzhil-teal" />
                        Send Utility Bills
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV and bill images to send personalized utility bills via WhatsApp.
                    </DialogDescription>
                </DialogHeader>

                {/* Step indicator */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    {(["upload", "preview", "sending", "complete"] as Step[]).map((s, i) => (
                        <React.Fragment key={s}>
                            <span className={step === s ? "text-manzhil-teal font-medium" : ""}>
                                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                            </span>
                            {i < 3 && <span>›</span>}
                        </React.Fragment>
                    ))}
                </div>

                <div className="flex-1 overflow-hidden">

                    {/* ── STEP 1: UPLOAD ── */}
                    {step === "upload" && (
                        <div className="space-y-4 py-2">
                            {/* CSV upload */}
                            <div
                                className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-manzhil-teal transition-colors"
                                onClick={() => csvInputRef.current?.click()}
                            >
                                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm font-medium text-gray-700">
                                    {csvFile ? csvFile.name : "Click to upload CSV"}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Columns: house_no, phone_number, image_filename
                                </p>
                                {csvFile && (
                                    <Badge variant="secondary" className="mt-2">
                                        {csvFile.name}
                                    </Badge>
                                )}
                                <input
                                    ref={csvInputRef}
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={handleCsvSelect}
                                />
                            </div>

                            {/* Image files upload */}
                            <div
                                className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-manzhil-teal transition-colors"
                                onClick={() => imageInputRef.current?.click()}
                            >
                                <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm font-medium text-gray-700">
                                    Click to upload bill images
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Select all bill images at once. Filenames must match CSV.
                                </p>
                                {imageFiles.length > 0 && (
                                    <Badge variant="secondary" className="mt-2">
                                        {imageFiles.length} image{imageFiles.length !== 1 ? "s" : ""} selected
                                    </Badge>
                                )}
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleImageSelect}
                                />
                            </div>

                            {/* CSV format guide */}
                            <Alert>
                                <AlertDescription className="text-xs font-mono">
                                    house_no,phone_number,image_filename<br />
                                    A-101,+923001234567,A-101-march.jpg<br />
                                    B-202,+923009876543,B-202-march.jpg
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    {/* ── STEP 2: PREVIEW ── */}
                    {step === "preview" && (
                        <div className="space-y-3 flex flex-col h-full">
                            {/* Summary badges */}
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {matched.length} matched
                                </Badge>
                                {unmatched.length > 0 && (
                                    <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        {unmatched.length} unmatched
                                    </Badge>
                                )}
                                {parseErrors.length > 0 && (
                                    <Badge variant="outline" className="border-orange-300 text-orange-700">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {parseErrors.length} error{parseErrors.length !== 1 ? "s" : ""}
                                    </Badge>
                                )}
                            </div>

                            {/* Limit warnings */}
                            {showHardWarning && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        {matched.length} recipients exceeds the hard limit of {BROADCAST_LIMITS.HARD_RECIPIENT_LIMIT}. Estimated time: ~{estimatedMinutes} min.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {showSoftWarning && (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        {matched.length} recipients is above the soft limit of {BROADCAST_LIMITS.SOFT_RECIPIENT_LIMIT}. Estimated time: ~{estimatedMinutes} min.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Errors */}
                            {parseErrors.length > 0 && (
                                <Alert variant="destructive">
                                    <AlertDescription>
                                        {parseErrors.map((e, i) => (
                                            <div key={i}>{e.row > 0 ? `Row ${e.row}: ` : ""}{e.message}</div>
                                        ))}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <ScrollArea className="flex-1 border rounded-md" style={{ height: 300 }}>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>House No.</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Image File</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {matched.map((bill, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-mono text-xs">{bill.houseNo}</TableCell>
                                                <TableCell className="font-mono text-xs">{bill.phone}</TableCell>
                                                <TableCell className="text-xs text-gray-600">{bill.imageFilename}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="border-green-300 text-green-700 text-xs">
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                        Matched
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {unmatched.map((bill, i) => (
                                            <TableRow key={`u${i}`} className="bg-red-50">
                                                <TableCell className="font-mono text-xs">{bill.houseNo}</TableCell>
                                                <TableCell className="font-mono text-xs">{bill.phone}</TableCell>
                                                <TableCell className="text-xs text-red-600">{bill.imageFilename}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="border-red-300 text-red-700 text-xs">
                                                        <XCircle className="h-3 w-3 mr-1" />
                                                        No image
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}

                    {/* ── STEP 3: SENDING ── */}
                    {step === "sending" && (
                        <div className="space-y-4 py-4">
                            <div className="text-center space-y-2">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-manzhil-teal" />
                                <p className="font-medium">
                                    {sendPhase === "uploading" ? "Uploading bill images…" : "Sending WhatsApp messages…"}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {sendPhase === "uploading"
                                        ? "Saving images to storage"
                                        : `Sending to ${matched.length} resident${matched.length !== 1 ? "s" : ""}. Estimated: ~${estimatedMinutes} min.`
                                    }
                                </p>
                            </div>
                            <Progress value={sendPhase === "uploading" ? uploadProgress : sendProgress} className="h-2" />
                            <p className="text-xs text-center text-gray-400">Do not close this window.</p>
                        </div>
                    )}

                    {/* ── STEP 4: COMPLETE ── */}
                    {step === "complete" && (
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {successCount} sent
                                </Badge>
                                {failedCount > 0 && (
                                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        {failedCount} failed
                                    </Badge>
                                )}
                            </div>

                            <ScrollArea className="border rounded-md" style={{ height: 300 }}>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>House No.</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sendResults.map((r, i) => (
                                            <TableRow key={i} className={r.success ? "" : "bg-red-50"}>
                                                <TableCell className="font-mono text-xs">{r.houseNo}</TableCell>
                                                <TableCell className="font-mono text-xs">{r.phone}</TableCell>
                                                <TableCell>
                                                    {r.success ? (
                                                        <Badge variant="outline" className="border-green-300 text-green-700 text-xs">
                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                            Sent
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="border-red-300 text-red-700 text-xs">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Failed
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                {/* Footer buttons */}
                <DialogFooter className="pt-2">
                    {step === "upload" && (
                        <>
                            <Button variant="outline" onClick={() => handleClose(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleParse}
                                disabled={!csvFile || isParsing}
                            >
                                {isParsing ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing…</>
                                ) : (
                                    <><ChevronRight className="h-4 w-4 mr-2" />Preview</>
                                )}
                            </Button>
                        </>
                    )}

                    {step === "preview" && (
                        <>
                            <Button variant="outline" onClick={() => setStep("upload")}>
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                            <Button
                                onClick={handleSend}
                                disabled={matched.length === 0}
                                className="bg-manzhil-teal hover:bg-manzhil-teal/90"
                            >
                                <Send className="h-4 w-4 mr-2" />
                                Send to {matched.length} resident{matched.length !== 1 ? "s" : ""}
                            </Button>
                        </>
                    )}

                    {step === "complete" && (
                        <Button onClick={() => handleClose(false)}>
                            Done
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
