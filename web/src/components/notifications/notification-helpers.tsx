"use client"

import { useNotifications } from "./notification-provider"

export function useNotificationHelpers() {
  const { addNotification } = useNotifications()

  const showReminder = (message: string, date?: string) => {
    addNotification({
      type: "reminder",
      title: "Reminder",
      message: date ? `${message} before ${date}` : message,
      duration: 8000,
    })
  }

  const showSuccess = (message: string) => {
    addNotification({
      type: "success",
      title: "Success",
      message,
      duration: 5000,
    })
  }

  const showPayout = (amount: string, round: number, token = "ETH") => {
    addNotification({
      type: "payout",
      title: "Payout Received!",
      message: `You received ${amount} ${token} in Round ${round}!`,
      duration: 10000,
    })
  }

  const showError = (message: string) => {
    addNotification({
      type: "error",
      title: "Error",
      message,
      duration: 7000,
    })
  }

  const showDepositReminder = (amount: string, token: string, deadline: string) => {
    addNotification({
      type: "reminder",
      title: "Deposit Required",
      message: `Deposit ${amount} ${token} before ${deadline}`,
      duration: 10000,
    })
  }

  const showTransactionPending = (txHash: string) => {
    addNotification({
      type: "reminder",
      title: "Transaction Pending",
      message: `Your transaction is being processed. Hash: ${txHash.slice(0, 10)}...`,
      duration: 15000,
    })
  }

  return {
    showReminder,
    showSuccess,
    showPayout,
    showError,
    showDepositReminder,
    showTransactionPending,
  }
}
