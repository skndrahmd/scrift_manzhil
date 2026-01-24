"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Download, Loader2, RefreshCw, AlertTriangle } from "lucide-react"
import { supabase, type MaintenancePayment, type Profile } from "@/lib/supabase"
import { generateMaintenanceInvoicePdf, getMaintenanceInvoiceNumber, formatCurrency } from "@/lib/invoice"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type MaintenanceInvoiceRecord = MaintenancePayment & { profiles?: Partial<Profile> }
type OutstandingSummary = {
  totalOutstanding: number
  outstandingCount: number
  months: string[]
}

function getMaintenanceStatusBadge(status?: string | null) {
  switch (status) {
    case "paid":
      return {
        label: "Paid",
        variant: "default" as const,
        className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
      }
    default:
      return {
        label: "Unpaid",
        variant: "secondary" as const,
        className: "bg-amber-100 text-amber-800 hover:bg-amber-200",
      }
  }
}

function formatMonthYear(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  })
}

export default function MaintenanceInvoicePage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams()
  const snapshotStatus = searchParams.get("snapshot")

  const [invoice, setInvoice] = useState<MaintenanceInvoiceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [generating, setGenerating] = useState(false)
  const [outstandingSummary, setOutstandingSummary] = useState<OutstandingSummary>({
    totalOutstanding: 0,
    outstandingCount: 0,
    months: [],
  })

  useEffect(() => {
    void loadInvoice()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  const displayStatus = snapshotStatus || invoice?.status
  const displayInvoice = invoice ? { ...invoice, status: displayStatus } : null

  const billingPeriod = useMemo(() => {
    if (!invoice) return "—"
    return new Date(invoice.year, invoice.month - 1, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    })
  }, [invoice])

  const dueDate = useMemo(() => {
    if (!invoice) return "—"
    return new Date(invoice.year, invoice.month - 1, 10).toLocaleDateString("en-GB")
  }, [invoice])

  const invoiceDate = useMemo(() => {
    if (!invoice?.created_at) return "—"
    return new Date(invoice.created_at).toLocaleDateString("en-GB")
  }, [invoice])

  const paidDate = useMemo(() => {
    if (!displayInvoice || displayInvoice.status !== "paid") return "—"
    if (!invoice?.paid_date) return "—"
    return new Date(`${invoice.paid_date}T00:00:00`).toLocaleDateString("en-GB")
  }, [invoice, displayInvoice])

  const invoiceNumber = useMemo(() => (invoice ? getMaintenanceInvoiceNumber(invoice) : "—"), [invoice])
  const amount = useMemo(() => formatCurrency(invoice?.amount ?? 0), [invoice])
  const badge = useMemo(() => getMaintenanceStatusBadge(displayStatus), [displayStatus])

  const outstandingDisplay = useMemo(() => {
    if (displayInvoice?.status === "paid") {
      return amount
    }
    if (outstandingSummary.outstandingCount === 0) return "None"
    const invoiceLabel = outstandingSummary.outstandingCount === 1 ? "invoice" : "invoices"
    return `${formatCurrency(outstandingSummary.totalOutstanding)} (${outstandingSummary.outstandingCount} ${invoiceLabel})`
  }, [outstandingSummary, displayInvoice, amount])

  async function loadInvoice() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("maintenance_payments")
        .select(
          `
          *,
          profiles:profiles!maintenance_payments_profile_id_fkey (
            id,
            name,
            phone_number,
            apartment_number,
            maintenance_charges
          )
        `,
        )
        .eq("id", params.id)
        .single()

      if (error || !data) {
        throw new Error(error?.message || "Invoice not found")
      }

      const invoiceRecord = data as MaintenanceInvoiceRecord

      const shouldFetchOutstanding = snapshotStatus ? snapshotStatus === "unpaid" : invoiceRecord.status !== "paid"

      const summary = shouldFetchOutstanding
        ? await fetchOutstandingSummary(invoiceRecord.profile_id)
        : { totalOutstanding: 0, outstandingCount: 0, months: [] }

      const displayVersion = snapshotStatus ? { ...invoiceRecord, status: snapshotStatus } : invoiceRecord

      await generatePreview(displayVersion, summary)

      setOutstandingSummary(summary)
      setInvoice(invoiceRecord)
    } catch (err: any) {
      setError(err.message || "Failed to load invoice")
      setInvoice(null)
    } finally {
      setLoading(false)
    }
  }

  async function fetchOutstandingSummary(profileId: string): Promise<OutstandingSummary> {
    const summary: OutstandingSummary = { totalOutstanding: 0, outstandingCount: 0, months: [] }

    const { data } = await supabase
      .from("maintenance_payments")
      .select("id, amount, month, year")
      .eq("profile_id", profileId)
      .eq("status", "unpaid")

    if (data) {
      data.forEach((row) => {
        summary.totalOutstanding += Number(row.amount ?? 0)
        summary.outstandingCount += 1
        summary.months.push(formatMonthYear(row.month, row.year))
      })
    }

    return summary
  }

  // async function generatePreview(currentInvoice: MaintenanceInvoiceRecord, summary?: OutstandingSummary) {
    async function generatePreview(currentInvoice: any, summary?: OutstandingSummary) {

    try {
      setGenerating(true)
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
        setPdfUrl(null)
      }
      const summaryForPdf = summary ?? { totalOutstanding: 0, outstandingCount: 0, months: [] }
      const { blob, fileName } = await generateMaintenanceInvoicePdf(currentInvoice, summaryForPdf)
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      setFileName(fileName)
    } catch (err) {
      console.error("Failed to create invoice preview", err)
      setError("Failed to generate invoice preview. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  function handleDownload() {
    if (!pdfUrl) return
    const link = document.createElement("a")
    link.href = pdfUrl
    link.download = fileName || "maintenance-invoice.pdf"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function isInvoicePaid(status?: string | null) {
    return status === "paid"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading invoice...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Unable to load invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-gray-700">{error}</p>
            <Button onClick={() => void loadInvoice()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invoice || !displayInvoice) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-10">
      <div className="container mx-auto space-y-6 px-4">
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-3xl font-semibold text-gray-900">Maintenance Invoice</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Invoice #{invoiceNumber}</p>
                {snapshotStatus && (
                  <p className="text-xs text-blue-600 mt-1">
                    Viewing invoice snapshot as of when it was {snapshotStatus}
                  </p>
                )}
              </div>
              <Badge variant={badge.variant} className={`${badge.className} px-4 py-2 text-sm`}>
                {badge.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Resident</h3>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                  <p className="text-lg font-semibold text-gray-900">{invoice.profiles?.name ?? "Resident"}</p>
                  <p className="text-sm text-gray-600">
                    {invoice.profiles?.apartment_number ? `Apartment ${invoice.profiles.apartment_number}` : "—"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {invoice.profiles?.phone_number ? invoice.profiles.phone_number : "No phone number on file"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Invoice Details</h3>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 grid gap-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Billing Period</span>
                    <span className="font-medium text-gray-900">{billingPeriod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Invoice Date</span>
                    <span className="font-medium text-gray-900">{invoiceDate}</span>
                  </div>
                  {/* <div className="flex justify-between">
                    <span>Due Date</span>
                    <span className="font-medium text-gray-900">{dueDate}</span>
                  </div> */}
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="font-medium text-gray-900">{badge.label}</span>
                  </div>
                   {
                    snapshotStatus=='paid' &&
                  <div className="flex justify-between">
                    <span>Amount</span>
                    <span className="font-semibold text-gray-900">{amount}</span>
                  </div>
                  }
                   {
                    snapshotStatus=='paid' &&
                  <div className="flex justify-between">
                    <span>Paid Date</span>
                    <span className="font-medium text-gray-900">{paidDate}</span>
                  </div>
}
                  {
                    snapshotStatus=='unpaid' &&
                  <div className="flex justify-between">
                    <span>Amount to be Paid</span>
                    <div className="flex flex-col text-right">
                      {isInvoicePaid(displayStatus) ? (
                        <>
                          <span className="font-medium text-gray-900">{amount}</span>
                          <span className="text-xs text-gray-500">{billingPeriod}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-gray-900">{outstandingDisplay}</span>
                          {outstandingSummary.months.length > 0 && (
                            <span className="text-xs text-gray-500">{outstandingSummary.months.join(", ")}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleDownload}
                disabled={!pdfUrl || generating}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Download Invoice
              </Button>
              <Button
                variant="outline"
                onClick={() => void generatePreview(displayInvoice, outstandingSummary)}
                disabled={generating}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
                {generating ? "Regenerating..." : "Refresh PDF"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Maintenance Invoice PDF"
              className="w-full h-[900px]"
              aria-label="Maintenance invoice preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500">
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mb-3" />
                  Generating PDF preview...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-6 w-6 mb-3" />
                  Unable to display the invoice preview. Please use the download button above.
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

