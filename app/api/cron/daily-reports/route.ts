import type { NextRequest } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { sendWhatsAppTemplate, sendWhatsAppMessage } from "@/lib/twilio"

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://greensthree-bms.vercel.app").replace(/\/$/, "")
const DAILY_REPORT_TEMPLATE_SID = process.env.TWILIO_DAILY_REPORT_TEMPLATE_SID || "HXe150ee7863ea59b5077930c67d61b68c"

// WhatsApp numbers to send reports to (admin numbers)
const REPORT_RECIPIENTS = [
  "+923000777454",
  "+923232244009",
  "+923071288183"
]

export async function POST(request: NextRequest) {
  try {
    console.log("[DAILY REPORTS] Starting daily report generation...")

    // Calculate 24-hour time range
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Fetch last 24 hours data
    const { data: recentComplaints } = await supabase
      .from("complaints")
      .select("*, profiles(name, apartment_number)")
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: false })

    const { data: recentBookings } = await supabase
      .from("bookings")
      .select("*, profiles(name, apartment_number)")
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: false })

    // Fetch all open complaints
    const { data: openComplaints } = await supabase
      .from("complaints")
      .select("*, profiles(name, apartment_number)")
      .in("status", ["pending", "in-progress"])
      .order("created_at", { ascending: false })

    // Generate 24-hour activity report
    const activityPdf = await generate24HourReport(recentComplaints || [], recentBookings || [])
    
    // Generate open complaints report
    const openComplaintsPdf = await generateOpenComplaintsReport(openComplaints || [])

    console.log("[DAILY REPORTS] Reports generated successfully")
    console.log(`- 24-hour report: ${recentComplaints?.length || 0} complaints, ${recentBookings?.length || 0} bookings`)
    console.log(`- Open complaints: ${openComplaints?.length || 0} items`)

    // Save reports to database
    const reportDateStr = now.toISOString().split('T')[0] // YYYY-MM-DD format
    const pendingCount = openComplaints?.filter(c => c.status === 'pending').length || 0
    const inProgressCount = openComplaints?.filter(c => c.status === 'in-progress').length || 0

    // Convert PDFs to base64
    const activityPdfBase64 = `data:application/pdf;base64,${activityPdf.toString('base64')}`
    const openComplaintsPdfBase64 = `data:application/pdf;base64,${openComplaintsPdf.toString('base64')}`

    // Insert 24-hour activity report (using admin client to bypass RLS)
    const { data: activityReport, error: activityError } = await supabaseAdmin
      .from('daily_reports')
      .insert({
        report_date: reportDateStr,
        report_type: '24_hour',
        complaints_count: recentComplaints?.length || 0,
        bookings_count: recentBookings?.length || 0,
        open_complaints_count: openComplaints?.length || 0,
        pending_count: pendingCount,
        in_progress_count: inProgressCount,
        pdf_data: activityPdfBase64,
      })
      .select('id')
      .single()

    // Insert open complaints report (using admin client to bypass RLS)
    const { data: complaintsReport, error: complaintsError } = await supabaseAdmin
      .from('daily_reports')
      .insert({
        report_date: reportDateStr,
        report_type: 'open_complaints',
        complaints_count: 0,
        bookings_count: 0,
        open_complaints_count: openComplaints?.length || 0,
        pending_count: pendingCount,
        in_progress_count: inProgressCount,
        pdf_data: openComplaintsPdfBase64,
      })
      .select('id')
      .single()

    if (activityError) {
      console.error('[DAILY REPORTS] Error saving 24-hour activity report:', activityError)
    } else {
      console.log('[DAILY REPORTS] 24-hour activity report saved with ID:', activityReport?.id)
    }
    
    if (complaintsError) {
      console.error('[DAILY REPORTS] Error saving open complaints report:', complaintsError)
    } else {
      console.log('[DAILY REPORTS] Open complaints report saved with ID:', complaintsReport?.id)
    }

    // Send summary via WhatsApp template to all recipients
    const reportDate = now.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'Asia/Karachi'
    })
    
    const generationTime = now.toLocaleString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true, 
      timeZone: 'Asia/Karachi' 
    })
    
    // Create report links
    const activityReportLink = activityReport?.id ? `${APP_BASE_URL}/daily-report/${activityReport.id}` : 'N/A'
    const complaintsReportLink = complaintsReport?.id ? `${APP_BASE_URL}/daily-report/${complaintsReport.id}` : 'N/A'
    
    console.log('[DAILY REPORTS] Report links generated:')
    console.log('  - Activity Report:', activityReportLink)
    console.log('  - Complaints Report:', complaintsReportLink)

    // Template variables mapping
    const templateVariables = {
      "1": reportDate,
      "2": String(recentComplaints?.length || 0),
      "3": String(recentBookings?.length || 0),
      "4": String(openComplaints?.length || 0),
      "5": String(pendingCount),
      "6": String(inProgressCount),
      "7": activityReportLink,
      "8": complaintsReportLink,
      "9": generationTime,
    }

    let sentCount = 0
    for (const recipient of REPORT_RECIPIENTS) {
      try {
        await sendWhatsAppTemplate(recipient, DAILY_REPORT_TEMPLATE_SID, templateVariables)
        sentCount++
        console.log(`[DAILY REPORTS] Sent to ${recipient}`)
      } catch (error) {
        console.error(`[DAILY REPORTS] Failed to send template to ${recipient}:`, error)
        // Fallback to plain text message
        try {
          const fallbackMessage = `Hello, this is Manzhil by Scrift.

📊 Daily Report Summary

Last 24 Hours:
📝 ${recentComplaints?.length || 0} new complaints
🏛️ ${recentBookings?.length || 0} new bookings

Open Issues:
⚠️ ${pendingCount} pending complaints
🔄 ${inProgressCount} complaints in progress

📄 View Reports:
Activity Report: ${activityReportLink}
Complaints Report: ${complaintsReportLink}

Generated at: ${generationTime}

- Manzhil by Scrift Team`

          await sendWhatsAppMessage(recipient, fallbackMessage)
          sentCount++
          console.log(`[DAILY REPORTS] Sent fallback message to ${recipient}`)
        } catch (fallbackError) {
          console.error(`[DAILY REPORTS] Failed to send fallback to ${recipient}:`, fallbackError)
        }
      }
    }
    
    console.log(`[DAILY REPORTS] Sent reports to ${sentCount}/${REPORT_RECIPIENTS.length} recipients`)
    
    const summary = {
      timestamp: now.toISOString(),
      last24Hours: {
        complaints: recentComplaints?.length || 0,
        bookings: recentBookings?.length || 0,
      },
      openComplaints: openComplaints?.length || 0,
      recipients: REPORT_RECIPIENTS.length,
    }

    return new Response(JSON.stringify({ success: true, summary }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[DAILY REPORTS] Error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to generate daily reports" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

async function generate24HourReport(complaints: any[], bookings: any[]): Promise<Buffer> {
  const doc = new jsPDF()
  const now = new Date()
  
  // Header
  doc.setFillColor(34, 197, 94) // Green
  doc.rect(0, 0, 210, 40, "F")
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.text("Manzhil by Scrift", 105, 20, { align: "center" })
  
  doc.setFontSize(14)
  doc.setFont("helvetica", "normal")
  doc.text("24-Hour Activity Report", 105, 30, { align: "center" })
  
  // Report details
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.text(`Generated: ${now.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true 
  })}`, 14, 50)
  doc.text(`Period: Last 24 Hours`, 14, 56)
  
  let yPos = 70

  // Summary Section
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Summary", 14, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Total Complaints: ${complaints.length}`, 20, yPos)
  yPos += 6
  doc.text(`Total Bookings: ${bookings.length}`, 20, yPos)
  yPos += 6
  
  const pendingComplaints = complaints.filter(c => c.status === "pending").length
  const completedComplaints = complaints.filter(c => c.status === "completed").length
  const inProgressComplaints = complaints.filter(c => c.status === "in-progress").length
  
  doc.text(`Pending Complaints: ${pendingComplaints}`, 20, yPos)
  yPos += 6
  doc.text(`In-Progress Complaints: ${inProgressComplaints}`, 20, yPos)
  yPos += 6
  doc.text(`Completed Complaints: ${completedComplaints}`, 20, yPos)
  yPos += 15

  // Complaints Table
  if (complaints.length > 0) {
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Recent Complaints", 14, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head: [["ID", "Resident", "Apt", "Category", "Type", "Status", "Date"]],
      body: complaints.map(c => [
        c.complaint_id,
        c.profiles?.name || "N/A",
        c.profiles?.apartment_number || "N/A",
        c.category,
        c.subcategory.replace(/_/g, ' '),
        c.status,
        new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ]),
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 15 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 25 },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // Bookings Table
  if (bookings.length > 0) {
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Recent Bookings", 14, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head: [["Resident", "Apt", "Date", "Time", "Amount", "Payment", "Status"]],
      body: bookings.map(b => [
        b.profiles?.name || "N/A",
        b.profiles?.apartment_number || "N/A",
        new Date(b.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        `${b.start_time} - ${b.end_time}`,
        `Rs. ${b.booking_charges}`,
        b.payment_status,
        b.status
      ]),
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 15 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
      },
    })
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Page ${i} of ${pageCount} | Manzhil by Scrift`,
      105,
      290,
      { align: "center" }
    )
  }

  return Buffer.from(doc.output("arraybuffer"))
}

async function generateOpenComplaintsReport(complaints: any[]): Promise<Buffer> {
  const doc = new jsPDF()
  const now = new Date()
  
  // Header
  doc.setFillColor(239, 68, 68) // Red
  doc.rect(0, 0, 210, 40, "F")
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.text("Manzhil by Scrift", 105, 20, { align: "center" })
  
  doc.setFontSize(14)
  doc.setFont("helvetica", "normal")
  doc.text("Open Complaints Report", 105, 30, { align: "center" })
  
  // Report details
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.text(`Generated: ${now.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true 
  })}`, 14, 50)
  doc.text(`Total Open Complaints: ${complaints.length}`, 14, 56)
  
  let yPos = 70

  // Summary by status
  const pending = complaints.filter(c => c.status === "pending").length
  const inProgress = complaints.filter(c => c.status === "in-progress").length
  
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Status Breakdown", 14, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Pending: ${pending}`, 20, yPos)
  yPos += 6
  doc.text(`In Progress: ${inProgress}`, 20, yPos)
  yPos += 15

  // Complaints Table
  if (complaints.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["ID", "Resident", "Apt", "Category", "Type", "Status", "Created", "Description"]],
      body: complaints.map(c => [
        c.complaint_id,
        c.profiles?.name || "N/A",
        c.profiles?.apartment_number || "N/A",
        c.category,
        c.subcategory.replace(/_/g, ' '),
        c.status,
        new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        c.description ? (c.description.length > 30 ? c.description.substring(0, 30) + "..." : c.description) : "N/A"
      ]),
      theme: "grid",
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 25 },
        2: { cellWidth: 12 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 18 },
        6: { cellWidth: 22 },
        7: { cellWidth: 35 },
      },
    })
  } else {
    doc.setFontSize(12)
    doc.setTextColor(34, 197, 94)
    doc.text("🎉 No open complaints! Everything is resolved.", 105, yPos, { align: "center" })
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Page ${i} of ${pageCount} | Manzhil by Scrift`,
      105,
      290,
      { align: "center" }
    )
  }

  return Buffer.from(doc.output("arraybuffer"))
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}
