import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const policiesUrl = process.env.POLICIES_PDF_URL || ""
  if (!policiesUrl) {
    return NextResponse.json({ error: "Policies URL not configured" }, { status: 500 })
  }
  return NextResponse.redirect(policiesUrl)
}
