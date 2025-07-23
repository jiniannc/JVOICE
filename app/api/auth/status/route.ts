import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get("auth_token")?.value

    if (!authToken) {
      return NextResponse.json({ authenticated: false })
    }

    // Verify the token
    const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${authToken}`)

    if (!tokenInfoResponse.ok) {
      return NextResponse.json({ authenticated: false })
    }

    const tokenInfo = await tokenInfoResponse.json()

    return NextResponse.json({
      authenticated: true,
      token: authToken,
      user: {
        email: tokenInfo.email,
        name: tokenInfo.name,
        picture: tokenInfo.picture,
      },
    })
  } catch (error) {
    console.error("Auth status check error:", error)
    return NextResponse.json({ authenticated: false })
  }
}
