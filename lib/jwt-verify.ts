// Alternative JWT verification method (if you prefer not to use Google's tokeninfo endpoint)
import { jwtVerify, importX509 } from "jose"

interface GoogleJWTPayload {
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

export async function verifyGoogleJWT(token: string): Promise<GoogleJWTPayload> {
  try {
    // Get Google's public keys
    const jwksResponse = await fetch("https://www.googleapis.com/oauth2/v3/certs")
    const jwks = await jwksResponse.json()

    // Decode the JWT header to get the key ID
    const [headerB64] = token.split(".")
    const header = JSON.parse(Buffer.from(headerB64, "base64").toString())
    const keyId = header.kid

    // Find the matching public key
    const publicKey = jwks.keys.find((key: any) => key.kid === keyId)
    if (!publicKey) {
      throw new Error("Public key not found")
    }

    // Convert the key to the format jose expects
    const x509Key = await importX509(
      `-----BEGIN CERTIFICATE-----\n${publicKey.x5c[0]}\n-----END CERTIFICATE-----`,
      "RS256",
    )

    // Verify the JWT
    const { payload } = await jwtVerify(token, x509Key, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    })

    return payload as GoogleJWTPayload
  } catch (error) {
    throw new Error(`JWT verification failed: ${error}`)
  }
}
