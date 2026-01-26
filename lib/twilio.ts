// import twilio from "twilio"

// const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
// const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
// const TWILIO_PHONE_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER // e.g., 'whatsapp:+14155238886'

// function getClient() {
//   if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null
//   try {
//     return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
//   } catch {
//     return null
//   }
// }

// export async function sendWhatsAppMessage(to: string, body: string) {
//   console.log('send functionnnnnnnnn')
//   // to must be in E.164 format: +123..., and Twilio requires 'whatsapp:' prefix
//   const client = getClient()
// const from = TWILIO_PHONE_NUMBER?.startsWith("whatsapp:")
//   ? TWILIO_PHONE_NUMBER
//   : `whatsapp:${TWILIO_PHONE_NUMBER}`
//   console.log("Sending WhatsApp:", { from, to, body })


//   if (!client || !from) {
//     console.log("[Twilio NO-OP] ->", { to, body })
//     return { ok: true, sid: "noop" }
//   }

//   try {
//     const msg = await client.messages.create({
//       from,
//       to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
//       body,
//     })
//     return { ok: true, sid: msg.sid }
//   } catch (err: any) {
//     console.error("Twilio send error:", err?.message || err)
//     return { ok: false, error: err?.message || "unknown" }
//   }
// }


import twilio from "twilio"

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER // e.g., 'whatsapp:+14155238886'

function getClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null
  try {
    return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  } catch {
    return null
  }
}

export async function sendWhatsAppMessage(to: string, body: string) {
  console.log('=== SEND WHATSAPP MESSAGE ===')
  console.log('Environment check:', {
    hasSID: !!TWILIO_ACCOUNT_SID,
    hasToken: !!TWILIO_AUTH_TOKEN,
    hasNumber: !!TWILIO_PHONE_NUMBER,
    rawNumber: TWILIO_PHONE_NUMBER,
  })
  
  // to must be in E.164 format: +123..., and Twilio requires 'whatsapp:' prefix
  const client = getClient()
  const from = TWILIO_PHONE_NUMBER?.startsWith("whatsapp:")
    ? TWILIO_PHONE_NUMBER
    : `whatsapp:${TWILIO_PHONE_NUMBER}`
  
  const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`
  
  console.log("Message details:", { 
    from, 
    to: formattedTo, 
    bodyLength: body.length,
    bodyPreview: body.substring(0, 50) + '...',
  })

  if (!client || !from) {
    console.error("[Twilio NO-OP] Missing client or from number")
    console.error("Client exists:", !!client)
    console.error("From number:", from)
    return { ok: true, sid: "noop" }
  }

  try {
    console.log('Attempting to send message via Twilio...')
    const msg = await client.messages.create({
      from,
      to: formattedTo,
      body,
    })
    console.log('✅ Message sent successfully!')
    console.log('Message SID:', msg.sid)
    console.log('Status:', msg.status)
    return { ok: true, sid: msg.sid }
  } catch (err: any) {
    console.error("❌ Twilio send error:", err?.message || err)
    console.error("Error code:", err?.code)
    console.error("Error details:", err?.moreInfo)
    console.error("Full error:", JSON.stringify(err, null, 2))
    return { ok: false, error: err?.message || "unknown" }
  }
}

/**
 * Send WhatsApp template message using Twilio Content API
 * @param to - Phone number in E.164 format (e.g., +923001234567)
 * @param contentSid - Twilio Content Template SID (e.g., HXda7e0429d7de4202519775e4f77ce366)
 * @param variables - Object mapping variable numbers to values (e.g., { "1": "November 2025", "2": "25,000" })
 * @param fallbackMessage - Optional plain text message to send if template fails
 */
export async function sendWhatsAppTemplate(
  to: string,
  contentSid: string,
  variables: Record<string, string>,
  fallbackMessage?: string
) {
  console.log('=== SEND WHATSAPP TEMPLATE ===')
  console.log('Environment check:', {
    hasSID: !!TWILIO_ACCOUNT_SID,
    hasToken: !!TWILIO_AUTH_TOKEN,
    hasNumber: !!TWILIO_PHONE_NUMBER,
    rawNumber: TWILIO_PHONE_NUMBER,
  })

  const client = getClient()
  const from = TWILIO_PHONE_NUMBER?.startsWith("whatsapp:")
    ? TWILIO_PHONE_NUMBER
    : `whatsapp:${TWILIO_PHONE_NUMBER}`

  const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`

  console.log("Template message details:", {
    from,
    to: formattedTo,
    contentSid,
    variables,
    hasFallback: !!fallbackMessage,
  })

  if (!client || !from) {
    console.error("[Twilio NO-OP] Missing client or from number")
    console.error("Client exists:", !!client)
    console.error("From number:", from)
    return { ok: true, sid: "noop" }
  }

  if (!contentSid) {
    console.error("[Twilio ERROR] Missing contentSid for template message")
    // Try fallback if available
    if (fallbackMessage) {
      console.log("📤 Attempting fallback message (no contentSid)...")
      return sendWhatsAppMessage(to, fallbackMessage)
    }
    return { ok: false, error: "Missing contentSid" }
  }

  try {
    console.log('Attempting to send template message via Twilio...')
    const msg = await client.messages.create({
      from,
      to: formattedTo,
      contentSid,
      contentVariables: JSON.stringify(variables),
    })
    console.log('✅ Template message sent successfully!')
    console.log('Message SID:', msg.sid)
    console.log('Status:', msg.status)
    return { ok: true, sid: msg.sid }
  } catch (err: any) {
    console.error("❌ Twilio template send error:", err?.message || err)
    console.error("Error code:", err?.code)
    console.error("Error details:", err?.moreInfo)
    console.error("Full error:", JSON.stringify(err, null, 2))
    
    // Try fallback message if template fails
    if (fallbackMessage) {
      console.log("📤 Template failed, attempting fallback message...")
      const fallbackResult = await sendWhatsAppMessage(to, fallbackMessage)
      if (fallbackResult.ok) {
        console.log("✅ Fallback message sent successfully!")
        return { ok: true, sid: fallbackResult.sid, usedFallback: true }
      } else {
        console.error("❌ Fallback message also failed:", fallbackResult.error)
        return { ok: false, error: err?.message || "unknown", fallbackError: fallbackResult.error }
      }
    }
    
    return { ok: false, error: err?.message || "unknown" }
  }
}