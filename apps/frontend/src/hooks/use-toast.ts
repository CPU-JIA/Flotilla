/**
 * useToast Hook - Production Implementation
 * ECP-A1: SOLID - Single Responsibility - Toast notification hook
 *
 * Full-featured toast implementation using sonner
 * Supports success, error, info, warning, loading states
 */

'use client'

import React from 'react'
import { toast as sonnerToast } from 'sonner'

interface ToastProps {
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'info' | 'warning'
  duration?: number
}

export function useToast() {
  const toast = ({ title, description, variant = 'default', duration = 4000 }: ToastProps) => {
    const message = description ? (
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground mt-1">{description}</div>
      </div>
    ) : (
      title
    )

    switch (variant) {
      case 'destructive':
        return sonnerToast.error(message, { duration })
      case 'success':
        return sonnerToast.success(message, { duration })
      case 'info':
        return sonnerToast.info(message, { duration })
      case 'warning':
        return sonnerToast.warning(message, { duration })
      default:
        return sonnerToast(message, { duration })
    }
  }

  return {
    toast,
    // Additional sonner methods for advanced usage
    success: (title: string, description?: string, duration?: number) =>
      toast({ title, description, variant: 'success', duration }),
    error: (title: string, description?: string, duration?: number) =>
      toast({ title, description, variant: 'destructive', duration }),
    info: (title: string, description?: string, duration?: number) =>
      toast({ title, description, variant: 'info', duration }),
    warning: (title: string, description?: string, duration?: number) =>
      toast({ title, description, variant: 'warning', duration }),
    loading: (title: string, description?: string) =>
      sonnerToast.loading(
        description ? (
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-muted-foreground mt-1">{description}</div>
          </div>
        ) : (
          title
        )
      ),
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
  }
}
