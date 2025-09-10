"use client"

import { useState, useCallback } from 'react'

interface DialogOptions {
  title?: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  confirmText?: string
  cancelText?: string
}

interface ConfirmOptions extends DialogOptions {
  showCancel?: boolean
}

export function useCustomDialog() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogConfig, setDialogConfig] = useState<DialogOptions & { 
    showCancel: boolean
    onConfirm?: () => void
    onCancel?: () => void
  }>({
    message: '',
    showCancel: false
  })

  const showAlert = useCallback((options: DialogOptions) => {
    setDialogConfig({
      ...options,
      showCancel: false
    })
    setDialogOpen(true)
  }, [])

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogConfig({
        ...options,
        showCancel: options.showCancel !== false,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      })
      setDialogOpen(true)
    })
  }, [])

  const close = useCallback(() => {
    setDialogOpen(false)
  }, [])

  return {
    isOpen: dialogOpen,
    config: dialogConfig,
    close,
    showAlert,
    showConfirm
  }
}
