"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import {
  supabase,
  type BookingSettings,
  type Booking,
  type Complaint,
  type Profile,
  type GroupedComplaint,
  type Feedback,
  type Staff,
} from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Users,
  Settings,
  X,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Eye,
  CreditCard,
  UserPlus,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Search,
  Filter,
  BarChart3,
  Bell,
  Send,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { formatDateForDisplay } from "@/lib/time-utils"
import Link from "next/link"
import { exportToPdf, filterByPeriod, periodLabel, type Period } from "@/lib/pdf"
import { UserMenu } from "@/components/user-menu"
import { SettingsDialog } from "@/components/settings-dialog"
import { AccountingTab } from "@/components/accounting"
import { Wallet } from "lucide-react"
// import { put } from '@vercel/blob';


export default function AdminPanel() {
  const [settings, setSettings] = useState<BookingSettings | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [groupedComplaints, setGroupedComplaints] = useState<GroupedComplaint[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [profileStaff, setProfileStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [complaintStatusFilter, setComplaintStatusFilter] = useState("all")
  const [maintenanceFilter, setMaintenanceFilter] = useState("all")
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null)
  const [updatingComplaintId, setUpdatingComplaintId] = useState<string | null>(null)
  const [updatingMaintenanceId, setUpdatingMaintenanceId] = useState<string | null>(null)
  const [sendingBookingReminder, setSendingBookingReminder] = useState(false)
  const [sendingMaintenanceReminder, setSendingMaintenanceReminder] = useState(false)
  const [selectedResidents, setSelectedResidents] = useState<string[]>([])
  const [sendingBulkReminder, setSendingBulkReminder] = useState(false)
  const [activeTab, setActiveTab] = useState("residents")
  const [lastViewedBookings, setLastViewedBookings] = useState<number>(Date.now())
  const [lastViewedComplaints, setLastViewedComplaints] = useState<number>(Date.now())
  const [lastViewedFeedback, setLastViewedFeedback] = useState<number>(Date.now())
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)

  // Pagination state
  const [residentsPage, setResidentsPage] = useState(1)
  const [bookingsPage, setBookingsPage] = useState(1)
  const [complaintsPage, setComplaintsPage] = useState(1)
  const [feedbackPage, setFeedbackPage] = useState(1)
  const itemsPerPage = 10

  // Settings form state
  // Note: Start time (09:00), end time (21:00), and slot duration are now fixed for full-day bookings
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [bookingCharges, setBookingCharges] = useState(500)

  // New user form state
  const [newUser, setNewUser] = useState({
    name: "",
    phone_number: "",
    cnic: "",
    apartment_number: "",
    maintenance_charges: 5000,
  })

  // PDF export state
  const [residentsPeriod, setResidentsPeriod] = useState<Period>("all")
  const [bookingsPeriod, setBookingsPeriod] = useState<Period>("all")
  const [complaintsPeriod, setComplaintsPeriod] = useState<Period>("all")

  const { toast } = useToast()

  // Helper function to check if item is new (created within last 5 minutes)
  const isNewItem = (createdAt: string) => {
    const created = new Date(createdAt).getTime()
    const now = new Date().getTime()
    const fiveMinutes = 5 * 60 * 1000 // 5 minutes in milliseconds
    return now - created < fiveMinutes
  }

  // Helper to check if item is new AND hasn't been viewed yet
  const isNewBooking = (createdAt: string) => {
    // Convert UTC timestamp from database to Pakistan time (UTC+5)
    const created = new Date(createdAt).getTime() - (5 * 60 * 60 * 1000)
    return created > lastViewedBookings && isNewItem(createdAt)
  }

  const isNewComplaint = (createdAt: string) => {
    // Convert UTC timestamp from database to Pakistan time (UTC+5)
    const created = new Date(createdAt).getTime() - (5 * 60 * 60 * 1000)
    return created > lastViewedComplaints && isNewItem(createdAt)
  }

  const isNewFeedback = (createdAt: string) => {
    // Convert UTC timestamp from database to Pakistan time (UTC+5)
    const created = new Date(createdAt).getTime() - (5 * 60 * 60 * 1000)
    const isNew = created > lastViewedFeedback && isNewItem(createdAt)
    return isNew
  }

  // Count unviewed items for tab badges
  const newBookingsCount = bookings.filter(b => isNewBooking(b.created_at)).length
  const newComplaintsCount = complaints.filter(c => isNewComplaint(c.created_at)).length
  const newFeedbackCount = feedback.filter(f => isNewFeedback(f.created_at)).length

  // Debug logging for feedback
  console.log('Feedback count:', feedback.length, 'New feedback count:', newFeedbackCount, 'Last viewed:', new Date(lastViewedFeedback).toLocaleString())

  useEffect(() => {
    fetchData()

    // Set up realtime subscriptions for automatic updates
    const bookingsChannel = supabase
      .channel('bookings-changes', {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('🔔 Booking change detected:', payload)
          fetchBookings()
          // Show toast notification for new bookings
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Booking Received",
              description: "A new booking has been created",
            })
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "Booking Updated",
              description: "A booking has been modified",
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Bookings channel status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connected for bookings')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Bookings channel error')
        }
      })

    const complaintsChannel = supabase
      .channel('complaints-changes', {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints',
        },
        (payload) => {
          console.log('🔔 Complaint change detected:', payload)
          fetchComplaints()
          // Show toast notification for new complaints
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Complaint Received",
              description: "A new complaint has been submitted",
              variant: "default",
            })
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "Complaint Updated",
              description: "A complaint status has been changed",
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Complaints channel status:', status)
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true)
          console.log('✅ Realtime connected for complaints')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Realtime connection failed for complaints')
          setRealtimeConnected(false)
        }
      })

    const profilesChannel = supabase
      .channel('profiles-changes', {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('🔔 Profile change detected:', payload)
          fetchProfiles()
          // Optional: Uncomment to show toast notification
          toast({
            title: "Resident Updated",
            description: "A resident has been added or modified",
          })
        }
      )
      .subscribe((status) => {
        console.log('📡 Profiles channel status:', status)
      })

    const feedbackChannel = supabase
      .channel('feedback-changes', {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
        },
        (payload) => {
          console.log('🔔 Feedback change detected:', payload)
          fetchFeedback()
          // Show toast notification for new feedback
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Feedback Received",
              description: "A resident has submitted feedback",
              variant: "default",
            })
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "Feedback Updated",
              description: "Feedback status has been changed",
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Feedback channel status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connected for feedback')
        }
      })

    // Set up timer to re-render every 10 seconds to update "NEW" badges
    const timer = setInterval(() => {
      // Force re-render by updating a counter state
      setForceUpdate(prev => prev + 1)
    }, 10000) // 10 seconds

    // Cleanup subscriptions and timer on unmount
    return () => {
      supabase.removeChannel(bookingsChannel)
      supabase.removeChannel(complaintsChannel)
      supabase.removeChannel(profilesChannel)
      supabase.removeChannel(feedbackChannel)
      clearInterval(timer)
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchSettings(), fetchBookings(), fetchComplaints(), fetchProfiles(), fetchFeedback()])
    setLoading(false)
  }

  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([fetchSettings(), fetchBookings(), fetchComplaints(), fetchProfiles(), fetchFeedback()])
    setRefreshing(false)
    toast({
      title: "Data Refreshed",
      description: "All data has been updated successfully",
    })
  }

  const fetchSettings = async () => {
    const { data, error } = await supabase.from("booking_settings").select("*").single()

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch booking settings",
        variant: "destructive",
      })
    } else {
      setSettings(data)
      setWorkingDays(data.working_days)
      setBookingCharges(data.booking_charges || 500)
    }
  }

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        profiles (name, phone_number, apartment_number)
      `,
      )
      .order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive",
      })
    } else {
      setBookings(data || [])
    }
  }

  const fetchComplaints = async () => {
    const { data, error } = await supabase
      .from("complaints")
      .select(
        `
        *,
        profiles (name, phone_number, apartment_number)
      `,
      )
      .order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch complaints",
        variant: "destructive",
      })
    } else {
      setComplaints(data || [])
      groupComplaintsByType(data || [])
    }
  }

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("name", { ascending: true })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch profiles",
        variant: "destructive",
      })
    } else {
      setProfiles(data || [])
    }
  }

  const fetchFeedback = async () => {
    const { data, error } = await supabase
      .from("feedback")
      .select("*, profiles:profiles!feedback_profile_id_fkey (name, phone_number, apartment_number)")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching feedback:", error)
      toast({
        title: "Error",
        description: "Failed to fetch feedback",
        variant: "destructive",
      })
    } else {
      setFeedback(data || [])
    }
  }

  const groupComplaintsByType = (complaintsData: Complaint[]) => {
    const grouped = complaintsData.reduce(
      (acc, complaint) => {
        const key = complaint.group_key || `${complaint.category}_${complaint.subcategory}`

        if (!acc[key]) {
          acc[key] = {
            group_key: key,
            category: complaint.category,
            subcategory: complaint.subcategory,
            description: complaint.description,
            status: complaint.status,
            count: 0,
            latest_date: complaint.created_at,
            complaints: [],
          }
        }

        acc[key].complaints.push(complaint)
        acc[key].count++

        if (new Date(complaint.created_at) > new Date(acc[key].latest_date)) {
          acc[key].latest_date = complaint.created_at
          acc[key].status = complaint.status
        }

        return acc
      },
      {} as Record<string, GroupedComplaint>,
    )

    setGroupedComplaints(Object.values(grouped))
  }

  const saveSettings = async () => {
    if (!settings) return

    setSaving(true)
    const { error } = await supabase
      .from("booking_settings")
      .update({
        working_days: workingDays,
        booking_charges: bookingCharges,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Settings saved successfully",
      })
      fetchSettings()
    }
    setSaving(false)
  }

  const addNewUser = async () => {
    if (!newUser.name || !newUser.phone_number || !newUser.apartment_number) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const formattedPhone = newUser.phone_number.startsWith("+") ? newUser.phone_number : `+${newUser.phone_number}`

    const { error } = await supabase.from("profiles").insert([
      {
        ...newUser,
        phone_number: formattedPhone,
      },
    ])

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add user: " + error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "User added successfully",
      })

      // Send welcome WhatsApp message using approved template
      try {
        const response = await fetch("/api/residents/welcome-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newUser.name,
            phone_number: formattedPhone,
            apartment_number: newUser.apartment_number,
          }),
        })

        if (response.ok) {
          toast({
            title: "Welcome Message Sent",
            description: "Resident has been notified via WhatsApp",
          })
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error("Failed to send welcome message:", errorData)
          toast({
            title: "Note",
            description: "User added but welcome message could not be sent",
            variant: "default",
          })
        }
      } catch (welcomeError) {
        console.error("Welcome message error:", welcomeError)
        // Don't show error toast - user was added successfully
      }

      setNewUser({
        name: "",
        phone_number: "",
        cnic: "",
        apartment_number: "",
        maintenance_charges: 5000,
      })
      setIsAddUserOpen(false)
      fetchProfiles()
    }
  }

  const updateMaintenanceStatus = async (profileId: string, isPaid: boolean) => {
    setUpdatingMaintenanceId(profileId)
    try {
      // Find the maintenance payment record for current month
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      let { data: payment, error: paymentError } = await supabase
        .from("maintenance_payments")
        .select("id")
        .eq("profile_id", profileId)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle()

      // If no payment record exists, create one first
      if (!payment || paymentError) {
        // Get the resident's maintenance charges
        const { data: profile } = await supabase
          .from("profiles")
          .select("maintenance_charges")
          .eq("id", profileId)
          .single()

        const amount = profile?.maintenance_charges || 5000

        // Create the payment record
        const { data: newPayment, error: insertError } = await supabase
          .from("maintenance_payments")
          .insert({
            profile_id: profileId,
            year,
            month,
            amount,
            status: "unpaid",
          })
          .select("id")
          .single()

        if (insertError) {
          console.error("Failed to create payment record:", insertError)
          throw new Error("Failed to create payment record")
        }

        payment = newPayment
      }

      // Now update the payment record via API
      if (payment) {
        // Call API endpoint to update and send notification
        const response = await fetch("/api/maintenance/update-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: payment.id, isPaid }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(typeof data?.error === "string" ? data.error : "Failed to update payment status")
        }

        toast({
          title: "Success",
          description: isPaid
            ? "Marked as paid and resident notified via WhatsApp"
            : "Marked as unpaid",
        })
      }

      fetchProfiles()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update maintenance status",
        variant: "destructive",
      })
    } finally {
      setUpdatingMaintenanceId(null)
    }
  }

  const updateComplaintStatus = async (complaintId: string, newStatus: string) => {
    setUpdatingComplaintId(complaintId)
    try {
      const response = await fetch("/api/complaints/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId, status: newStatus }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to update complaint status")
      }

      toast({
        title: "Success",
        description:
          newStatus === "completed"
            ? "Complaint marked as completed and the resident has been notified."
            : "Complaint status updated successfully.",
      })
      fetchComplaints()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update complaint status",
        variant: "destructive",
      })
    } finally {
      setUpdatingComplaintId(null)
    }
  }

  const updateBookingPaymentStatus = async (bookingId: string, paymentStatus: string) => {
    setUpdatingPaymentId(bookingId)
    try {
      const response = await fetch("/api/bookings/update-payment-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, paymentStatus }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to update payment status")
      }

      toast({
        title: "Success",
        description:
          paymentStatus === "paid"
            ? "Payment marked as paid and resident has been notified with invoice link."
            : "Payment status updated successfully.",
      })
      fetchBookings()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update payment status",
        variant: "destructive",
      })
    } finally {
      setUpdatingPaymentId(null)
    }
  }

  const cancelBooking = async (bookingId: string) => {
    // First, fetch the booking details before deleting
    const { data: bookingData, error: fetchError } = await supabase
      .from("bookings")
      .select("*, profiles(name, phone_number)")
      .eq("id", bookingId)
      .single()

    if (fetchError || !bookingData) {
      toast({
        title: "Error",
        description: "Failed to fetch booking details",
        variant: "destructive",
      })
      return
    }

    // Update booking status to cancelled instead of deleting
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      })
    } else {
      // Send cancellation WhatsApp notification with PDF link
      if (bookingData.profiles?.phone_number) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
          const cancellationLink = `${baseUrl}/booking-invoice/${bookingId}?snapshot=cancelled`

          await fetch("/api/twilio/send-template", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: bookingData.profiles.phone_number,
              templateType: "booking_cancelled",
              variables: {
                name: bookingData.profiles.name,
                date: new Date(bookingData.booking_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
                startTime: formatTime(bookingData.start_time),
                endTime: formatTime(bookingData.end_time),
                bookingId: bookingId.slice(0, 8).toUpperCase(),
                pdfLink: cancellationLink,
              },
            }),
          })
        } catch (err) {
          console.error("Failed to send cancellation notification:", err)
        }
      }

      toast({
        title: "Success",
        description: "Booking cancelled and notification sent",
      })
      fetchBookings()
    }
  }

  const triggerBookingReminder = async () => {
    setSendingBookingReminder(true)
    try {
      const response = await fetch("/api/cron/booking-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-key": process.env.NEXT_PUBLIC_CRON_SECRET || "",
        },
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Booking reminders sent successfully",
        })
      } else {
        throw new Error("Failed to send booking reminders")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger booking reminders",
        variant: "destructive",
      })
    } finally {
      setSendingBookingReminder(false)
    }
  }

  const triggerMaintenanceReminder = async () => {
    setSendingMaintenanceReminder(true)
    try {
      const response = await fetch("/api/cron/maintenance-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-key": process.env.NEXT_PUBLIC_CRON_SECRET || "",
        },
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Maintenance reminders sent successfully",
        })
      } else {
        throw new Error("Failed to send maintenance reminders")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger maintenance reminders",
        variant: "destructive",
      })
    } finally {
      setSendingMaintenanceReminder(false)
    }
  }

  const sendBulkMaintenanceReminder = async () => {
    if (selectedResidents.length === 0) {
      toast({
        title: "No Residents Selected",
        description: "Please select at least one resident to send reminders",
        variant: "destructive",
      })
      return
    }

    setSendingBulkReminder(true)
    try {
      const response = await fetch("/api/maintenance/bulk-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileIds: selectedResidents }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Reminders Sent",
          description: `Successfully sent ${result.sent} reminders${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
        })
        setSelectedResidents([]) // Clear selection after sending
      } else {
        throw new Error(result.error || "Failed to send reminders")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send maintenance reminders",
        variant: "destructive",
      })
    } finally {
      setSendingBulkReminder(false)
    }
  }

  const toggleResidentSelection = (profileId: string) => {
    setSelectedResidents(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    )
  }

  const toggleAllUnpaidResidents = () => {
    const unpaidResidents = filteredProfiles.filter((p: Profile) => !p.maintenance_paid)
    if (selectedResidents.length === unpaidResidents.length) {
      setSelectedResidents([])
    } else {
      setSelectedResidents(unpaidResidents.map((p: Profile) => p.id))
    }
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Filter logic for profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const matchesSearch =
        !searchTerm ||
        profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.phone_number?.includes(searchTerm) ||
        profile.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesMaintenance =
        maintenanceFilter === "all" ||
        (maintenanceFilter === "paid" && profile.maintenance_paid) ||
        (maintenanceFilter === "unpaid" && !profile.maintenance_paid)

      return matchesSearch && matchesMaintenance
    })
  }, [profiles, searchTerm, maintenanceFilter])

  // Filter logic for bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesSearch =
        !searchTerm ||
        booking.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.profiles?.phone_number?.includes(searchTerm) ||
        formatDateForDisplay(booking.booking_date).includes(searchTerm)

      const matchesDate = !dateFilter || booking.booking_date === dateFilter
      const matchesStatus = statusFilter === "all" || booking.status === statusFilter

      return matchesSearch && matchesDate && matchesStatus
    })
  }, [bookings, searchTerm, dateFilter, statusFilter])

  // Filter logic for complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const matchesSearch =
        !searchTerm ||
        complaint.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.profiles?.phone_number?.includes(searchTerm) ||
        complaint.complaint_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.subcategory.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = complaintStatusFilter === "all" || complaint.status === complaintStatusFilter

      return matchesSearch && matchesStatus
    })
  }, [complaints, searchTerm, complaintStatusFilter])

  const residentsDisplay = useMemo(
    () => filterByPeriod(filteredProfiles, residentsPeriod, (p) => p.created_at),
    [filteredProfiles, residentsPeriod],
  )
  const bookingsDisplay = useMemo(
    () => filterByPeriod(filteredBookings, bookingsPeriod, (b) => b.booking_date),
    [filteredBookings, bookingsPeriod],
  )
  const complaintsDisplay = useMemo(
    () => filterByPeriod(filteredComplaints, complaintsPeriod, (c) => c.created_at),
    [filteredComplaints, complaintsPeriod],
  )

  // Pagination logic
  const paginatedResidents = useMemo(() => {
    const startIndex = (residentsPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return residentsDisplay.slice(startIndex, endIndex)
  }, [residentsDisplay, residentsPage, itemsPerPage])

  const paginatedBookings = useMemo(() => {
    const startIndex = (bookingsPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return bookingsDisplay.slice(startIndex, endIndex)
  }, [bookingsDisplay, bookingsPage, itemsPerPage])

  const paginatedComplaints = useMemo(() => {
    const startIndex = (complaintsPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return complaintsDisplay.slice(startIndex, endIndex)
  }, [complaintsDisplay, complaintsPage, itemsPerPage])

  // Calculate total pages
  const totalResidentsPages = Math.ceil(residentsDisplay.length / itemsPerPage)
  const totalBookingsPages = Math.ceil(bookingsDisplay.length / itemsPerPage)
  const totalComplaintsPages = Math.ceil(complaintsDisplay.length / itemsPerPage)

  // Reset to page 1 when filters change
  useEffect(() => {
    setResidentsPage(1)
  }, [searchTerm, maintenanceFilter, residentsPeriod])

  useEffect(() => {
    setBookingsPage(1)
  }, [searchTerm, dateFilter, statusFilter, bookingsPeriod])

  useEffect(() => {
    setComplaintsPage(1)
  }, [searchTerm, complaintStatusFilter, complaintsPeriod])

  const stats = useMemo(() => {
    const totalBookings = bookings.filter((b) => b.status === "confirmed").length
    const todayBookings = bookings.filter(
      (b) => b.booking_date === new Date().toISOString().split("T")[0] && b.status === "confirmed",
    ).length
    const pendingComplaints = complaints.filter((c) => c.status === "pending").length
    const unpaidMaintenance = profiles.filter((p) => !p.maintenance_paid).length
    const pendingPayments = bookings.filter((b) => b.payment_status === "pending").length
    const totalRevenue = bookings
      .filter((b) => b.payment_status === "paid")
      .reduce((sum, b) => sum + b.booking_charges, 0)

    return { totalBookings, todayBookings, pendingComplaints, unpaidMaintenance, pendingPayments, totalRevenue }
  }, [bookings, complaints, profiles])

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
      case "completed":
      case "paid":
        return "default"
      case "pending":
      case "unpaid":
        return "secondary"
      case "in-progress":
        return "outline"
      case "cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const editUser = async () => {
    if (!editingUser || !editingUser.name || !editingUser.phone_number || !editingUser.apartment_number) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        name: editingUser.name,
        phone_number: editingUser.phone_number.startsWith("+")
          ? editingUser.phone_number
          : `+${editingUser.phone_number}`,
        cnic: editingUser.cnic,
        apartment_number: editingUser.apartment_number,
        maintenance_charges: editingUser.maintenance_charges,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingUser.id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update user: " + error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "User updated successfully",
      })
      setEditingUser(null)
      setIsEditUserOpen(false)
      fetchProfiles()
    }
  }

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return
    }

    const { error } = await supabase.from("profiles").delete().eq("id", userId)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete user: " + error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "User deleted successfully",
      })
      fetchProfiles()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="grid gap-4 md:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Mobile-optimized container */}
      <div className="container mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Enhanced Header - Mobile Responsive */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border-0 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Title Section with Logo */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <Image
                src="/manzhil_logo-no_bg.png"
                alt="Manzhil Logo"
                width={60}
                height={60}
                className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 object-contain flex-shrink-0"
                priority
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium bg-gradient-to-r from-manzhil-dark to-manzhil-teal bg-clip-text text-transparent truncate">
                  Manzhil for Greens Three
                </h1>
                <p className="text-gray-600 text-sm sm:text-base lg:text-lg mt-1 font-light">Admin Panel</p>
              </div>
            </div>

            {/* Action Buttons - Responsive */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {/* deleted button change <Button
                onClick={triggerBookingReminder}
                disabled={sendingBookingReminder}
                variant="outline"
                className="gap-2 bg-white hover:bg-green-50 border-2 border-green-200 shadow-md hover:shadow-lg transition-all duration-200"
              >
                {sendingBookingReminder ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Booking Reminder(only for testing)</span>
                  </>
                )}
              </Button> */}

              <Button
                onClick={triggerMaintenanceReminder}
                disabled={sendingMaintenanceReminder}
                variant="outline"
                className="gap-2 bg-white hover:bg-orange-50 border-2 border-orange-200 shadow-md hover:shadow-lg transition-all duration-200 text-xs sm:text-sm min-h-[44px]"
              >
                {sendingMaintenanceReminder ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
                    <span className="hidden sm:inline">Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 text-orange-600" />
                    <span className="text-orange-600 hidden lg:inline">Maintenance Reminder(only for testing)</span>
                    <span className="text-orange-600 lg:hidden">Reminder</span>
                  </>
                )}
              </Button>

              <Button
                onClick={refreshData}
                variant="outline"
                disabled={refreshing}
                className="gap-2 bg-manzhil-dark hover:bg-manzhil-teal text-white shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px]"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              {/* Realtime Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border-2 border-gray-200 min-h-[44px]">
                <div className={`h-2 w-2 rounded-full ${realtimeConnected
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-gray-400'
                  }`} />
                <span className="text-xs text-gray-600">
                  {realtimeConnected ? 'Live' : 'Connecting...'}
                </span>
              </div>

              <UserMenu onSettingsClick={() => setSettingsOpen(true)} />
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards - Mobile Responsive */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-manzhil-dark to-manzhil-teal text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-normal text-white/90">Total Residents</CardTitle>
              <Users className="h-5 w-5 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium">{profiles.length}</div>
              <p className="text-xs text-white/80 mt-1 font-light">Active community members</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-manzhil-teal to-manzhil-dark text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-normal text-white/90">Active Bookings</CardTitle>
              <Calendar className="h-5 w-5 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium">{stats.totalBookings}</div>
              <p className="text-xs text-white/80 mt-1 font-light">Confirmed reservations</p>
            </CardContent>
          </Card>

          {/* <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">Pending Issues</CardTitle>
              <AlertTriangle className="h-5 w-5 text-orange-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingComplaints}</div>
              <p className="text-xs text-orange-200 mt-1">Awaiting resolution</p>
            </CardContent>
          </Card> */}

          {/* <Card className="border-0 shadow-xl bg-gradient-to-br from-red-500 to-red-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-100">Unpaid Maintenance</CardTitle>
              <CreditCard className="h-5 w-5 text-red-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.unpaidMaintenance}</div>
              <p className="text-xs text-red-200 mt-1">Outstanding payments</p>
            </CardContent>
          </Card> */}

          <Card className="border-0 shadow-xl bg-gradient-to-br from-manzhil-dark to-manzhil-teal text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-normal text-white/90">Pending Payments</CardTitle>
              <Clock className="h-5 w-5 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium">{stats.pendingPayments}</div>
              <p className="text-xs text-white/80 mt-1 font-light">Booking payments due</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-manzhil-teal to-manzhil-dark text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-normal text-white/90">Today&apos;s Bookings</CardTitle>
              <Calendar className="h-5 w-5 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium">{stats.todayBookings}</div>
              <p className="text-xs text-white/80 mt-1 font-light">Confirmed for today</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
          <Tabs defaultValue="residents" className="w-full" value={activeTab} onValueChange={(value) => {
            console.log('Tab changed to:', value)
            setActiveTab(value)
            // Mark items as viewed when switching to that tab
            if (value === "bookings") {
              setTimeout(() => {
                console.log('Marking bookings as viewed')
                setLastViewedBookings(Date.now())
                setForceUpdate(prev => prev + 1) // Force re-render to update badge
              }, 3000) // 3 second delay
            } else if (value === "complaints") {
              setTimeout(() => {
                console.log('Marking complaints as viewed')
                setLastViewedComplaints(Date.now())
                setForceUpdate(prev => prev + 1) // Force re-render to update badge
              }, 3000) // 3 second delay
            } else if (value === "feedback") {
              setTimeout(() => {
                const newTimestamp = Date.now()
                console.log('Marking feedback as viewed')
                console.log('Old lastViewedFeedback:', new Date(lastViewedFeedback).toLocaleString())
                console.log('New lastViewedFeedback:', new Date(newTimestamp).toLocaleString())
                console.log('Feedback items:', feedback.map(f => ({
                  created: new Date(f.created_at).toLocaleString(),
                  createdTimestamp: new Date(f.created_at).getTime(),
                  isAfterOld: new Date(f.created_at).getTime() > lastViewedFeedback,
                  isAfterNew: new Date(f.created_at).getTime() > newTimestamp
                })))
                setLastViewedFeedback(newTimestamp)
                setForceUpdate(prev => prev + 1) // Force re-render to update badge
              }, 3000) // 3 second delay
            }
          }}>
            <div className="border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
              <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 bg-transparent h-auto sm:h-16 p-2 gap-2">
                <TabsTrigger
                  value="residents"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-normal text-gray-600 data-[state=active]:text-manzhil-dark data-[state=active]:font-medium transition-all duration-200 min-h-[44px] text-xs sm:text-sm"
                >
                  <Users className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Residents</span>
                </TabsTrigger>
                <TabsTrigger
                  value="bookings"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-manzhil-teal transition-all duration-200 min-h-[44px] text-xs sm:text-sm"
                >
                  <Calendar className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Bookings</span>
                  {newBookingsCount > 0 && (
                    <Badge className="ml-1 sm:ml-2 bg-manzhil-teal hover:bg-manzhil-dark text-white text-xs">
                      {newBookingsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="complaints"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-orange-600 transition-all duration-200 min-h-[44px] text-xs sm:text-sm"
                >
                  <AlertTriangle className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Complaints</span>
                  {newComplaintsCount > 0 && (
                    <Badge className="ml-1 sm:ml-2 bg-orange-500 hover:bg-orange-600 text-white text-xs">
                      {newComplaintsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="grouped-complaints"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-normal text-gray-600 data-[state=active]:text-manzhil-dark data-[state=active]:font-medium transition-all duration-200 min-h-[44px] text-xs sm:text-sm"
                >
                  <BarChart3 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger
                  value="feedback"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-manzhil-teal transition-all duration-200 min-h-[44px] text-xs sm:text-sm"
                >
                  <MessageSquare className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Feedback</span>
                  {newFeedbackCount > 0 && (
                    <Badge className="ml-1 sm:ml-2 bg-manzhil-teal hover:bg-manzhil-dark text-white text-xs">
                      {newFeedbackCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="accounting"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-medium text-gray-600 data-[state=active]:text-emerald-600 transition-all duration-200 min-h-[44px] text-xs sm:text-sm"
                >
                  <Wallet className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Accounting</span>
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-xl font-normal text-gray-600 data-[state=active]:text-manzhil-dark data-[state=active]:font-medium transition-all duration-200 min-h-[44px] text-xs sm:text-sm"
                >
                  <Settings className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Settings</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Residents Tab */}
            <TabsContent value="residents" className="p-4 sm:p-6">
              <div className="space-y-6">
                {/* Header Section */}
                <div className="text-center">
                  <h2 className="text-2xl font-normal text-gray-900 flex items-center justify-center gap-2">
                    <Users className="h-6 w-6 text-blue-600" />
                    Residents Management
                  </h2>
                  <p className="text-gray-600 mt-1 font-light">Manage community residents and their information</p>
                </div>

                {/* Filters and Actions */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search residents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
                      <SelectTrigger className="w-full sm:w-40 border-gray-200">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Bulk Maintenance Reminder Button */}
                    {selectedResidents.length > 0 && (
                      <Button
                        onClick={sendBulkMaintenanceReminder}
                        disabled={sendingBulkReminder}
                        className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        {sendingBulkReminder ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Send Reminder ({selectedResidents.length})
                          </>
                        )}
                      </Button>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                      <Select
                        value={residentsPeriod}
                        onValueChange={(value) => setResidentsPeriod(value as Period)}
                      >
                        <SelectTrigger className="w-full sm:w-40 border-gray-200 min-h-[44px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="daily">Today</SelectItem>
                          <SelectItem value="weekly">This Week</SelectItem>
                          <SelectItem value="monthly">This Month</SelectItem>
                          <SelectItem value="yearly">This Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => {
                          void exportToPdf({
                            title: "Residents Report",
                            periodLabel: periodLabel(residentsPeriod),
                            columns: [
                              { header: "Name", dataKey: "name" },
                              { header: "Phone", dataKey: "phone" },
                              { header: "Apartment", dataKey: "apartment" },
                              { header: "Maintenance (Rs)", dataKey: "maintenance" },
                              { header: "Status", dataKey: "status" },
                            ],
                            rows: residentsDisplay.map((p) => ({
                              name: p.name || "N/A",
                              phone: p.phone_number || "N/A",
                              apartment: p.apartment_number || "N/A",
                              maintenance: `Rs. ${p.maintenance_charges.toLocaleString()}`,
                              status: p.maintenance_paid ? "Paid" : "Unpaid",
                            })),
                            filtersSummary: searchTerm ? `Search: ${searchTerm}` : undefined,
                            fileName: `residents-${residentsPeriod}-filtered.pdf`,
                          })
                        }}
                        variant="outline"
                        className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50 w-full sm:w-auto min-h-[44px]"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden lg:inline">Download PDF (filtered)</span>
                        <span className="lg:hidden">PDF (filtered)</span>
                      </Button>
                      <Button
                        onClick={() => {
                          const allResidents = filterByPeriod(profiles, residentsPeriod, (p) => p.created_at)
                          void exportToPdf({
                            title: "Residents Report",
                            periodLabel: periodLabel(residentsPeriod),
                            columns: [
                              { header: "Name", dataKey: "name" },
                              { header: "Phone", dataKey: "phone" },
                              { header: "Apartment", dataKey: "apartment" },
                              { header: "Maintenance (Rs)", dataKey: "maintenance" },
                              { header: "Status", dataKey: "status" },
                            ],
                            rows: allResidents.map((p) => ({
                              name: p.name || "N/A",
                              phone: p.phone_number || "N/A",
                              apartment: p.apartment_number || "N/A",
                              maintenance: `Rs. ${p.maintenance_charges.toLocaleString()}`,
                              status: p.maintenance_paid ? "Paid" : "Unpaid",
                            })),
                            fileName: `residents-${residentsPeriod}-all.pdf`,
                          })
                        }}
                        variant="outline"
                        className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-50 w-full sm:w-auto min-h-[44px]"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden lg:inline">Download PDF (all)</span>
                        <span className="lg:hidden">PDF (all)</span>
                      </Button>
                    </div>

                    <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2 bg-manzhil-dark hover:bg-manzhil-teal shadow-lg hover:shadow-xl transition-all duration-200">
                          <UserPlus className="h-4 w-4" />
                          Add Resident
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-normal">Add New Resident</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right font-normal">
                              Name *
                            </Label>
                            <Input
                              id="name"
                              value={newUser.name}
                              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                              className="col-span-3"
                              placeholder="Enter full name"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right font-normal">
                              Phone *
                            </Label>
                            <Input
                              id="phone"
                              value={newUser.phone_number}
                              onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                              className="col-span-3"
                              placeholder="+1234567890"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="apartment" className="text-right font-normal">
                              Apartment *
                            </Label>
                            <Input
                              id="apartment"
                              value={newUser.apartment_number}
                              onChange={(e) => setNewUser({ ...newUser, apartment_number: e.target.value })}
                              className="col-span-3"
                              placeholder="A-101"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cnic" className="text-right font-normal">
                              CNIC
                            </Label>
                            <Input
                              id="cnic"
                              value={newUser.cnic}
                              onChange={(e) => setNewUser({ ...newUser, cnic: e.target.value })}
                              className="col-span-3"
                              placeholder="12345-6789012-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="maintenance" className="text-right font-normal">
                              Maintenance
                            </Label>
                            <Input
                              id="maintenance"
                              type="number"
                              value={newUser.maintenance_charges}
                              onChange={(e) => setNewUser({ ...newUser, maintenance_charges: Number(e.target.value) })}
                              className="col-span-3"
                              placeholder="5000"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={addNewUser} className="bg-manzhil-dark hover:bg-manzhil-teal">
                            Add Resident
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Desktop Table View - Hidden on Mobile */}
                <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedResidents.length === filteredProfiles.filter((p: Profile) => !p.maintenance_paid).length && filteredProfiles.filter((p: Profile) => !p.maintenance_paid).length > 0}
                            onCheckedChange={toggleAllUnpaidResidents}
                            aria-label="Select all unpaid residents"
                          />
                        </TableHead>
                        <TableHead className="font-normal text-gray-700">Name</TableHead>
                        <TableHead className="font-normal text-gray-700">Phone</TableHead>
                        <TableHead className="font-normal text-gray-700">Apartment</TableHead>
                        <TableHead className="font-normal text-gray-700">Maintenance</TableHead>
                        <TableHead className="font-normal text-gray-700">Status</TableHead>
                        <TableHead className="text-right font-normal text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {residentsDisplay.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg font-normal">
                              {profiles.length === 0 ? "No residents yet" : "No residents match your filters"}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              {profiles.length === 0
                                ? "Add your first resident to get started"
                                : "Try adjusting your search criteria or period"}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedResidents.map((profile) => (
                          <TableRow key={profile.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell>
                              <Checkbox
                                checked={selectedResidents.includes(profile.id)}
                                onCheckedChange={() => toggleResidentSelection(profile.id)}
                                disabled={profile.maintenance_paid}
                                aria-label={`Select ${profile.name}`}
                              />
                            </TableCell>
                            <TableCell className="font-normal text-gray-900">{profile.name}</TableCell>
                            <TableCell className="text-gray-600">{profile.phone_number}</TableCell>
                            <TableCell className="text-gray-600">{profile.apartment_number}</TableCell>
                            <TableCell className="text-gray-600">
                              Rs. {profile.maintenance_charges.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={profile.maintenance_paid ? "default" : "destructive"}
                                className={
                                  profile.maintenance_paid ? "bg-green-100 text-green-800 hover:bg-green-200" : ""
                                }
                              >
                                {profile.maintenance_paid ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Paid
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Unpaid
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Link href={`/admin/residents/${profile.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="hover:bg-blue-50 hover:border-blue-200 bg-transparent"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Open Profile
                                  </Button>
                                </Link>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser(profile)
                                    setIsEditUserOpen(true)
                                  }}
                                  className="hover:bg-blue-50 hover:border-blue-200 text-blue-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateMaintenanceStatus(profile.id, !profile.maintenance_paid)}
                                  disabled={updatingMaintenanceId === profile.id}
                                  className={
                                    profile.maintenance_paid
                                      ? "hover:bg-red-50 hover:border-red-200 text-red-600"
                                      : "hover:bg-green-50 hover:border-green-200 text-green-600"
                                  }
                                >
                                  {updatingMaintenanceId === profile.id ? (
                                    <>
                                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                                      Processing...
                                    </>
                                  ) : profile.maintenance_paid ? (
                                    <>
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Mark Unpaid
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Mark Paid
                                    </>
                                  )}
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteUser(profile.id, profile.name)}
                                  className="hover:bg-red-50 hover:border-red-200 text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View - Hidden on Desktop */}
                <div className="lg:hidden space-y-4">
                  {residentsDisplay.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-normal">
                        {profiles.length === 0 ? "No residents yet" : "No residents match your filters"}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {profiles.length === 0
                          ? "Add your first resident to get started"
                          : "Try adjusting your search criteria"}
                      </p>
                    </div>
                  ) : (
                    paginatedResidents.map((profile) => (
                      <Card key={profile.id} className="border-gray-200 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Checkbox
                                  checked={selectedResidents.includes(profile.id)}
                                  onCheckedChange={() => toggleResidentSelection(profile.id)}
                                  disabled={profile.maintenance_paid}
                                  aria-label={`Select ${profile.name}`}
                                />
                                <h3 className="font-normal text-gray-900 truncate">{profile.name}</h3>
                              </div>
                              <p className="text-sm text-gray-600">{profile.phone_number}</p>
                            </div>
                            <Badge
                              variant={profile.maintenance_paid ? "default" : "destructive"}
                              className={
                                profile.maintenance_paid ? "bg-green-100 text-green-800 hover:bg-green-200" : ""
                              }
                            >
                              {profile.maintenance_paid ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Paid
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Unpaid
                                </>
                              )}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                            <div>
                              <span className="text-gray-500">Apartment:</span>
                              <p className="font-normal text-gray-900">{profile.apartment_number}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Maintenance:</span>
                              <p className="font-normal text-gray-900">Rs. {profile.maintenance_charges.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Link href={`/admin/residents/${profile.id}`} className="flex-1 min-w-[120px]">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full hover:bg-blue-50 hover:border-blue-200 min-h-[44px]"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </Link>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingUser(profile)
                                setIsEditUserOpen(true)
                              }}
                              className="hover:bg-blue-50 hover:border-blue-200 text-blue-600 min-h-[44px]"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateMaintenanceStatus(profile.id, !profile.maintenance_paid)}
                              disabled={updatingMaintenanceId === profile.id}
                              className={`min-h-[44px] ${profile.maintenance_paid
                                ? "hover:bg-red-50 hover:border-red-200 text-red-600"
                                : "hover:bg-green-50 hover:border-green-200 text-green-600"
                                }`}
                            >
                              {updatingMaintenanceId === profile.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : profile.maintenance_paid ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteUser(profile.id, profile.name)}
                              className="hover:bg-red-50 hover:border-red-200 text-red-600 min-h-[44px]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Pagination - Shared by both views */}
                {totalResidentsPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (residentsPage > 1) setResidentsPage(residentsPage - 1)
                            }}
                            className={residentsPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {Array.from({ length: totalResidentsPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                setResidentsPage(page)
                              }}
                              isActive={residentsPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (residentsPage < totalResidentsPages) setResidentsPage(residentsPage + 1)
                            }}
                            className={residentsPage === totalResidentsPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="p-4 sm:p-6">
              <div className="space-y-6">
                {/* Header Section */}
                <div className="text-center">
                  <h2 className="text-2xl font-normal text-gray-900 flex items-center justify-center gap-2">
                    <Calendar className="h-6 w-6 text-green-600" />
                    Bookings Management
                  </h2>
                  <p className="text-gray-600 mt-1 font-light">Track and manage community hall bookings</p>
                </div>

                {/* Filters and Actions */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search bookings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64 border-gray-200 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>

                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full sm:w-auto border-gray-200"
                    />

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40 border-gray-200">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                      <Select value={bookingsPeriod} onValueChange={(value) => setBookingsPeriod(value as Period)}>
                        <SelectTrigger className="w-full sm:w-40 border-gray-200 min-h-[44px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="daily">Today</SelectItem>
                          <SelectItem value="weekly">This Week</SelectItem>
                          <SelectItem value="monthly">This Month</SelectItem>
                          <SelectItem value="yearly">This Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => {
                          void exportToPdf({
                            title: "Bookings Report",
                            periodLabel: periodLabel(bookingsPeriod),
                            columns: [
                              { header: "Customer", dataKey: "customer" },
                              { header: "Apartment", dataKey: "apartment" },
                              { header: "Date", dataKey: "date" },
                              { header: "Time", dataKey: "time" },
                              { header: "Amount", dataKey: "amount" },
                              { header: "Payment", dataKey: "payment" },
                              { header: "Status", dataKey: "status" },
                            ],
                            rows: bookingsDisplay.map((b) => ({
                              customer: b.profiles?.name || "N/A",
                              apartment: b.profiles?.apartment_number || "",
                              date: formatDateForDisplay(b.booking_date),
                              time: `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
                              amount: `Rs. ${b.booking_charges.toLocaleString()}`,
                              payment: b.payment_status,
                              status: b.status,
                            })),
                            filtersSummary: searchTerm ? `Search: ${searchTerm}` : undefined,
                            fileName: `bookings-${bookingsPeriod}-filtered.pdf`,
                          })
                        }}
                        variant="outline"
                        className="gap-2 border-green-500 text-green-600 hover:bg-green-50 w-full sm:w-auto min-h-[44px]"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden lg:inline">Download PDF (filtered)</span>
                        <span className="lg:hidden">PDF (filtered)</span>
                      </Button>
                      <Button
                        onClick={() => {
                          const allBookings = filterByPeriod(bookings, bookingsPeriod, (b) => b.booking_date)
                          void exportToPdf({
                            title: "Bookings Report",
                            periodLabel: periodLabel(bookingsPeriod),
                            columns: [
                              { header: "Customer", dataKey: "customer" },
                              { header: "Apartment", dataKey: "apartment" },
                              { header: "Date", dataKey: "date" },
                              { header: "Time", dataKey: "time" },
                              { header: "Amount", dataKey: "amount" },
                              { header: "Payment", dataKey: "payment" },
                              { header: "Status", dataKey: "status" },
                            ],
                            rows: allBookings.map((b) => ({
                              customer: b.profiles?.name || "N/A",
                              apartment: b.profiles?.apartment_number || "",
                              date: formatDateForDisplay(b.booking_date),
                              time: `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
                              amount: `Rs. ${b.booking_charges.toLocaleString()}`,
                              payment: b.payment_status,
                              status: b.status,
                            })),
                            fileName: `bookings-${bookingsPeriod}-all.pdf`,
                          })
                        }}
                        variant="outline"
                        className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-50 w-full sm:w-auto min-h-[44px]"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden lg:inline">Download PDF (all)</span>
                        <span className="lg:hidden">PDF (all)</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Desktop Table View - Hidden on Mobile */}
                <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="font-normal text-gray-700">Customer</TableHead>
                        <TableHead className="font-normal text-gray-700">Apartment</TableHead>
                        <TableHead className="font-normal text-gray-700">Date</TableHead>
                        <TableHead className="font-normal text-gray-700">Time Slot</TableHead>
                        <TableHead className="font-normal text-gray-700">Amount</TableHead>
                        <TableHead className="font-normal text-gray-700">Payment</TableHead>
                        <TableHead className="font-normal text-gray-700">Status</TableHead>
                        <TableHead className="text-right font-normal text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingsDisplay.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12">
                            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg font-normal">
                              {bookings.length === 0 ? "No bookings yet" : "No bookings match your filters"}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              {bookings.length === 0
                                ? "Bookings will appear here once residents start booking"
                                : "Try adjusting your search, status, or period filters"}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedBookings.map((booking) => (
                          <TableRow key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-normal text-gray-900">
                              <div className="flex items-center gap-2">
                                {booking.profiles?.name || "N/A"}
                                {isNewBooking(booking.created_at) && (
                                  <Badge className="bg-manzhil-teal hover:bg-manzhil-dark text-white text-xs animate-pulse">
                                    NEW
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600">{booking.profiles?.apartment_number}</TableCell>
                            <TableCell className="text-gray-600">
                              {formatDateForDisplay(booking.booking_date)}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              Rs. {booking.booking_charges.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusBadgeVariant(booking.payment_status)}
                                className={
                                  booking.payment_status === "paid"
                                    ? "bg-manzhil-teal/20 text-manzhil-dark hover:bg-manzhil-teal/30"
                                    : ""
                                }
                              >
                                {booking.payment_status === "paid" ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Paid
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(booking.status)}>
                                {booking.status === "confirmed" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {booking.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
                                {booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                {booking.payment_status === "pending" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateBookingPaymentStatus(booking.id, "paid")}
                                    disabled={updatingPaymentId === booking.id}
                                    className="hover:bg-green-50 hover:border-green-200 text-green-600"
                                  >
                                    {updatingPaymentId === booking.id ? (
                                      <>
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-green-600 border-t-transparent mr-1" />
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Mark Paid
                                      </>
                                    )}
                                  </Button>
                                ) : booking.payment_status === "paid" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateBookingPaymentStatus(booking.id, "pending")}
                                    disabled={updatingPaymentId === booking.id}
                                    className="hover:bg-red-50 hover:border-red-200 text-red-600"
                                  >
                                    {updatingPaymentId === booking.id ? (
                                      <>
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent mr-1" />
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Mark Unpaid
                                      </>
                                    )}
                                  </Button>
                                ) : null}

                                {booking.status === "confirmed" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => cancelBooking(booking.id)}
                                    className="hover:bg-red-50 hover:border-red-200 text-red-600"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View - Hidden on Desktop */}
                <div className="lg:hidden space-y-4">
                  {bookingsDisplay.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                      <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-normal">
                        {bookings.length === 0 ? "No bookings yet" : "No bookings match your filters"}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {bookings.length === 0
                          ? "Bookings will appear here once residents start booking"
                          : "Try adjusting your filters"}
                      </p>
                    </div>
                  ) : (
                    paginatedBookings.map((booking) => (
                      <Card key={booking.id} className="border-gray-200 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-normal text-gray-900 truncate">{booking.profiles?.name || "N/A"}</h3>
                                {isNewBooking(booking.created_at) && (
                                  <Badge className="bg-manzhil-teal hover:bg-manzhil-dark text-white text-xs animate-pulse">
                                    NEW
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{booking.profiles?.apartment_number}</p>
                            </div>
                            <Badge variant={getStatusBadgeVariant(booking.status)}>
                              {booking.status === "confirmed" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {booking.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
                              {booking.status}
                            </Badge>
                          </div>

                          <div className="space-y-2 mb-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Date:</span>
                              <span className="font-normal text-gray-900">{formatDateForDisplay(booking.booking_date)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Time:</span>
                              <span className="font-normal text-gray-900">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Amount:</span>
                              <span className="font-normal text-gray-900">Rs. {booking.booking_charges.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Payment:</span>
                              <Badge
                                variant={getStatusBadgeVariant(booking.payment_status)}
                                className={
                                  booking.payment_status === "paid"
                                    ? "bg-manzhil-teal/20 text-manzhil-dark hover:bg-manzhil-teal/30"
                                    : ""
                                }
                              >
                                {booking.payment_status === "paid" ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Paid
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </>
                                )}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {booking.payment_status === "pending" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateBookingPaymentStatus(booking.id, "paid")}
                                disabled={updatingPaymentId === booking.id}
                                className="flex-1 hover:bg-green-50 hover:border-green-200 text-green-600 min-h-[44px]"
                              >
                                {updatingPaymentId === booking.id ? (
                                  <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent mr-1" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Mark Paid
                                  </>
                                )}
                              </Button>
                            ) : booking.payment_status === "paid" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateBookingPaymentStatus(booking.id, "pending")}
                                disabled={updatingPaymentId === booking.id}
                                className="flex-1 hover:bg-red-50 hover:border-red-200 text-red-600 min-h-[44px]"
                              >
                                {updatingPaymentId === booking.id ? (
                                  <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent mr-1" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Mark Unpaid
                                  </>
                                )}
                              </Button>
                            ) : null}

                            {booking.status === "confirmed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelBooking(booking.id)}
                                className="flex-1 hover:bg-red-50 hover:border-red-200 text-red-600 min-h-[44px]"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Pagination - Shared by both views */}
                {totalBookingsPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (bookingsPage > 1) setBookingsPage(bookingsPage - 1)
                            }}
                            className={bookingsPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {Array.from({ length: totalBookingsPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                setBookingsPage(page)
                              }}
                              isActive={bookingsPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (bookingsPage < totalBookingsPages) setBookingsPage(bookingsPage + 1)
                            }}
                            className={bookingsPage === totalBookingsPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Complaints Tab */}
            <TabsContent value="complaints" className="p-4 sm:p-6">
              <div className="space-y-6">
                {/* Header Section */}
                <div className="text-center">
                  <h2 className="text-2xl font-normal text-gray-900 flex items-center justify-center gap-2">
                    <MessageSquare className="h-6 w-6 text-orange-600" />
                    Individual Complaints
                  </h2>
                  <p className="text-gray-600 mt-1 font-light">Track and resolve resident complaints</p>
                </div>

                {/* Filters and Actions */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search complaints..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>

                    <Select value={complaintStatusFilter} onValueChange={setComplaintStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40 border-gray-200">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                      <Select
                        value={complaintsPeriod}
                        onValueChange={(value) => setComplaintsPeriod(value as Period)}
                      >
                        <SelectTrigger className="w-full sm:w-40 border-gray-200 min-h-[44px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="daily">Today</SelectItem>
                          <SelectItem value="weekly">This Week</SelectItem>
                          <SelectItem value="monthly">This Month</SelectItem>
                          <SelectItem value="yearly">This Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => {
                          void exportToPdf({
                            title: "Complaints Report",
                            periodLabel: periodLabel(complaintsPeriod),
                            columns: [
                              { header: "Complaint ID", dataKey: "complaintId" },
                              { header: "Customer", dataKey: "customer" },
                              { header: "Apartment", dataKey: "apartment" },
                              { header: "Category", dataKey: "category" },
                              { header: "Type", dataKey: "type" },
                              { header: "Status", dataKey: "status" },
                              { header: "Created", dataKey: "created" },
                            ],
                            rows: complaintsDisplay.map((c) => ({
                              complaintId: c.complaint_id,
                              customer: c.profiles?.name || "N/A",
                              apartment: c.profiles?.apartment_number || "",
                              category: c.category,
                              type: c.subcategory,
                              status: c.status,
                              created: formatDateTime(c.created_at),
                            })),
                            filtersSummary: searchTerm ? `Search: ${searchTerm}` : undefined,
                            fileName: `complaints-${complaintsPeriod}-filtered.pdf`,
                          })
                        }}
                        variant="outline"
                        className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50 w-full sm:w-auto min-h-[44px]"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden lg:inline">Download PDF (filtered)</span>
                        <span className="lg:hidden">PDF (filtered)</span>
                      </Button>
                      <Button
                        onClick={() => {
                          const allComplaints = filterByPeriod(complaints, complaintsPeriod, (c) => c.created_at)
                          void exportToPdf({
                            title: "Complaints Report",
                            periodLabel: periodLabel(complaintsPeriod),
                            columns: [
                              { header: "Complaint ID", dataKey: "complaintId" },
                              { header: "Customer", dataKey: "customer" },
                              { header: "Apartment", dataKey: "apartment" },
                              { header: "Category", dataKey: "category" },
                              { header: "Type", dataKey: "type" },
                              { header: "Status", dataKey: "status" },
                              { header: "Created", dataKey: "created" },
                            ],
                            rows: allComplaints.map((c) => ({
                              complaintId: c.complaint_id,
                              customer: c.profiles?.name || "N/A",
                              apartment: c.profiles?.apartment_number || "",
                              category: c.category,
                              type: c.subcategory,
                              status: c.status,
                              created: formatDateTime(c.created_at),
                            })),
                            fileName: `complaints-${complaintsPeriod}-all.pdf`,
                          })
                        }}
                        variant="outline"
                        className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-50 w-full sm:w-auto min-h-[44px]"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden lg:inline">Download PDF (all)</span>
                        <span className="lg:hidden">PDF (all)</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Desktop Table View - Hidden on Mobile */}
                <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="font-normal text-gray-700">Complaint ID</TableHead>
                        <TableHead className="font-normal text-gray-700">Customer</TableHead>
                        <TableHead className="font-normal text-gray-700">Apartment</TableHead>
                        <TableHead className="font-normal text-gray-700">Category</TableHead>
                        <TableHead className="font-normal text-gray-700">Type</TableHead>
                        <TableHead className="font-normal text-gray-700">Status</TableHead>
                        <TableHead className="font-normal text-gray-700">Created</TableHead>
                        <TableHead className="text-right font-normal text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complaintsDisplay.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12">
                            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg font-normal">
                              {complaints.length === 0 ? "No complaints yet" : "No complaints match your filters"}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              {complaints.length === 0
                                ? "Complaints will appear here when residents report issues"
                                : "Try adjusting your search, status, or period filters"}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedComplaints.map((complaint) => (
                          <TableRow key={complaint.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-normal text-gray-900">
                              <div className="flex items-center gap-2">
                                {complaint.complaint_id}
                                {isNewComplaint(complaint.created_at) && (
                                  <Badge className="bg-manzhil-teal hover:bg-manzhil-dark text-white text-xs animate-pulse">
                                    NEW
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600">{complaint.profiles?.name || "N/A"}</TableCell>
                            <TableCell className="text-gray-600">{complaint.profiles?.apartment_number}</TableCell>
                            <TableCell className="text-gray-600 capitalize">{complaint.category}</TableCell>
                            <TableCell className="text-gray-600 capitalize">{complaint.subcategory}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(complaint.status)}>
                                {complaint.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {complaint.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                {complaint.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
                                {complaint.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600">{formatDateTime(complaint.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedComplaint(complaint)}
                                      className="hover:bg-orange-50 hover:border-orange-200"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[600px]">
                                    <DialogHeader>
                                      <DialogTitle className="text-xl font-normal">Complaint Details</DialogTitle>
                                    </DialogHeader>
                                    {selectedComplaint && (
                                      <div className="grid gap-6 py-4">
                                        <div className="grid grid-cols-2 gap-6">
                                          <div className="space-y-2">
                                            <Label className="text-sm font-normal text-gray-700">Complaint ID</Label>
                                            <p className="text-gray-900 font-normal">
                                              {selectedComplaint.complaint_id}
                                            </p>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-sm font-normal text-gray-700">Status</Label>
                                            <Badge variant={getStatusBadgeVariant(selectedComplaint.status)}>
                                              {selectedComplaint.status}
                                            </Badge>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                          <div className="space-y-2">
                                            <Label className="text-sm font-normal text-gray-700">Customer</Label>
                                            <p className="text-gray-900">{selectedComplaint.profiles?.name}</p>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-sm font-normal text-gray-700">Apartment</Label>
                                            <p className="text-gray-900">
                                              {selectedComplaint.profiles?.apartment_number}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                          <div className="space-y-2">
                                            <Label className="text-sm font-normal text-gray-700">Category</Label>
                                            <p className="text-gray-900 capitalize">{selectedComplaint.category}</p>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-sm font-normal text-gray-700">Type</Label>
                                            <p className="text-gray-900 capitalize">{selectedComplaint.subcategory}</p>
                                          </div>
                                        </div>
                                        {selectedComplaint.description && (
                                          <div className="space-y-2">
                                            <Label className="text-sm font-normal text-gray-700">Description</Label>
                                            <div className="p-4 bg-gray-50 rounded-lg border">
                                              <p className="text-gray-900">{selectedComplaint.description}</p>
                                            </div>
                                          </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-6">
                                          <div className="space-y-2">
                                            <Label className="text-sm font-normal text-gray-700">Created</Label>
                                            <p className="text-gray-900">
                                              {formatDateTime(selectedComplaint.created_at)}
                                            </p>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-sm font-normal text-gray-700">Last Updated</Label>
                                            <p className="text-gray-900">
                                              {formatDateTime(selectedComplaint.updated_at)}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                                <Select
                                  value={complaint.status}
                                  onValueChange={(value) => updateComplaintStatus(complaint.id, value)}
                                  disabled={updatingComplaintId === complaint.id}
                                >
                                  <SelectTrigger className="w-32">
                                    {updatingComplaintId === complaint.id ? (
                                      <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                                        <span className="text-xs">Updating...</span>
                                      </div>
                                    ) : (
                                      <SelectValue />
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View - Hidden on Desktop */}
                <div className="lg:hidden space-y-4">
                  {complaintsDisplay.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-normal">
                        {complaints.length === 0 ? "No complaints yet" : "No complaints match your filters"}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {complaints.length === 0
                          ? "Complaints will appear here when residents report issues"
                          : "Try adjusting your filters"}
                      </p>
                    </div>
                  ) : (
                    paginatedComplaints.map((complaint) => (
                      <Card key={complaint.id} className="border-gray-200 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-normal text-gray-900 text-sm">{complaint.complaint_id}</h3>
                                {isNewComplaint(complaint.created_at) && (
                                  <Badge className="bg-manzhil-teal hover:bg-manzhil-dark text-white text-xs animate-pulse">
                                    NEW
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{complaint.profiles?.name || "N/A"}</p>
                            </div>
                            <Badge variant={getStatusBadgeVariant(complaint.status)}>
                              {complaint.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {complaint.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                              {complaint.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
                              {complaint.status}
                            </Badge>
                          </div>

                          <div className="space-y-2 mb-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Apartment:</span>
                              <span className="font-normal text-gray-900">{complaint.profiles?.apartment_number}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Category:</span>
                              <span className="font-normal text-gray-900 capitalize">{complaint.category}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Type:</span>
                              <span className="font-normal text-gray-900 capitalize">{complaint.subcategory}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Created:</span>
                              <span className="font-normal text-gray-900 text-xs">{formatDateTime(complaint.created_at)}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedComplaint(complaint)}
                                  className="flex-1 hover:bg-orange-50 hover:border-orange-200 min-h-[44px]"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-normal">Complaint Details</DialogTitle>
                                </DialogHeader>
                                {selectedComplaint && (
                                  <div className="grid gap-6 py-4">
                                    <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                        <Label className="text-sm font-normal text-gray-700">Complaint ID</Label>
                                        <p className="text-gray-900 font-normal">{selectedComplaint.complaint_id}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-sm font-normal text-gray-700">Status</Label>
                                        <Badge variant={getStatusBadgeVariant(selectedComplaint.status)}>
                                          {selectedComplaint.status}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                        <Label className="text-sm font-normal text-gray-700">Customer</Label>
                                        <p className="text-gray-900">{selectedComplaint.profiles?.name || "N/A"}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-sm font-normal text-gray-700">Apartment</Label>
                                        <p className="text-gray-900">{selectedComplaint.profiles?.apartment_number}</p>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-normal text-gray-700">Category</Label>
                                      <p className="text-gray-900 capitalize">{selectedComplaint.category}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-normal text-gray-700">Type</Label>
                                      <p className="text-gray-900 capitalize">{selectedComplaint.subcategory}</p>
                                    </div>
                                    {selectedComplaint.description && (
                                      <div className="space-y-2">
                                        <Label className="text-sm font-normal text-gray-700">Description</Label>
                                        <p className="text-gray-900">{selectedComplaint.description}</p>
                                      </div>
                                    )}
                                    <div className="space-y-2">
                                      <Label className="text-sm font-normal text-gray-700">Created At</Label>
                                      <p className="text-gray-900">{formatDateTime(selectedComplaint.created_at)}</p>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            <Select
                              value={complaint.status}
                              onValueChange={(value) => updateComplaintStatus(complaint.id, value)}
                              disabled={updatingComplaintId === complaint.id}
                            >
                              <SelectTrigger className="flex-1 min-h-[44px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Pagination - Shared by both views */}
                {totalComplaintsPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (complaintsPage > 1) setComplaintsPage(complaintsPage - 1)
                            }}
                            className={complaintsPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {Array.from({ length: totalComplaintsPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                setComplaintsPage(page)
                              }}
                              isActive={complaintsPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (complaintsPage < totalComplaintsPages) setComplaintsPage(complaintsPage + 1)
                            }}
                            className={complaintsPage === totalComplaintsPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Grouped Complaints Tab */}
            <TabsContent value="grouped-complaints" className="p-4 sm:p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-normal text-gray-900 flex items-center justify-center gap-2">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                    Complaint Analytics
                  </h2>
                  <p className="text-gray-600 mt-1 font-light">View grouped complaints and identify common issues</p>
                </div>

                <div className="grid gap-6">
                  {groupedComplaints.length === 0 ? (
                    <div className="text-center py-12">
                      <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-normal">No complaints to analyze</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Complaint analytics will appear here when residents report issues
                      </p>
                    </div>
                  ) : (
                    groupedComplaints.map((group) => (
                      <Card key={group.group_key} className="border-0 shadow-lg overflow-hidden">
                        <div className="border-l-4 border-l-purple-500">
                          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-xl capitalize text-gray-900">
                                  {group.category} - {group.subcategory}
                                </CardTitle>
                                <p className="text-gray-600 mt-1 font-light">
                                  {group.count} resident{group.count > 1 ? "s" : ""} reported this issue
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant={getStatusBadgeVariant(group.status)} className="text-sm">
                                  {group.status}
                                </Badge>
                                <Badge variant="outline" className="text-sm bg-white">
                                  {group.count} complaints
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <Label className="text-sm font-normal text-gray-700">Affected Residents:</Label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {group.complaints.map((complaint) => (
                                  <div
                                    key={complaint.id}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                                  >
                                    <div>
                                      <p className="font-normal text-gray-900">
                                        {complaint.profiles?.name} ({complaint.profiles?.apartment_number})
                                      </p>
                                      <p className="text-xs text-gray-500">{formatDateTime(complaint.created_at)}</p>
                                      {complaint.description && (
                                        <div className="flex items-center space-x-2 mt-1">
                                          <p className="text-xs text-gray-600">Description:</p>
                                          <p className="text-xs text-gray-700">{complaint.description}</p>
                                        </div>
                                      )}
                                    </div>
                                    <Badge variant={getStatusBadgeVariant(complaint.status)} className="text-xs">
                                      {complaint.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="mt-6 flex gap-3">
                              <Select
                                value={group.status}
                                onValueChange={(value) => {
                                  group.complaints.forEach((complaint) => {
                                    updateComplaintStatus(complaint.id, value)
                                  })
                                }}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Mark All Pending</SelectItem>
                                  <SelectItem value="in-progress">Mark All In Progress</SelectItem>
                                  <SelectItem value="completed">Mark All Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Feedback Tab */}
            <TabsContent value="feedback" className="p-4 sm:p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-normal text-gray-900">Suggestions & Feedback</h2>
                    <p className="text-gray-600 mt-1 font-light">View and manage resident feedback</p>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {feedback.length} Total
                  </Badge>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : feedback.length === 0 ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
                      <h3 className="text-xl font-normal text-gray-900 mb-2">No Feedback Yet</h3>
                      <p className="text-gray-500 text-center max-w-md">
                        When residents submit feedback through WhatsApp, it will appear here.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="space-y-4">
                      {feedback
                        .slice((feedbackPage - 1) * itemsPerPage, feedbackPage * itemsPerPage)
                        .map((item) => (
                          <Card key={item.id} className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-manzhil-teal/20 flex items-center justify-center">
                                    <MessageSquare className="h-5 w-5 text-manzhil-dark" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-normal text-gray-900">
                                        {item.profiles?.name || "Unknown"}
                                      </h3>
                                      {isNewFeedback(item.created_at) && (
                                        <Badge className="bg-manzhil-teal hover:bg-manzhil-dark text-white text-xs animate-pulse">
                                          NEW
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-500">
                                      Apt {item.profiles?.apartment_number} • {item.profiles?.phone_number}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      item.status === "resolved"
                                        ? "default"
                                        : item.status === "reviewed"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className={
                                      item.status === "resolved"
                                        ? "bg-green-100 text-green-800"
                                        : item.status === "reviewed"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-yellow-100 text-yellow-800"
                                    }
                                  >
                                    {item.status === "new" && "New"}
                                    {item.status === "reviewed" && "Reviewed"}
                                    {item.status === "resolved" && "Resolved"}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <p className="text-gray-700 whitespace-pre-wrap">{item.message}</p>
                              </div>

                              {item.admin_notes && (
                                <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-4 mb-4">
                                  <p className="text-sm font-normal text-blue-900 mb-1">Admin Notes:</p>
                                  <p className="text-sm text-blue-800">{item.admin_notes}</p>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <Select
                                  value={item.status}
                                  onValueChange={async (newStatus) => {
                                    const { error } = await supabase
                                      .from("feedback")
                                      .update({
                                        status: newStatus,
                                        updated_at: new Date().toISOString()
                                      })
                                      .eq("id", item.id)

                                    if (error) {
                                      toast({
                                        title: "Error",
                                        description: "Failed to update status",
                                        variant: "destructive",
                                      })
                                    } else {
                                      toast({
                                        title: "Success",
                                        description: "Feedback status updated",
                                      })
                                      fetchFeedback()
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="reviewed">Reviewed</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                  </SelectContent>
                                </Select>

                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Edit className="h-4 w-4 mr-2" />
                                      Add Notes
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Admin Notes</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Notes</Label>
                                        <textarea
                                          className="w-full min-h-[100px] p-3 border rounded-md"
                                          defaultValue={item.admin_notes || ""}
                                          id={`notes-${item.id}`}
                                          placeholder="Add internal notes about this feedback..."
                                        />
                                      </div>
                                      <Button
                                        onClick={async () => {
                                          const notes = (document.getElementById(`notes-${item.id}`) as HTMLTextAreaElement)?.value
                                          const { error } = await supabase
                                            .from("feedback")
                                            .update({
                                              admin_notes: notes,
                                              updated_at: new Date().toISOString()
                                            })
                                            .eq("id", item.id)

                                          if (error) {
                                            toast({
                                              title: "Error",
                                              description: "Failed to save notes",
                                              variant: "destructive",
                                            })
                                          } else {
                                            toast({
                                              title: "Success",
                                              description: "Notes saved successfully",
                                            })
                                            fetchFeedback()
                                          }
                                        }}
                                      >
                                        Save Notes
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>

                    {/* Pagination */}
                    {feedback.length > itemsPerPage && (
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setFeedbackPage((p) => Math.max(1, p - 1))}
                              className={feedbackPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.ceil(feedback.length / itemsPerPage) }, (_, i) => i + 1).map(
                            (page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setFeedbackPage(page)}
                                  isActive={feedbackPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ),
                          )}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() =>
                                setFeedbackPage((p) => Math.min(Math.ceil(feedback.length / itemsPerPage), p + 1))
                              }
                              className={
                                feedbackPage === Math.ceil(feedback.length / itemsPerPage)
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="p-4 sm:p-6">
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-normal text-gray-900 flex items-center justify-center gap-2">
                    <Settings className="h-6 w-6 text-gray-700" />
                    System Settings
                  </h2>
                  <p className="text-gray-600 mt-1 font-light">Configure booking settings</p>
                </div>

                <Card className="border-0 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Settings className="h-5 w-5 text-blue-600" />
                      Booking Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="text-blue-600 mt-0.5">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-blue-900 mb-1">Full Day Booking Policy</h4>
                          <p className="text-sm text-blue-800">
                            Community hall bookings are now full day only (9:00 AM - 9:00 PM). Only one event per day is allowed.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Booking Charges (Rs.)</Label>
                      <Input
                        type="number"
                        value={bookingCharges}
                        onChange={(e) => setBookingCharges(Number.parseInt(e.target.value) || 0)}
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        min="0"
                        step="100"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">Working Days</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 1, label: "Monday" },
                          { value: 2, label: "Tuesday" },
                          { value: 3, label: "Wednesday" },
                          { value: 4, label: "Thursday" },
                          { value: 5, label: "Friday" },
                          { value: 6, label: "Saturday" },
                          { value: 7, label: "Sunday" },
                        ].map((day) => (
                          <div key={day.value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                            <input
                              type="checkbox"
                              id={`day-${day.value}`}
                              checked={workingDays.includes(day.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setWorkingDays([...workingDays, day.value])
                                } else {
                                  setWorkingDays(workingDays.filter((d) => d !== day.value))
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`day-${day.value}`} className="text-sm font-medium text-gray-700">
                              {day.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={saveSettings}
                      disabled={saving}
                      className="w-full gap-2 bg-manzhil-dark hover:bg-manzhil-teal shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {saving ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Accounting Tab */}
            <TabsContent value="accounting" className="p-4 sm:p-6">
              <AccountingTab />
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Edit Resident</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right font-medium">
                    Name *
                  </Label>
                  <Input
                    id="edit-name"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-phone" className="text-right font-medium">
                    Phone *
                  </Label>
                  <Input
                    id="edit-phone"
                    value={editingUser.phone_number}
                    onChange={(e) => setEditingUser({ ...editingUser, phone_number: e.target.value })}
                    className="col-span-3"
                    placeholder="+1234567890"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-apartment" className="text-right font-medium">
                    Apartment *
                  </Label>
                  <Input
                    id="edit-apartment"
                    value={editingUser.apartment_number}
                    onChange={(e) => setEditingUser({ ...editingUser, apartment_number: e.target.value })}
                    className="col-span-3"
                    placeholder="A-101"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-cnic" className="text-right font-medium">
                    CNIC
                  </Label>
                  <Input
                    id="edit-cnic"
                    value={editingUser.cnic || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, cnic: e.target.value })}
                    className="col-span-3"
                    placeholder="12345-6789012-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-maintenance" className="text-right font-medium">
                    Maintenance
                  </Label>
                  <Input
                    id="edit-maintenance"
                    type="number"
                    value={editingUser.maintenance_charges}
                    onChange={(e) => setEditingUser({ ...editingUser, maintenance_charges: Number(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                Cancel
              </Button>
              <Button onClick={editUser} className="bg-manzhil-dark hover:bg-manzhil-teal">
                Update Resident
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

