"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, CheckCircle, AlertCircle, Clock, DollarSign } from "lucide-react"

export type NotificationType = "reminder" | "success" | "payout" | "error"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  duration?: number
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, "id" | "timestamp">) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

const notificationStyles = {
  reminder: {
    icon: Clock,
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    iconColor: "text-amber-400",
    titleColor: "text-amber-100",
  },
  success: {
    icon: CheckCircle,
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    iconColor: "text-emerald-400",
    titleColor: "text-emerald-100",
  },
  payout: {
    icon: DollarSign,
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    iconColor: "text-blue-400",
    titleColor: "text-blue-100",
  },
  error: {
    icon: AlertCircle,
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    iconColor: "text-red-400",
    titleColor: "text-red-100",
  },
}

function NotificationToast({ notification, onRemove }: { notification: Notification; onRemove: (id: string) => void }) {
  const style = notificationStyles[notification.type]
  const Icon = style.icon

  React.useEffect(() => {
    const duration = notification.duration || 5000
    const timer = setTimeout(() => {
      onRemove(notification.id)
    }, duration)

    return () => clearTimeout(timer)
  }, [notification.id, notification.duration, onRemove])

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`
        relative w-80 p-4 rounded-xl border backdrop-blur-sm
        ${style.bgColor} ${style.borderColor}
        shadow-lg shadow-black/20
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${style.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium text-sm ${style.titleColor}`}>{notification.title}</h4>
          <p className="text-neutral-300 text-xs mt-1 leading-relaxed">{notification.message}</p>
          <p className="text-neutral-500 text-xs mt-2">{notification.timestamp.toLocaleTimeString()}</p>
        </div>
        <button
          onClick={() => onRemove(notification.id)}
          className="flex-shrink-0 text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp">) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    }
    setNotifications((prev) => [newNotification, ...prev])
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.slice(0, 5).map((notification) => (
            <div key={notification.id} className="pointer-events-auto">
              <NotificationToast notification={notification} onRemove={removeNotification} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  )
}
