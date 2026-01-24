export async function GET() {
  const testTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
<Message>This is a test message from your webhook!</Message>
</Response>`

  return new Response(testTwiml, {
    headers: {
      "Content-Type": "text/xml",
    },
  })
}

export async function POST() {
  const testTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
<Message>POST test successful!</Message>
</Response>`

  return new Response(testTwiml, {
    headers: {
      "Content-Type": "text/xml",
    },
  })
}
