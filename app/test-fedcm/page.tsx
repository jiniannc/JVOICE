"use client"

import { FedCMGoogleAuth } from "@/components/fedcm-google-auth"

export default function TestFedCMPage() {
  const handleAuthSuccess = (user: any, deviceInfo: any) => {
    console.log("Authentication successful:", user)
    console.log("Device info:", deviceInfo)
    alert(`Welcome ${user.name}! Authentication successful.`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🔐 FedCM Google Authentication Test</h1>
          <p className="text-gray-600">Testing the new FedCM-compatible Google Sign-In</p>
        </div>

        <div className="flex justify-center">
          <FedCMGoogleAuth onAuthSuccess={handleAuthSuccess} requireCompanyDevice={false} />
        </div>

        {/* Implementation Details */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="p-6 bg-white rounded-xl shadow-lg">
            <h3 className="text-xl font-bold mb-4">🛠️ Implementation Features</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-600">✅</span>
                <span>
                  <strong>FedCM Detection:</strong> Automatically detects browser FedCM support
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✅</span>
                <span>
                  <strong>Backend Verification:</strong> Secure token verification using Google's tokeninfo endpoint
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✅</span>
                <span>
                  <strong>Popup Fallback:</strong> Automatic fallback to popup method if FedCM fails
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✅</span>
                <span>
                  <strong>Employee Verification:</strong> Checks against employee database
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✅</span>
                <span>
                  <strong>Device Detection:</strong> Optional company device verification
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✅</span>
                <span>
                  <strong>Debug Logging:</strong> Comprehensive logging for troubleshooting
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
