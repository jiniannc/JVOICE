"use client"

import React from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

interface CustomDialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  showCancel?: boolean
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

export function CustomDialog({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  showCancel = false,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel
}: CustomDialogProps) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-amber-600" />
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-600" />
      default:
        return <Info className="w-8 h-8 text-blue-600" />
    }
  }

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          iconBg: 'bg-green-100',
          button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          buttonSecondary: 'border-green-200 text-green-700 hover:bg-green-50'
        }
      case 'warning':
        return {
          iconBg: 'bg-amber-100',
          button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
          buttonSecondary: 'border-amber-200 text-amber-700 hover:bg-amber-50'
        }
      case 'error':
        return {
          iconBg: 'bg-red-100',
          button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          buttonSecondary: 'border-red-200 text-red-700 hover:bg-red-50'
        }
      default:
        return {
          iconBg: 'bg-blue-100',
          button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          buttonSecondary: 'border-blue-200 text-blue-700 hover:bg-blue-50'
        }
    }
  }

  const colors = getColors()

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-in fade-in-0 zoom-in-95 duration-300 ease-out">
        {/* Close button - 우상단 모서리에 세련되게 배치 */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg z-10"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* Content */}
        <div className="p-8 pt-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`w-16 h-16 rounded-full ${colors.iconBg} flex items-center justify-center shadow-sm`}>
              {getIcon()}
            </div>
          </div>

          {/* Title */}
          {title && (
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {title}
              </h3>
            </div>
          )}

          {/* Message */}
          <div className="text-center mb-8">
            <p className="text-gray-600 leading-relaxed whitespace-pre-line text-base">
              {message}
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleConfirm}
              className={`w-full py-4 rounded-2xl text-white font-semibold transition-all duration-200 transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${colors.button}`}
            >
              {confirmText}
            </button>
            
            {showCancel && (
              <button
                onClick={handleCancel}
                className={`w-full py-4 rounded-2xl border-2 font-semibold transition-all duration-200 transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${colors.buttonSecondary}`}
              >
                {cancelText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
