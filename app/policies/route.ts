import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // TODO: Update this URL after uploading policy file to Supabase Storage
  // 1. Create a new bucket named "GreensThree" in Supabase Storage
  // 2. Upload the policy PDF file (rename from "Event Form-com3.pdf" to "Event Form-greensthree.pdf")
  // 3. Generate a signed URL and replace the URL below
  // 4. Update the bucket path from "Com3" to "GreensThree"
  const policiesUrl = "https://sbhvbhlrehenufvxwihp.supabase.co/storage/v1/object/sign/Com3/Event%20Form-com3.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xODhjOWRkZS1kZjhhLTRhNzctODhhOC1mMzY4MjcxNzJhMTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJDb20zL0V2ZW50IEZvcm0tY29tMy5wZGYiLCJpYXQiOjE3NjUxNzg4NjEsImV4cCI6MTgyODI1MDg2MX0.82CeDj1JQEqca9O7-y9-Epd8NopJjZpoShDBfk68PVw"
  
  return NextResponse.redirect(policiesUrl)
}
