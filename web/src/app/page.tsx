"use client"

import { useState, useEffect } from "react"
import {
  Shield,
  Coins,
  TrendingUp,
  Users,
  Globe,
  Lock,
  Trophy,
  Star,
  Calendar,
  DollarSign,
  Plus,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DotGridShader from "@/components/DotGridShader"
import AnimatedHeading from "@/components/animated-heading"
import RevealOnView from "@/components/reveal-on-view"
import WalletConnect from "@/components/wallet-connect"
import { useNotificationHelpers } from "@/components/notifications/notification-helpers"
import { useRouter } from "next/navigation"
import { useWalletConnection } from "@/hooks"
import Dashboard from "@/components/dashboard"

interface Pool {
  id: string
  name: string
  apy: string
  totalStaked: string
  members: number
  yieldEarned: string
  badges: string[]
  status: "Active" | "Completed" | "Pending"
  nextPayout: string
}

interface WeeklyWinner {
  name: string
  amount: string
  pool: string
  date: string
}

export default function Page() {
  const router = useRouter()
  const { showSuccess } = useNotificationHelpers()
  const { isConnected } = useWalletConnection()


    const features = [
      {
        icon: Shield,
        title: "Transparent & Secure",
        description: "All transactions recorded on-chain with full transparency and cryptographic security.",
        gradient: "from-blue-500 to-cyan-500",
      },
      {
        icon: Coins,
        title: "Rotating Savings",
        description: "Traditional ROSCA system enhanced with blockchain technology for global accessibility.",
        gradient: "from-purple-500 to-pink-500",
      },
      {
        icon: TrendingUp,
        title: "Yield Opportunities",
        description: "Earn rewards while participating in community savings circles.",
        gradient: "from-green-500 to-emerald-500",
      },
      {
        icon: Users,
        title: "Community Driven",
        description: "Join trusted groups or create your own savings circle with friends and family.",
        gradient: "from-orange-500 to-red-500",
      },
      {
        icon: Globe,
        title: "Global Access",
        description: "Participate from anywhere in the world with just a crypto wallet.",
        gradient: "from-indigo-500 to-purple-500",
      },
      {
        icon: Lock,
        title: "Smart Contracts",
        description: "Automated payouts and contributions managed by audited smart contracts.",
        gradient: "from-teal-500 to-blue-500",
      },
    ]

    if (isConnected) {
      return (
        <Dashboard />
      )
    }

    return (
      <main className="bg-neutral-950 text-white">
        <section className="mt-2 pb-16 lg:pb-4 max-w-5xl mx-auto">
          <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
            <aside className="lg:sticky lg:top-4 lg:h-[calc(100svh-2rem)]">
              <RevealOnView
                as="div"
                intensity="hero"
                className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8"
                staggerChildren
              >
                <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                  <DotGridShader />
                </div>

                <div>
                  <div className="mb-8 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                    <div className="text-2xl font-extrabold tracking-tight text-primary">ROCA</div>
                  </div>

                  <AnimatedHeading
                    className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl"
                    lines={["Join a transparent", "ROSCA on-chain"]}
                  />

                  <p className="mt-4 max-w-[42ch] text-lg text-white/70">
                    Decentralized Arisan brings traditional rotating savings and credit associations to the blockchain.
                    Create or join trusted savings circles with complete transparency and security.
                  </p>

                  

                  <div className="mt-10">
                    <p className="mb-3 text-xs font-semibold tracking-widest text-white/50">POWERED BY</p>
                    <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-2xl font-black text-white/25 sm:grid-cols-3">
                      <li>Somnia</li>
                     
                    </ul>
                  </div>
                </div>
              </RevealOnView>
            </aside>

            <div className="space-y-4">
              {features.map((feature, idx) => (
                <RevealOnView key={feature.title} delay={idx * 0.06} className="lg:h-[calc(100svh-2rem)]">
                  <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8 lg:min-h-[300px]">
                    <div className="pointer-events-none absolute inset-0 opacity-5 mix-blend-soft-light">
                      <DotGridShader />
                    </div>

                    <div className="relative z-10">
                      <div className={`inline-flex rounded-2xl bg-gradient-to-r ${feature.gradient} p-3 mb-4`}>
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>

                      <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                      <p className="text-white/70 text-lg leading-relaxed">{feature.description}</p>
                    </div>

                    <div className="relative z-10 mt-6">
                      <Button
                        variant="outline"
                        className="rounded-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                      >
                        Learn More
                      </Button>
                    </div>
                  </div>
                </RevealOnView>
              ))}
            </div>
          </div>
        </section>
      </main>
    )
  }


