"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, CheckCircle, AlertTriangle, Monitor, Smartphone, RefreshCw } from "lucide-react"
import type { Employee } from "@/lib/employee-database"
import { employeeDB } from "@/lib/employee-database"
import { deviceDetector } from "@/lib/device-detector"

interface GoogleUser {
  email: string
  name: string
  picture: string
  employee?: Employee
  verified: boolean
}

interface FedCMGoogleAuthProps {
  onAuthSuccess: (user: GoogleUser, deviceInfo: any) => void
  requireCompanyDevice?: boolean
}

interface GoogleCredentialResponse {
  credential: string
  select_by: string
}

export function FedCMGoogleAuth({ onAuthSuccess, requireCompanyDevice = false }: FedCMGoogleAuthProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [isCheckingDevice, setIsCheckingDevice] = useState(false)
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [fedCMSupported, setFedCMSupported] = useState<boolean | null>(null)
  const [debugLogs, setDebugLogs] = useState<string[]>([])

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs((prev) => [...prev.slice(-10), `[${timestamp}] ${message}`])
    console.log(`[FedCM Auth] ${message}`)
  }, [])

  useEffect(() => {
    loadGoogleIdentityServices()
  }, [])

  const loadGoogleIdentityServices = async () => {
    addLog("Loading Google Identity Services...")

    try {
      // Remove existing script
      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
      if (existingScript) {
        existingScript.remove()
        addLog("Removed existing Google script")
      }

      // Load new script
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true

      script.onload = () => {
        addLog("Google Identity Services loaded successfully")
        setGoogleLoaded(true)
        initializeGoogleAuth()
      }

      script.onerror = (error) => {
        addLog(`Failed to load Google script: ${error}`)
        setError("Failed to load Google authentication library")
      }

      document.head.appendChild(script)
    } catch (error) {
      addLog(`Script loading error: ${error}`)
      setError("Failed to initialize Google authentication")
    }
  }

  const initializeGoogleAuth = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    if (!clientId) {
      addLog("Google Client ID not found")
      setError("Google Client ID is not configured")
      return
    }

    if (!(window as any).google?.accounts?.id) {
      addLog("Google Identity Services not available")
      setError("Google Identity Services not available")
      return
    }

    try {
      addLog("Initializing Google Identity Services...")

      // Check FedCM support
      const supportsFedCM = "IdentityCredential" in window && "navigator" in window && "credentials" in navigator
      setFedCMSupported(supportsFedCM)
      addLog(`FedCM supported: ${supportsFedCM}`)

      // Initialize with FedCM-compatible settings
      ;(window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: false,
        // FedCM-compatible settings
        use_fedcm_for_prompt: supportsFedCM,
        itp_support: true,
        ux_mode: supportsFedCM ? "redirect" : "popup",
        // Additional settings for better compatibility
        context: "signin",
        state_cookie_domain: window.location.hostname,
      })

      addLog("Google Identity Services initialized successfully")
    } catch (error) {
      addLog(`Initialization error: ${error}`)
      setError(`Failed to initialize Google authentication: ${error}`)
    }
  }

  const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
    addLog("Received credential response")
    setIsLoading(true)
    setError(null)

    try {
      if (!response.credential) {
        throw new Error("No credential received from Google")
      }

      addLog("Verifying credential with backend...")

      // Verify the credential with our backend
      const verificationResponse = await fetch("/api/auth/verify-google-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: response.credential,
          select_by: response.select_by,
        }),
      })

      if (!verificationResponse.ok) {
        const errorData = await verificationResponse.json()
        throw new Error(errorData.error || "Token verification failed")
      }

      const verifiedData = await verificationResponse.json()
      addLog(`Token verified successfully for: ${verifiedData.email}`)

      // Find employee information
      const employee = await employeeDB.findEmployeeByEmail(verifiedData.email)

      if (!employee) {
        throw new Error(`Employee not found for email: ${verifiedData.email}. Please contact administrator.`)
      }

      const googleUser: GoogleUser = {
        email: verifiedData.email,
        name: employee.name, // Use employee name from database
        picture: verifiedData.picture || "",
        employee: employee,
        verified: verifiedData.email_verified || false,
      }

      // Device check if required
      if (requireCompanyDevice) {
        setIsCheckingDevice(true)
        const deviceCheck = await deviceDetector.isCompanyDevice()
        setDeviceInfo(deviceCheck)
        addLog(`Device check: ${deviceCheck.reason}`)
      }

      setUser(googleUser)
      addLog("Authentication successful")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed"
      addLog(`Authentication error: ${errorMessage}`)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      setIsCheckingDevice(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!googleLoaded) {
      addLog("Google services not loaded yet")
      setError("Google services are still loading. Please wait.")
      return
    }

    addLog("Starting Google Sign-In process...")
    setError(null)

    try {
      if (fedCMSupported) {
        addLog("Using FedCM-compatible prompt")
        // Use FedCM-compatible prompt
        ;(window as any).google.accounts.id.prompt((notification: any) => {
          addLog(`Prompt notification: ${notification.getNotDisplayedReason?.() || "shown"}`)

          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason()
            addLog(`Prompt not displayed: ${reason}`)

            // Fallback to popup if prompt fails
            if (reason === "suppressed_by_user" || reason === "unregistered_origin") {
              addLog("Falling back to popup method")
              handlePopupFallback()
            } else {
              setError(`Sign-in prompt not available: ${reason}`)
            }
          }
        })
      } else {
        addLog("FedCM not supported, using popup fallback")
        handlePopupFallback()
      }
    } catch (error) {
      addLog(`Sign-in error: ${error}`)
      setError(`Sign-in failed: ${error}`)
      // Try popup fallback
      handlePopupFallback()
    }
  }

  const handlePopupFallback = () => {
    addLog("Opening OAuth popup fallback")

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/auth/google/callback`

    const oauthUrl = new URL("https://accounts.google.com/oauth/authorize")
    oauthUrl.searchParams.set("client_id", clientId || "")
    oauthUrl.searchParams.set("redirect_uri", redirectUri)
    oauthUrl.searchParams.set("response_type", "code")
    oauthUrl.searchParams.set("scope", "openid email profile")
    oauthUrl.searchParams.set("access_type", "offline")
    oauthUrl.searchParams.set("prompt", "select_account")

    const popup = window.open(oauthUrl.toString(), "google-oauth", "width=500,height=600,scrollbars=yes,resizable=yes")

    if (!popup) {
      setError("Popup blocked. Please allow popups for this site.")
      return
    }

    // Monitor popup
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        addLog("OAuth popup closed")
        // Check if authentication was successful
        checkAuthStatus()
      }
    }, 1000)

    // Timeout after 5 minutes
    setTimeout(() => {
      if (!popup.closed) {
        popup.close()
        clearInterval(checkClosed)
        addLog("OAuth popup timed out")
      }
    }, 300000)
  }

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/status")
      if (response.ok) {
        const data = await response.json()
        if (data.authenticated) {
          // Handle successful authentication
          handleCredentialResponse({ credential: data.token, select_by: "popup" })
        }
      }
    } catch (error) {
      addLog(`Auth status check failed: ${error}`)
    }
  }

  const handleContinue = () => {
    if (user) {
      onAuthSuccess(user, deviceInfo)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setError(null)
    setDeviceInfo(null)
    addLog("User logged out")
  }

  const handleRetry = () => {
    setError(null)
    setUser(null)
    setDeviceInfo(null)
    setGoogleLoaded(false)
    setFedCMSupported(null)
    loadGoogleIdentityServices()
  }

  if (user) {
    return (
      <Card className="w-full max-w-md mx-auto jinair-card">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden border-4 border-green-200">
            <img
              src={user.picture || "/placeholder.svg?height=64&width=64&text=User"}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Authentication Successful
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Employee Information */}
          <div className="text-center space-y-2">
            <p className="font-semibold text-lg">{user.employee?.name}</p>
            <p className="text-sm text-gray-600">{user.employee?.employeeId}</p>
            <div className="flex justify-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">{user.employee?.department}</Badge>
              <Badge className="bg-green-100 text-green-800">{user.employee?.position}</Badge>
            </div>
            {user.verified && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          {/* Device Information */}
          {requireCompanyDevice && deviceInfo && (
            <Alert className={deviceInfo.isCompany ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
              <div className="flex items-center gap-2">
                {deviceInfo.isCompany ? (
                  <Monitor className="w-4 h-4 text-green-600" />
                ) : (
                  <Smartphone className="w-4 h-4 text-yellow-600" />
                )}
                <AlertDescription className={deviceInfo.isCompany ? "text-green-800" : "text-yellow-800"}>
                  {deviceInfo.reason}
                  {!deviceInfo.isCompany && (
                    <div className="mt-1 text-xs">Recording is only available on company devices.</div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={handleContinue} className="flex-1 jinair-button">
              Continue
            </Button>
            <Button onClick={handleLogout} variant="outline" className="bg-transparent">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto jinair-card">
      <CardHeader className="text-center">
        <div className="w-16 h-16 jinair-gradient rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <CardTitle>Employee Sign-In</CardTitle>
        <p className="text-sm text-gray-600">Sign in with your Google account</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* FedCM Status */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Shield className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">FedCM Compatible</p>
              <p className="text-xs text-blue-700">
                {fedCMSupported === null ? "Checking..." : fedCMSupported ? "Supported" : "Using fallback method"}
              </p>
            </div>
          </div>

          {googleLoaded && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Google Services Ready</p>
                <p className="text-xs text-green-700">Authentication system loaded</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleGoogleSignIn}
          disabled={!googleLoaded || isLoading || isCheckingDevice}
          className="w-full h-12 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
        >
          {isLoading || isCheckingDevice ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              {isCheckingDevice ? "Checking device..." : "Signing in..."}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </div>
          )}
        </Button>

        {!googleLoaded && (
          <div className="flex items-center justify-center gap-2">
            <Button onClick={handleRetry} variant="outline" size="sm" className="bg-transparent">
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        )}

        {/* Debug Logs (Development only) */}
        {process.env.NODE_ENV === "development" && debugLogs.length > 0 && (
          <div className="mt-4">
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500">Debug Logs</summary>
              <div className="mt-2 p-2 bg-gray-900 text-green-400 rounded font-mono text-xs max-h-32 overflow-y-auto">
                {debugLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </details>
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Only registered employees can access this system
            <br />
            Contact administrator for access issues
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
