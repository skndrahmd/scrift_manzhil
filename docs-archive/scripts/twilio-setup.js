// Node.js script to set up Twilio webhook
// Run this script to configure your Twilio WhatsApp sandbox

const twilio = require("twilio")

// Replace with your Twilio credentials
const accountSid = "your_account_sid"
const authToken = "your_auth_token"
const client = twilio(accountSid, authToken)

// Replace with your webhook URL (e.g., https://yourdomain.com/api/webhook)
const webhookUrl = "https://your-domain.com/api/webhook"

async function setupWebhook() {
  try {
    // Update the WhatsApp sandbox webhook
    const sandbox = await client.incomingPhoneNumbers.list({ limit: 20 }).then((incomingPhoneNumbers) => {
      // Find your WhatsApp sandbox number
      const whatsappNumber = incomingPhoneNumbers.find((number) => number.phoneNumber.includes("whatsapp"))

      if (whatsappNumber) {
        return client.incomingPhoneNumbers(whatsappNumber.sid).update({
          smsUrl: webhookUrl,
          smsMethod: "POST",
        })
      }
    })

    console.log("Webhook configured successfully!")
    console.log("Webhook URL:", webhookUrl)
  } catch (error) {
    console.error("Error setting up webhook:", error)
  }
}

setupWebhook()
