"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Users,
    Calendar,
    AlertTriangle,
    BarChart3,
    MessageSquare,
    Wallet,
    Settings,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Ticket,
    Package,
    Megaphone,
    Building,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { PageKey } from "@/lib/supabase"

interface SidebarProps {
    newBookingsCount?: number
    newComplaintsCount?: number
    newFeedbackCount?: number
    newVisitorsCount?: number
    newParcelsCount?: number
    userRole?: "super_admin" | "staff" | null
    permissions?: Map<PageKey, boolean>
}

const navItems = [
    {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        pageKey: "dashboard" as PageKey,
    },
    {
        title: "Units",
        href: "/admin/units",
        icon: Building,
        pageKey: "units" as PageKey,
    },
    {
        title: "Residents",
        href: "/admin",
        icon: Users,
        pageKey: "residents" as PageKey,
    },
    {
        title: "Bookings",
        href: "/admin/bookings",
        icon: Calendar,
        badgeKey: "bookings" as const,
        pageKey: "bookings" as PageKey,
    },
    {
        title: "Complaints",
        href: "/admin/complaints",
        icon: AlertTriangle,
        badgeKey: "complaints" as const,
        pageKey: "complaints" as PageKey,
    },
    {
        title: "Visitors",
        href: "/admin/visitors",
        icon: Ticket,
        badgeKey: "visitors" as const,
        pageKey: "visitors" as PageKey,
    },
    {
        title: "Parcels",
        href: "/admin/parcels",
        icon: Package,
        badgeKey: "parcels" as const,
        pageKey: "parcels" as PageKey,
    },
    {
        title: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        pageKey: "analytics" as PageKey,
    },
    {
        title: "Feedback",
        href: "/admin/feedback",
        icon: MessageSquare,
        badgeKey: "feedback" as const,
        pageKey: "feedback" as PageKey,
    },
    {
        title: "Accounting",
        href: "/admin/accounting",
        icon: Wallet,
        pageKey: "accounting" as PageKey,
    },
    {
        title: "Broadcast",
        href: "/admin/broadcast",
        icon: Megaphone,
        pageKey: "broadcast" as PageKey,
    },
    {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
        pageKey: "settings" as PageKey,
    },
]

export function AdminSidebar({
    newBookingsCount = 0,
    newComplaintsCount = 0,
    newFeedbackCount = 0,
    newVisitorsCount = 0,
    newParcelsCount = 0,
    userRole = null,
    permissions = new Map(),
}: SidebarProps) {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem("admin-sidebar-collapsed")
        if (stored) {
            setCollapsed(stored === "true")
        }
    }, [])

    const toggleCollapsed = () => {
        const newState = !collapsed
        setCollapsed(newState)
        localStorage.setItem("admin-sidebar-collapsed", String(newState))
    }

    const getBadgeCount = (badgeKey?: "bookings" | "complaints" | "feedback" | "visitors" | "parcels") => {
        if (!badgeKey) return 0
        switch (badgeKey) {
            case "bookings":
                return newBookingsCount
            case "complaints":
                return newComplaintsCount
            case "feedback":
                return newFeedbackCount
            case "visitors":
                return newVisitorsCount
            case "parcels":
                return newParcelsCount
            default:
                return 0
        }
    }

    const isActive = (href: string) => {
        if (href === "/admin") {
            return pathname === "/admin" || pathname === "/admin/"
        }
        return pathname.startsWith(href)
    }

    // Filter nav items based on permissions
    const filteredNavItems = useMemo(() => {
        // If no role is set (migration not run yet), show all items
        if (!userRole) {
            return navItems
        }

        // Super admins see all items
        if (userRole === "super_admin") {
            return navItems
        }

        // Staff only see items they have permission for
        return navItems.filter(item => {
            // Settings is super_admin only
            if (item.pageKey === "settings") {
                return false
            }
            // Check if user has permission for this page
            return permissions.get(item.pageKey) === true
        })
    }, [userRole, permissions])

    const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
        <div className="flex flex-col h-full">
            {/* Logo Header with gradient border */}
            <div className={cn(
                "flex items-center gap-3 px-4 h-16 border-b border-manzhil-teal/10",
                isCollapsed && "justify-center px-2"
            )}>
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-md shadow-manzhil-teal/20">
                    <Image
                        src="/manzhil_logo-no_bg.png"
                        alt="Manzhil"
                        width={40}
                        height={40}
                        className="w-full h-full object-contain"
                    />
                </div>
                {!isCollapsed && (
                    <div className="flex flex-col">
                        <span className="font-medium text-manzhil-dark">Manzhil</span>
                        <span className="text-xs text-manzhil-teal/70">by Scrift</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
                {filteredNavItems.map((item) => {
                    const badgeCount = getBadgeCount(item.badgeKey)
                    const active = isActive(item.href)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group",
                                "hover:translate-x-0.5",
                                active
                                    ? "bg-gradient-to-r from-manzhil-dark to-manzhil-teal text-white shadow-md shadow-manzhil-teal/30"
                                    : "text-gray-600 hover:bg-manzhil-teal/5 hover:text-manzhil-dark",
                                isCollapsed && "justify-center px-2"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
                                active ? "text-white" : "text-manzhil-teal"
                            )} />
                            {!isCollapsed && (
                                <>
                                    <span className="flex-1">{item.title}</span>
                                    {badgeCount > 0 && (
                                        <Badge
                                            className={cn(
                                                "text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center",
                                                "bg-manzhil-light text-white shadow-sm animate-pulse-subtle"
                                            )}
                                        >
                                            {badgeCount}
                                        </Badge>
                                    )}
                                </>
                            )}
                            {isCollapsed && badgeCount > 0 && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-manzhil-light rounded-full shadow-sm animate-pulse-subtle" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Collapse Button */}
            <div className="hidden lg:block border-t border-manzhil-teal/10 p-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleCollapsed}
                    className="w-full justify-center text-manzhil-teal hover:text-manzhil-dark hover:bg-manzhil-teal/5"
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-5 h-5" />
                    ) : (
                        <>
                            <ChevronLeft className="w-5 h-5 mr-2" />
                            <span>Collapse</span>
                        </>
                    )}
                </Button>
            </div>
        </div>
    )

    return (
        <>
            {/* Mobile Menu Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 bg-white shadow-lg shadow-manzhil-teal/10 rounded-xl border border-manzhil-teal/10 hover:bg-manzhil-teal/5"
            >
                <Menu className="w-5 h-5 text-manzhil-dark" />
            </Button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-manzhil-dark/30 backdrop-blur-sm z-40 animate-fade-in"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={cn(
                    "lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl shadow-manzhil-teal/20 transform transition-transform duration-300",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-4 right-4 z-10 hover:bg-manzhil-teal/10 text-manzhil-dark"
                >
                    <X className="w-5 h-5" />
                </Button>
                <SidebarContent isCollapsed={false} />
            </aside>

            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col bg-white border-r border-manzhil-teal/10 shadow-sm transition-all duration-300",
                    collapsed ? "w-20" : "w-64"
                )}
            >
                <SidebarContent isCollapsed={collapsed} />
            </aside>
        </>
    )
}

export default AdminSidebar
