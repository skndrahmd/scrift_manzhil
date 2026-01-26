"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface LoaderProps {
    className?: string
    size?: "sm" | "md" | "lg"
    fullScreen?: boolean
    showText?: boolean
}

export default function Loader({
    className,
    size = "md",
    fullScreen = false,
    showText = true
}: LoaderProps) {

    const sizeClasses = {
        sm: "w-12 h-12",
        md: "w-20 h-20",
        lg: "w-32 h-32"
    }

    const logoSizes = {
        sm: 30,
        md: 50,
        lg: 80
    }

    const containerClasses = fullScreen
        ? "fixed inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50 animate-fade-in"
        : "flex flex-col items-center justify-center py-8"

    return (
        <div className={cn(containerClasses, className)}>
            <div className={cn("relative flex items-center justify-center", sizeClasses[size])}>
                {/* Animated Rings */}
                <div className="absolute inset-0 border-4 border-manzhil-teal/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-manzhil-teal rounded-full animate-spin"></div>

                {/* Logo */}
                <div className="relative z-10 p-2">
                    <Image
                        src="/manzhil_logo-no_bg.png"
                        alt="Loading..."
                        width={logoSizes[size]}
                        height={logoSizes[size]}
                        className="object-contain animate-pulse-subtle"
                        priority
                    />
                </div>
            </div>

            {showText && (
                <p className="mt-4 text-manzhil-teal font-medium animate-pulse text-sm tracking-wide">
                    LOADING...
                </p>
            )}
        </div>
    )
}
