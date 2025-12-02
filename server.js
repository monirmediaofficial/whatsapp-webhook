const express = require("express");
const app = express();
app.use(express.json());

const VERIFY_TOKEN = "monir123";

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

// Receive message
app.post("/webhook", (req, res) => {
  console.log(JSON.stringify(req.body, null, 2));
  return res.status(200).send("EVENT_RECEIVED");
});

app.listen(3000, () => {
  console.log("Webhook server running on port 3000");
});
