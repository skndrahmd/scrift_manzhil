"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertTriangle, Download, RefreshCw, Calendar, TrendingUp } from "lucide-react"
import { supabase, type DailyReport } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function DailyReportPage({ params }: { params: { id: string } }) {
  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [timezone, setTimezone] = useState("Asia/Karachi")

  useEffect(() => {
    supabase.from("instance_settings").select("key, value").eq("key", "timezone").single().then(({ data }) => {
      if (data) setTimezone(data.value)
    })
  }, [])

  useEffect(() => {
    void loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  async function loadReport() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error || !data) {
        throw new Error(error?.message || "Report not found")
      }

      setReport(data as DailyReport)
      
      // Convert base64 PDF to blob URL
      if (data.pdf_data) {
        const base64Data = data.pdf_data.split(',')[1] || data.pdf_data
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
      }
    } catch (err: any) {
      setError(err.message || "Failed to load report")
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (!pdfUrl || !report) return
    const link = document.createElement("a")
    link.href = pdfUrl
    const fileName = `daily-report-${report.report_type}-${report.report_date}.pdf`
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading report...
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
              Unable to load report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-gray-700">{error}</p>
            <Button onClick={() => void loadReport()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!report) {
    return null
  }

  const reportDate = new Date(report.report_date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone
  })

  const reportTypeLabel = report.report_type === "24_hour" 
    ? "24-Hour Activity Report" 
    : "Open Complaints Report"

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-10">
      <div className="container mx-auto space-y-6 px-4">
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-3xl font-semibold text-gray-900">
                  Daily Report
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">{reportTypeLabel}</p>
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {reportDate}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-200 px-4 py-2 text-sm">
                Generated Report
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {report.report_type === "24_hour" && (
                <>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Complaints (24h)
                    </h3>
                    <div className="rounded-xl border border-gray-200 bg-blue-50 p-4">
                      <p className="text-3xl font-bold text-blue-600">{report.complaints_count}</p>
                      <p className="text-sm text-gray-600 mt-1">New complaints</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Bookings (24h)
                    </h3>
                    <div className="rounded-xl border border-gray-200 bg-green-50 p-4">
                      <p className="text-3xl font-bold text-green-600">{report.bookings_count}</p>
                      <p className="text-sm text-gray-600 mt-1">New bookings</p>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Open Complaints
                </h3>
                <div className="rounded-xl border border-gray-200 bg-amber-50 p-4">
                  <p className="text-3xl font-bold text-amber-600">{report.open_complaints_count}</p>
                  <div className="text-xs text-gray-600 mt-2 space-y-1">
                    <p>• Pending: {report.pending_count}</p>
                    <p>• In Progress: {report.in_progress_count}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleDownload}
                disabled={!pdfUrl}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Download Report
              </Button>
              <Button
                variant="outline"
                onClick={() => void loadReport()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Daily Report PDF"
              className="w-full h-[900px]"
              aria-label="Daily report preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500">
              <AlertTriangle className="h-6 w-6 mb-3" />
              Unable to display the report preview. Please use the download button above.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
