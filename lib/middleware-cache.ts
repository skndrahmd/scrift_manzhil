/**
 * HMAC-signed cookie cache for admin role/permissions in middleware.
 * Uses Web Crypto API (Edge Runtime compatible — no Node.js dependency).
 */

const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const SEPARATOR = "."

interface AdminCachePayload {
  userId: string
  role: string
  isActive: boolean
  adminId: string
  permissionKeys: string[]
  expiresAt: number
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data))
  // Convert ArrayBuffer to base64url
  const bytes = new Uint8Array(signature)
  let binary = ""
  for (const b of bytes) {
    binary += String.fromCharCode(b)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  while (base64.length % 4) base64 += "="
  return atob(base64)
}

export async function encodeAdminCache(
  userId: string,
  role: string,
  isActive: boolean,
  adminId: string,
  permissionKeys: string[],
  secret: string
): Promise<string> {
  const payload: AdminCachePayload = {
    userId,
    role,
    isActive,
    adminId,
    permissionKeys,
    expiresAt: Date.now() + ADMIN_CACHE_TTL_MS,
  }

  const payloadStr = JSON.stringify(payload)
  const encodedPayload = toBase64Url(payloadStr)
  const signature = await hmacSign(encodedPayload, secret)
  return encodedPayload + SEPARATOR + signature
}

export interface DecodedAdminCache {
  role: string
  isActive: boolean
  adminId: string
  permissionKeys: string[]
}

export async function decodeAdminCache(
  cookieValue: string | undefined,
  userId: string,
  secret: string
): Promise<DecodedAdminCache | null> {
  if (!cookieValue) return null

  const parts = cookieValue.split(SEPARATOR)
  if (parts.length !== 2) return null

  const [encodedPayload, signature] = parts

  // Verify HMAC signature
  const expectedSignature = await hmacSign(encodedPayload, secret)
  if (signature !== expectedSignature) return null

  try {
    const payload: AdminCachePayload = JSON.parse(fromBase64Url(encodedPayload))

    // Verify user ID matches authenticated user
    if (payload.userId !== userId) return null

    // Check TTL
    if (Date.now() > payload.expiresAt) return null

    return {
      role: payload.role,
      isActive: payload.isActive,
      adminId: payload.adminId,
      permissionKeys: payload.permissionKeys,
    }
  } catch {
    return null
  }
}

export const ADMIN_CACHE_COOKIE = "x-admin-cache"
