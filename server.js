const express = require("express");
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "monir123";
// Ensure these env vars exist on Render: WHATSAPP_TOKEN, PHONE_NUMBER_ID
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Webhook verification
app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Helper: send reply via Meta Graph API
async function sendTextMessage(to, text) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID env var");
    return;
  }

  const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: { body: text }
  };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    console.log("Send message response:", data);
  } catch (err) {
    console.error("Error sending message:", err);
  }
}

// Receive message
app.post("/webhook", async (req, res) => {
  console.log("Incoming webhook payload:", JSON.stringify(req.body, null, 2));

  // Basic guard
  if (req.body.object) {
    // Typical structure: entry[].changes[].value.messages[]
    try {
      const entries = req.body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const ch of changes) {
          const value = ch.value || {};
          const messages = value.messages || []; // messages array
          if (messages && messages.length > 0) {
            for (const msg of messages) {
              const from = msg.from; // sender phone number
              const type = msg.type;
              // Example: text message
              if (type === "text") {
                const text = msg.text && msg.text.body ? msg.text.body : "";
                console.log(`Message from ${from}: ${text}`);

                // Simple auto-reply example:
                let reply = `ধন্যবাদ! আপনি বললেন: "${text}"\n(এটি একটি auto-reply)`;
                // Or implement keyword handling:
                if (text.toLowerCase().includes("hi") || text.toLowerCase().includes("hello")) {
                  reply = "আসসালামু আলাইকুম! কিভাবে সাহায্য করতে পারি?";
                }

                // Send reply (non-blocking)
                sendTextMessage(from, reply);
              } else {
                console.log("Non-text message:", type);
              }
            }
          } else {
            console.log("No messages in this change.");
          }
        }
      }
    } catch (err) {
      console.error("Error processing webhook:", err);
    }
  }

  // Return 200 to Facebook immediately
  return res.status(200).send("EVENT_RECEIVED");
});

// Use Render's port or fallback to 3000 for local dev
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
