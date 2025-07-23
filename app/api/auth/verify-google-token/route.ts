import { type NextRequest, NextResponse } from "next/server"

interface GoogleTokenInfo {
  iss: string
  azp: string
  aud: string
  sub: string
  email: string
  email_verified: boolean
  name: string
  picture: string
  given_name: string
  family_name: string
  iat: number
  exp: number
}

export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json()

    if (!credential) {
      return NextResponse.json({ error: "No credential provided" }, { status: 400 })
    }

    // Method 1: Verify using Google's tokeninfo endpoint
    const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)

    if (!tokenInfoResponse.ok) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const tokenInfo: GoogleTokenInfo = await tokenInfoResponse.json()

    // Verify the token is for our application
    const expectedClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (tokenInfo.aud !== expectedClientId) {
      return NextResponse.json({ error: "Token audience mismatch" }, { status: 401 })
    }

    // Verify the token is not expired
    const now = Math.floor(Date.now() / 1000)
    if (tokenInfo.exp < now) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 })
    }

    // Verify the issuer
    if (tokenInfo.iss !== "https://accounts.google.com" && tokenInfo.iss !== "accounts.google.com") {
      return NextResponse.json({ error: "Invalid token issuer" }, { status: 401 })
    }

    // Return verified user information
    return NextResponse.json({
      email: tokenInfo.email,
      email_verified: tokenInfo.email_verified,
      name: tokenInfo.name,
      picture: tokenInfo.picture,
      given_name: tokenInfo.given_name,
      family_name: tokenInfo.family_name,
      sub: tokenInfo.sub,
    })
  } catch (error) {
    console.error("Token verification error:", error)
    return NextResponse.json({ error: "Token verification failed" }, { status: 500 })
  }
}
