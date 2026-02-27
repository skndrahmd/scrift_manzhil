"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useAdmin } from "@/app/admin/layout"
import {
  parseFile,
  downloadTemplate,
  validateResidents,
  downloadErrorReport,
  normalizePhoneNumber,
} from "@/lib/bulk-import"
import type { ParsedResident, ValidationResult, ValidationSummary } from "@/lib/bulk-import"
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  XCircle,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react"

type Step = "upload" | "preview" | "importing" | "complete"

interface ImportProgress {
  total: number
  completed: number
  phase: "inserting" | "messaging"
}

interface ImportResults {
  imported: number
  skipped: number
  failed: number
  messagesSuccess: number
  messagesFailed: number
  errors: { row: number; name: string; error: string }[]
}

interface BulkImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: () => void
}

export function BulkImportModal({
  open,
  onOpenChange,
  onImportComplete,
}: BulkImportModalProps) {
  const { toast } = useToast()
  const { units } = useAdmin()

  // Build set of valid apartment numbers from units
  const validApartments = React.useMemo(() => {
    return new Set(
      units
        .filter(u => u.is_active !== false)
        .map(u => u.apartment_number.toUpperCase())
    )
  }, [units])

  // State
  const [step, setStep] = React.useState<Step>("upload")
  const [file, setFile] = React.useState<File | null>(null)
  const [parsedData, setParsedData] = React.useState<ParsedResident[]>([])
  const [validationResults, setValidationResults] = React.useState<ValidationResult[]>([])
  const [validationSummary, setValidationSummary] = React.useState<ValidationSummary | null>(null)
  const [existingPhones, setExistingPhones] = React.useState<Set<string>>(new Set())
  const [sendWelcomeMessages, setSendWelcomeMessages] = React.useState(true)
  const [isLoading, setIsLoading] = React.useState(false)
  const [importProgress, setImportProgress] = React.useState<ImportProgress>({
    total: 0,
    completed: 0,
    phase: "inserting",
  })
  const [importResults, setImportResults] = React.useState<ImportResults | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      // Delay reset to allow close animation
      const timer = setTimeout(() => {
        setStep("upload")
        setFile(null)
        setParsedData([])
        setValidationResults([])
        setValidationSummary(null)
        setExistingPhones(new Set())
        setSendWelcomeMessages(true)
        setIsLoading(false)
        setImportProgress({ total: 0, completed: 0, phase: "inserting" })
        setImportResults(null)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Handle file selection
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile)
    setIsLoading(true)

    try {
      // Parse the file
      const { data, errors } = await parseFile(selectedFile)

      if (errors.length > 0 && data.length === 0) {
        toast({
          title: "Parsing Error",
          description: errors[0].message,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (data.length === 0) {
        toast({
          title: "Empty File",
          description: "The file does not contain any data rows.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      setParsedData(data)

      // Check for existing phone numbers in DB
      const phoneNumbers = data
        .map(r => normalizePhoneNumber(r.phone_number).normalized)
        .filter(Boolean)

      if (phoneNumbers.length > 0) {
        const response = await fetch("/api/residents/check-duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumbers }),
        })

        if (response.ok) {
          const { existingPhones: phones } = await response.json()
          setExistingPhones(new Set(phones))
        }
      }

      // Move to preview step (validation happens in useEffect)
      setStep("preview")
    } catch (error) {
      console.error("File processing error:", error)
      toast({
        title: "Error",
        description: "Failed to process file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Validate data when moving to preview
  React.useEffect(() => {
    if (step === "preview" && parsedData.length > 0) {
      const { results, summary } = validateResidents(parsedData, existingPhones, validApartments)
      setValidationResults(results)
      setValidationSummary(summary)
    }
  }, [step, parsedData, existingPhones, validApartments])

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  // Remove a row from validation results
  const removeRow = (rowNumber: number) => {
    const newParsedData = parsedData.filter(r => r.rowNumber !== rowNumber)
    setParsedData(newParsedData)

    // Re-validate
    const { results, summary } = validateResidents(newParsedData, existingPhones, validApartments)
    setValidationResults(results)
    setValidationSummary(summary)
  }

  // Start import
  const startImport = async () => {
    if (!validationSummary) return

    setStep("importing")
    setImportProgress({
      total: validationSummary.validResidents.length,
      completed: 0,
      phase: "inserting",
    })

    try {
      const response = await fetch("/api/residents/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          residents: validationSummary.validResidents.map((r, idx) => ({
            ...r,
            rowNumber: idx + 1,
          })),
          sendWelcomeMessages,
        }),
      })

      if (!response.ok) {
        throw new Error("Import failed")
      }

      const { result } = await response.json()
      setImportResults(result)
      setStep("complete")

      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.imported} residents.`,
      })

      onImportComplete?.()
    } catch (error) {
      console.error("Import error:", error)
      toast({
        title: "Import Failed",
        description: "An error occurred during import. Please try again.",
        variant: "destructive",
      })
      setStep("preview")
    }
  }

  // Download error report from results
  const handleDownloadReport = () => {
    if (!importResults) return

    const csvContent = [
      ["Row", "Name", "Error"].join(","),
      ...importResults.errors.map(e =>
        [e.row.toString(), `"${e.name}"`, `"${e.error}"`].join(",")
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "import_report.csv"
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Render status icon
  const StatusIcon = ({ status }: { status: ValidationResult["status"] }) => {
    switch (status) {
      case "valid":
        return <Check className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Bulk Import Residents"}
            {step === "preview" && "Preview Import Data"}
            {step === "importing" && "Importing Residents..."}
            {step === "complete" && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-manzhil-teal transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">Processing file...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Drag & drop a CSV or Excel file here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Supported formats: CSV, Excel (.xlsx, .xls)</span>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate()}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>

              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && validationSummary && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="font-medium">{validationSummary.total}</span>
                <span className="text-muted-foreground">rows</span>
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <Check className="h-4 w-4" />
                <span>{validationSummary.valid} valid</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                <span>{validationSummary.warnings} warnings</span>
              </div>
              <div className="flex items-center gap-1 text-red-600">
                <XCircle className="h-4 w-4" />
                <span>{validationSummary.errors} errors</span>
              </div>
            </div>

            {/* Preview Table */}
            <ScrollArea className="h-[300px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Apartment</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.map((result) => (
                    <TableRow
                      key={result.rowNumber}
                      className={
                        result.status === "error"
                          ? "bg-red-50 dark:bg-red-950/20"
                          : result.status === "warning"
                            ? "bg-yellow-50 dark:bg-yellow-950/20"
                            : ""
                      }
                    >
                      <TableCell className="font-mono text-xs">
                        {result.rowNumber}
                      </TableCell>
                      <TableCell>{result.resident.name || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {result.resident.phone_number || "-"}
                      </TableCell>
                      <TableCell>{result.resident.apartment_number || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <StatusIcon status={result.status} />
                          {result.errors.length > 0 && (
                            <span
                              className="text-xs text-red-600 truncate max-w-[100px]"
                              title={result.errors.join(", ")}
                            >
                              {result.errors[0]}
                            </span>
                          )}
                          {result.warnings.length > 0 && result.errors.length === 0 && (
                            <span
                              className="text-xs text-yellow-600 truncate max-w-[100px]"
                              title={result.warnings.join(", ")}
                            >
                              {result.warnings[0]}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeRow(result.rowNumber)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Options */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendWelcome"
                checked={sendWelcomeMessages}
                onCheckedChange={(checked) =>
                  setSendWelcomeMessages(checked === true)
                }
              />
              <label
                htmlFor="sendWelcome"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Send welcome messages to imported residents
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("upload")
                    setFile(null)
                    setParsedData([])
                    setValidationResults([])
                    setValidationSummary(null)
                  }}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {validationSummary.errors > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadErrorReport(validationResults)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Errors
                  </Button>
                )}
              </div>

              <Button
                onClick={startImport}
                disabled={validationSummary.validResidents.length === 0}
                className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all"
              >
                Import {validationSummary.validResidents.length} Residents
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto text-manzhil-teal animate-spin mb-4" />
              <p className="font-medium">
                {importProgress.phase === "inserting"
                  ? "Inserting residents..."
                  : "Sending welcome messages..."}
              </p>
            </div>

            <div className="space-y-2">
              <Progress
                value={
                  importProgress.total > 0
                    ? (importProgress.completed / importProgress.total) * 100
                    : 0
                }
                className="h-2"
              />
              <p className="text-sm text-center text-muted-foreground">
                Please wait while we process your import...
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === "complete" && importResults && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Import Complete!</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResults.imported}
                </div>
                <div className="text-muted-foreground">Residents imported</div>
              </div>

              {importResults.skipped > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {importResults.skipped}
                  </div>
                  <div className="text-muted-foreground">Duplicates skipped</div>
                </div>
              )}

              {importResults.failed > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {importResults.failed}
                  </div>
                  <div className="text-muted-foreground">Failed</div>
                </div>
              )}

              {sendWelcomeMessages && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {importResults.messagesSuccess}
                  </div>
                  <div className="text-muted-foreground">Messages sent</div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
              {importResults.errors.length > 0 && (
                <Button variant="outline" onClick={handleDownloadReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              )}

              <Button
                className="ml-auto bg-gradient-to-r from-manzhil-dark to-manzhil-teal"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
