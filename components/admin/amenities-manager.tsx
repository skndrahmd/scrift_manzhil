"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Wrench,
  ArrowLeft,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Amenity {
  id: string
  name: string
  is_active: boolean
  is_under_maintenance: boolean
  open_time: string | null
  close_time: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// Generate time options for select (30-minute intervals)
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2)
  const minutes = i % 2 === 0 ? "00" : "30"
  const hour12 = hours % 12 || 12
  const ampm = hours < 12 ? "AM" : "PM"
  return {
    value: `${String(hours).padStart(2, "0")}:${minutes}`,
    label: `${hour12}:${minutes} ${ampm}`,
  }
})

export function AmenitiesManager() {
  const { toast } = useToast()
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    open_time: "06:00",
    close_time: "22:00",
    is_under_maintenance: false,
  })
  const [togglingMaintenanceId, setTogglingMaintenanceId] = useState<string | null>(null)
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null)
  const [reorderingId, setReorderingId] = useState<string | null>(null)

  const fetchAmenities = useCallback(async () => {
    try {
      const res = await fetch("/api/amenities")
      if (!res.ok) throw new Error("Failed to fetch amenities")
      const data = await res.json()
      setAmenities(data.amenities || [])
    } catch {
      toast({
        title: "Error",
        description: "Failed to load amenities",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAmenities()
  }, [fetchAmenities])

  const resetForm = () => {
    setFormData({
      name: "",
      open_time: "06:00",
      close_time: "22:00",
      is_under_maintenance: false,
    })
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Amenity name is required",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/amenities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          open_time: formData.open_time || null,
          close_time: formData.close_time || null,
          is_under_maintenance: formData.is_under_maintenance,
          sort_order: amenities.length + 1,
        }),
      })

      if (!res.ok) throw new Error("Failed to add amenity")

      toast({ title: "Success", description: "Amenity added successfully" })
      setIsAddOpen(false)
      resetForm()
      fetchAmenities()
    } catch {
      toast({
        title: "Error",
        description: "Failed to add amenity",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedAmenity) return
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Amenity name is required",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/amenities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAmenity.id,
          name: formData.name.trim(),
          open_time: formData.open_time || null,
          close_time: formData.close_time || null,
          is_under_maintenance: formData.is_under_maintenance,
        }),
      })

      if (!res.ok) throw new Error("Failed to update amenity")

      toast({ title: "Success", description: "Amenity updated successfully" })
      setIsEditOpen(false)
      setSelectedAmenity(null)
      resetForm()
      fetchAmenities()
    } catch {
      toast({
        title: "Error",
        description: "Failed to update amenity",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAmenity) return

    setSaving(true)
    try {
      const res = await fetch(`/api/amenities?id=${selectedAmenity.id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete amenity")

      toast({ title: "Success", description: "Amenity deleted successfully" })
      setIsDeleteOpen(false)
      setSelectedAmenity(null)
      fetchAmenities()
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete amenity",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleMaintenance = async (amenity: Amenity) => {
    setTogglingMaintenanceId(amenity.id)
    try {
      const res = await fetch("/api/amenities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: amenity.id,
          is_under_maintenance: !amenity.is_under_maintenance,
        }),
      })

      if (!res.ok) throw new Error("Failed to update")

      toast({
        title: "Success",
        description: amenity.is_under_maintenance
          ? "Amenity is now available"
          : "Amenity marked as under maintenance",
      })
      fetchAmenities()
    } catch {
      toast({
        title: "Error",
        description: "Failed to update amenity",
        variant: "destructive",
      })
    } finally {
      setTogglingMaintenanceId(null)
    }
  }

  const handleToggleActive = async (amenity: Amenity) => {
    setTogglingActiveId(amenity.id)
    try {
      const res = await fetch("/api/amenities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: amenity.id,
          is_active: !amenity.is_active,
        }),
      })

      if (!res.ok) throw new Error("Failed to update")

      toast({
        title: "Success",
        description: amenity.is_active
          ? "Amenity deactivated"
          : "Amenity activated",
      })
      fetchAmenities()
    } catch {
      toast({
        title: "Error",
        description: "Failed to update amenity",
        variant: "destructive",
      })
    } finally {
      setTogglingActiveId(null)
    }
  }

  const handleReorder = async (amenity: Amenity, direction: "up" | "down") => {
    const currentIndex = amenities.findIndex((a) => a.id === amenity.id)
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= amenities.length) return

    setReorderingId(amenity.id)
    const swapAmenity = amenities[newIndex]

    // Optimistically update UI
    const newAmenities = [...amenities]
    newAmenities[currentIndex] = { ...amenity, sort_order: swapAmenity.sort_order }
    newAmenities[newIndex] = { ...swapAmenity, sort_order: amenity.sort_order }
    setAmenities(newAmenities.sort((a, b) => a.sort_order - b.sort_order))

    try {
      // Update both amenities in parallel
      const [res1, res2] = await Promise.all([
        fetch("/api/amenities", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: amenity.id, sort_order: swapAmenity.sort_order }),
        }),
        fetch("/api/amenities", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: swapAmenity.id, sort_order: amenity.sort_order }),
        }),
      ])

      if (!res1.ok || !res2.ok) throw new Error("Failed to reorder")

      toast({ title: "Success", description: "Order updated" })
    } catch {
      toast({
        title: "Error",
        description: "Failed to reorder amenities",
        variant: "destructive",
      })
      fetchAmenities() // Revert on error
    } finally {
      setReorderingId(null)
    }
  }

  const openEditModal = (amenity: Amenity) => {
    setSelectedAmenity(amenity)
    setFormData({
      name: amenity.name,
      open_time: amenity.open_time || "06:00",
      close_time: amenity.close_time || "22:00",
      is_under_maintenance: amenity.is_under_maintenance,
    })
    setIsEditOpen(true)
  }

  const formatTime = (time: string | null): string => {
    if (!time) return "Not set"
    const option = TIME_OPTIONS.find((o) => o.value === time)
    return option ? option.label : time
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-manzhil-teal" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-medium text-manzhil-dark flex items-center gap-2">
              <Building2 className="h-6 w-6 text-manzhil-teal" />
              Amenities
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage building amenities and their timings
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setIsAddOpen(true)
          }}
          className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Amenity
        </Button>
      </div>

      {/* Amenities List */}
      {amenities.length === 0 ? (
        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
          <CardContent className="py-10 text-center text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No amenities configured yet.</p>
            <p className="text-sm mt-1">Click "Add Amenity" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {amenities.map((amenity, index) => (
            <Card
              key={amenity.id}
              className={`border-0 shadow-lg shadow-manzhil-teal/5 ${
                !amenity.is_active ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0 || reorderingId === amenity.id}
                        onClick={() => handleReorder(amenity, "up")}
                      >
                        {reorderingId === amenity.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === amenities.length - 1 || reorderingId === amenity.id}
                        onClick={() => handleReorder(amenity, "down")}
                      >
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-manzhil-dark">
                          {amenity.name}
                        </h3>
                        {amenity.is_under_maintenance ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            <Wrench className="h-3 w-3 mr-1" />
                            Under Maintenance
                          </Badge>
                        ) : (
                          <Badge
                            className={`${
                              amenity.is_active
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {amenity.is_active ? "Active" : "Inactive"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {formatTime(amenity.open_time)} –{" "}
                          {formatTime(amenity.close_time)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Maintenance Toggle */}
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`maintenance-${amenity.id}`}
                        className="text-sm text-gray-500 hidden md:block"
                      >
                        Maintenance
                      </Label>
                      <Switch
                        id={`maintenance-${amenity.id}`}
                        checked={amenity.is_under_maintenance}
                        disabled={togglingMaintenanceId === amenity.id}
                        onCheckedChange={() => handleToggleMaintenance(amenity)}
                      />
                      {togglingMaintenanceId === amenity.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-manzhil-teal" />
                      )}
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`active-${amenity.id}`}
                        className="text-sm text-gray-500 hidden md:block"
                      >
                        Active
                      </Label>
                      <Switch
                        id={`active-${amenity.id}`}
                        checked={amenity.is_active}
                        disabled={togglingActiveId === amenity.id}
                        onCheckedChange={() => handleToggleActive(amenity)}
                      />
                      {togglingActiveId === amenity.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-manzhil-teal" />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(amenity)}
                        className="border-manzhil-teal/30 hover:bg-manzhil-teal/10"
                      >
                        <Pencil className="h-4 w-4 text-manzhil-teal" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAmenity(amenity)
                          setIsDeleteOpen(true)
                        }}
                        className="border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Amenity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Amenity Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Swimming Pool"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="open_time">Opening Time</Label>
                <Select
                  value={formData.open_time}
                  onValueChange={(v) =>
                    setFormData({ ...formData, open_time: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="close_time">Closing Time</Label>
                <Select
                  value={formData.close_time}
                  onValueChange={(v) =>
                    setFormData({ ...formData, close_time: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="maintenance-add"
                checked={formData.is_under_maintenance}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, is_under_maintenance: v })
                }
              />
              <Label htmlFor="maintenance-add">
                Mark as Under Maintenance
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving}
              className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg transition-all"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Amenity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Amenity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Amenity Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-open_time">Opening Time</Label>
                <Select
                  value={formData.open_time}
                  onValueChange={(v) =>
                    setFormData({ ...formData, open_time: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-close_time">Closing Time</Label>
                <Select
                  value={formData.close_time}
                  onValueChange={(v) =>
                    setFormData({ ...formData, close_time: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="maintenance-edit"
                checked={formData.is_under_maintenance}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, is_under_maintenance: v })
                }
              />
              <Label htmlFor="maintenance-edit">
                Mark as Under Maintenance
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={saving}
              className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg transition-all"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Amenity</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-medium text-manzhil-dark">
                {selectedAmenity?.name}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}