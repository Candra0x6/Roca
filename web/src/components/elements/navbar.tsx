"use client"
import React from 'react'

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Home, Users, Plus, UserPlus, Trophy, TrendingUp, Settings, Wallet, Menu, X } from "lucide-react"
function Navbar() {
    const pathname = usePathname()
    const [isConnected, setIsConnected] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        // Check wallet connection status
        const checkConnection = () => {
            const connected = localStorage.getItem("wallet_connected") === "true"
            setIsConnected(connected)
        }

        checkConnection()
        window.addEventListener("storage", checkConnection)
        return () => window.removeEventListener("storage", checkConnection)
    }, [])

    const navigationItems = [
        { href: "/", label: "Dashboard", icon: Home },
        { href: "/bonus-draw", label: "Bonus Draw", icon: Trophy },
        { href: "/yield-rewards", label: "Rewards", icon: TrendingUp },
        { href: "/gamification", label: "Achievements", icon: Trophy },
        { href: "/settings", label: "Settings", icon: Settings },
    ]

    const isActive = (href: string) => {
        if (href === "/") {
            return pathname === "/"
        }
        return pathname.startsWith(href)
    }
    return (
        <div className='relative h-full flex justify-center py-14 w-full'>
        <div className=" fixed top-0 z-50 mt-5 w-full">
            <div className="relative flex h-full w-full max-w-5xl mx-auto flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl p-6">

                {/* Navigation Links */}
                <div className="flex items-center justify-between">
                    {navigationItems.map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.href)

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${active
                                        ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30"
                                        : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
            {/* Mobile Navigation */}
            <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-neutral-950/90 backdrop-blur-xl border-b border-neutral-800/50">
                <div className="px-4 py-3 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xs">DA</span>
                        </div>
                        <span className="text-white font-semibold">Decentralized Arisan</span>
                    </Link>

                    {/* Mobile Menu Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="text-neutral-400 hover:text-white"
                    >
                        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </Button>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="absolute top-full left-0 right-0 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800/50">
                        <div className="px-4 py-4 space-y-2">
                            {navigationItems.map((item) => {
                                const Icon = item.icon
                                const active = isActive(item.href)

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${active
                                                ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30"
                                                : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                )
                            })}

                            {/* Mobile Wallet Status */}
                            <div className="pt-4 border-t border-neutral-800/50">
                                {isConnected ? (
                                    <div className="flex items-center justify-center">
                                        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                                            <Wallet className="w-4 h-4 mr-2" />
                                            Wallet Connected
                                        </Badge>
                                    </div>
                                ) : (
                                    <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0">
                                        <Wallet className="w-4 h-4 mr-2" />
                                        Connect Wallet
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </nav>
        </div>
        </div>
    )
}

export default Navbar