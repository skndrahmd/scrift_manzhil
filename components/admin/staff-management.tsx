"use client"

import { useState, useEffect } from "react"
import { supabase, type AdminUser, type AdminPermission, PAGE_KEYS } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Users,
    Plus,
    Edit,
    Trash2,
    Shield,
    ShieldCheck,
    Bell,
    BellRing,
    Phone,
    UserCog,
    Loader2,
    FileText,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StaffWithPermissions extends AdminUser {
    permissions?: AdminPermission[]
}

export function StaffManagement() {
    const [staff, setStaff] = useState<StaffWithPermissions[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingStaff, setEditingStaff] = useState<StaffWithPermissions | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        phone_number: "",
        role: "staff" as "super_admin" | "staff",
        receive_complaint_notifications: false,
        receive_reminder_notifications: false,
        receive_daily_reports: false,
        permissions: {} as Record<string, boolean>,
    })

    const { toast } = useToast()

    // Fetch staff data
    const fetchStaff = async () => {
        setLoading(true)
        try {
            // Fetch admin users
            const { data: adminUsers, error: usersError } = await supabase
                .from("admin_users")
                .select("*")
                .order("created_at", { ascending: false })

            if (usersError) {
                console.error("Error fetching staff:", usersError)
                toast({ title: "Error", description: "Failed to fetch staff members", variant: "destructive" })
                setLoading(false)
                return
            }

            // Fetch permissions for all users
            const { data: permissions, error: permError } = await supabase
                .from("admin_permissions")
                .select("*")

            if (permError) {
                console.error("Error fetching permissions:", permError)
            }

            // Merge permissions with users
            const staffWithPermissions: StaffWithPermissions[] = (adminUsers || []).map(user => ({
                ...user,
                permissions: (permissions || []).filter(p => p.admin_user_id === user.id)
            }))

            setStaff(staffWithPermissions)
        } catch (error) {
            console.error("Fetch staff error:", error)
            toast({ title: "Error", description: "Failed to load staff data", variant: "destructive" })
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchStaff()
    }, [])

    // Reset form
    const resetForm = () => {
        setFormData({
            name: "",
            phone_number: "",
            role: "staff",
            receive_complaint_notifications: false,
            receive_reminder_notifications: false,
            receive_daily_reports: false,
            permissions: {},
        })
        setEditingStaff(null)
    }

    // Open dialog for editing
    const openEditDialog = (staffMember: StaffWithPermissions) => {
        setEditingStaff(staffMember)
        const permObj: Record<string, boolean> = {}
        staffMember.permissions?.forEach(p => {
            permObj[p.page_key] = p.can_access
        })
        setFormData({
            name: staffMember.name,
            phone_number: staffMember.phone_number || "",
            role: staffMember.role,
            receive_complaint_notifications: staffMember.receive_complaint_notifications,
            receive_reminder_notifications: staffMember.receive_reminder_notifications,
            receive_daily_reports: staffMember.receive_daily_reports,
            permissions: permObj,
        })
        setDialogOpen(true)
    }

    // Open dialog for creating
    const openCreateDialog = () => {
        resetForm()
        setDialogOpen(true)
    }

    // Handle save (create or update)
    const handleSave = async () => {
        setSaving(true)

        try {
            if (editingStaff) {
                // Update existing staff
                const { error: updateError } = await supabase
                    .from("admin_users")
                    .update({
                        name: formData.name,
                        phone_number: formData.phone_number,
                        role: formData.role,
                        receive_complaint_notifications: formData.receive_complaint_notifications,
                        receive_reminder_notifications: formData.receive_reminder_notifications,
                        receive_daily_reports: formData.receive_daily_reports,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", editingStaff.id)

                if (updateError) {
                    throw updateError
                }

                // Update permissions - delete existing and insert new
                if (formData.role === "staff") {
                    await supabase
                        .from("admin_permissions")
                        .delete()
                        .eq("admin_user_id", editingStaff.id)

                    const permissionRows = PAGE_KEYS
                        .filter(pk => pk.key !== "settings") // Settings is super_admin only
                        .map(pk => ({
                            admin_user_id: editingStaff.id,
                            page_key: pk.key,
                            can_access: formData.permissions[pk.key] || false,
                        }))

                    if (permissionRows.length > 0) {
                        const { error: permError } = await supabase
                            .from("admin_permissions")
                            .insert(permissionRows)

                        if (permError) {
                            console.error("Permission update error:", permError)
                        }
                    }
                }

                toast({ title: "Success", description: "Staff member updated successfully" })
            } else {
                // Create new staff - first create auth user via API
                const response = await fetch("/api/admin/staff", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: formData.name,
                        phone_number: formData.phone_number,
                        role: formData.role,
                        receive_complaint_notifications: formData.receive_complaint_notifications,
                        receive_reminder_notifications: formData.receive_reminder_notifications,
                        receive_daily_reports: formData.receive_daily_reports,
                        permissions: formData.role === "staff" ? formData.permissions : {},
                    }),
                })

                const result = await response.json()

                if (!response.ok) {
                    throw new Error(result.error || "Failed to create staff member")
                }

                toast({ title: "Success", description: "Staff member created successfully" })
            }

            setDialogOpen(false)
            resetForm()
            fetchStaff()
        } catch (error: unknown) {
            console.error("Save error:", error)
            const errorMessage = error instanceof Error ? error.message : "Failed to save staff member"
            toast({ title: "Error", description: errorMessage, variant: "destructive" })
        }

        setSaving(false)
    }

    // Handle delete
    const handleDelete = async (staffMember: StaffWithPermissions) => {
        try {
            // Delete via API (will also delete auth user)
            const response = await fetch(`/api/admin/staff/${staffMember.id}`, {
                method: "DELETE",
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.error || "Failed to delete staff member")
            }

            toast({ title: "Success", description: "Staff member deleted successfully" })
            fetchStaff()
        } catch (error: unknown) {
            console.error("Delete error:", error)
            const errorMessage = error instanceof Error ? error.message : "Failed to delete staff member"
            toast({ title: "Error", description: errorMessage, variant: "destructive" })
        }
    }

    // Toggle active status
    const toggleActive = async (staffMember: StaffWithPermissions) => {
        try {
            const { error } = await supabase
                .from("admin_users")
                .update({
                    is_active: !staffMember.is_active,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", staffMember.id)

            if (error) throw error

            toast({
                title: "Success",
                description: `Staff member ${staffMember.is_active ? "deactivated" : "activated"} successfully`,
            })
            fetchStaff()
        } catch (error) {
            console.error("Toggle error:", error)
            toast({ title: "Error", description: "Failed to update staff status", variant: "destructive" })
        }
    }

    // Count active permissions
    const countPermissions = (staffMember: StaffWithPermissions) => {
        if (staffMember.role === "super_admin") return "All"
        return staffMember.permissions?.filter(p => p.can_access).length || 0
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-medium text-manzhil-dark flex items-center gap-2">
                        <Users className="h-5 w-5 text-manzhil-teal" />
                        Staff Management
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Manage admin users and their permissions</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button
                            onClick={openCreateDialog}
                            className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Staff
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-manzhil-dark">
                                <UserCog className="h-5 w-5 text-manzhil-teal" />
                                {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
                            </DialogTitle>
                            <DialogDescription>
                                {editingStaff
                                    ? "Update staff details and permissions"
                                    : "Create a new admin user with specific permissions"}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number *</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="phone"
                                                value={formData.phone_number}
                                                onChange={(e) => setFormData(f => ({ ...f, phone_number: e.target.value }))}
                                                placeholder="+923001234567"
                                                className="pl-10"
                                                required
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Used for WhatsApp login & notifications</p>
                                    </div>
                                </div>
                            </div>

                            {/* Role Selection */}
                            <Card className="border-manzhil-teal/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-manzhil-teal" />
                                        Role
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Super Admin</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Full access to all pages and settings
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.role === "super_admin"}
                                            onCheckedChange={(checked) =>
                                                setFormData(f => ({ ...f, role: checked ? "super_admin" : "staff" }))
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Permissions (only for staff) */}
                            {formData.role === "staff" && (
                                <Card className="border-manzhil-teal/20">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-manzhil-teal" />
                                            Page Permissions
                                        </CardTitle>
                                        <CardDescription>
                                            Select which pages this staff member can access
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-3">
                                            {PAGE_KEYS.filter(pk => pk.key !== "settings").map((page) => (
                                                <div key={page.key} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`perm-${page.key}`}
                                                        checked={formData.permissions[page.key] || false}
                                                        onCheckedChange={(checked) =>
                                                            setFormData(f => ({
                                                                ...f,
                                                                permissions: { ...f.permissions, [page.key]: !!checked }
                                                            }))
                                                        }
                                                    />
                                                    <Label htmlFor={`perm-${page.key}`} className="cursor-pointer text-sm">
                                                        {page.label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Notification Settings */}
                            <Card className="border-manzhil-teal/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Bell className="h-4 w-4 text-manzhil-teal" />
                                        WhatsApp Notifications
                                    </CardTitle>
                                    <CardDescription>
                                        Receive notifications on WhatsApp (requires phone number)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>New Complaints</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Get notified when new complaints are registered
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.receive_complaint_notifications}
                                            onCheckedChange={(checked) =>
                                                setFormData(f => ({ ...f, receive_complaint_notifications: checked }))
                                            }
                                            disabled={!formData.phone_number}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Pending Reminders</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Get reminders for pending complaints
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.receive_reminder_notifications}
                                            onCheckedChange={(checked) =>
                                                setFormData(f => ({ ...f, receive_reminder_notifications: checked }))
                                            }
                                            disabled={!formData.phone_number}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Daily Reports</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Receive daily summary reports
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.receive_daily_reports}
                                            onCheckedChange={(checked) =>
                                                setFormData(f => ({ ...f, receive_daily_reports: checked }))
                                            }
                                            disabled={!formData.phone_number}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving || !formData.name || !formData.phone_number}
                                className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    editingStaff ? "Update" : "Create"
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Staff Table */}
            <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-manzhil-teal" />
                        </div>
                    ) : staff.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No staff members yet</p>
                            <p className="text-sm">Add your first staff member to get started</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/50">
                                    <TableHead>Name</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Pages</TableHead>
                                    <TableHead>Notifications</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staff.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">{member.name}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div className="flex items-center gap-1 text-gray-600">
                                                    <Phone className="h-3 w-3" />
                                                    {member.phone_number || "—"}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={member.role === "super_admin" ? "default" : "secondary"}>
                                                {member.role === "super_admin" ? (
                                                    <><ShieldCheck className="h-3 w-3 mr-1" /> Super Admin</>
                                                ) : (
                                                    <><Shield className="h-3 w-3 mr-1" /> Staff</>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {countPermissions(member)} {typeof countPermissions(member) === "number" ? "pages" : ""}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1 flex-wrap">
                                                {member.receive_complaint_notifications && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <BellRing className="h-3 w-3 mr-1" /> Complaints
                                                    </Badge>
                                                )}
                                                {member.receive_reminder_notifications && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <Bell className="h-3 w-3 mr-1" /> Reminders
                                                    </Badge>
                                                )}
                                                {member.receive_daily_reports && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <FileText className="h-3 w-3 mr-1" /> Reports
                                                    </Badge>
                                                )}
                                                {!member.receive_complaint_notifications && !member.receive_reminder_notifications && !member.receive_daily_reports && (
                                                    <span className="text-gray-400 text-sm">None</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={member.is_active}
                                                onCheckedChange={() => toggleActive(member)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditDialog(member)}
                                                    className="h-8 w-8"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete {member.name}? This will also remove their login access. This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(member)}
                                                                className="bg-red-500 hover:bg-red-600"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default StaffManagement
