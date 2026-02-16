import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  
  // Ping critical endpoints to keep them warm
  const endpoints = [
    "/api/webhook",
    "/api/bookings/create",
    "/api/complaints/create",
  ]

  // Fire and forget - don't wait for responses
  endpoints.forEach(endpoint => {
    fetch(`${baseUrl}${endpoint}`, {
      method: "HEAD", // HEAD request is lighter than GET
    }).catch(() => {}) // Ignore errors
  })

  return new Response(JSON.stringify({ 
    status: "ok",
    pinged: endpoints.length,
    timestamp: new Date().toISOString() 
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  })
}