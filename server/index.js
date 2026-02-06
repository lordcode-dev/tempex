import express from "express";
import { createMailboxViaMailTm, getMessages } from "./mailtm.js";
import { createSession, getSession } from "./expiry.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

function getTtl(expiry) {
  return expiry === 60 ? 3600 : 600;
}

async function generateMailbox(req, res) {
  try {
    const expiry = Number(req.body?.expiry || 10);
    const ttl = getTtl(expiry);
    const mailbox = await createMailboxViaMailTm();
    const expiresAt = createSession(mailbox.email, mailbox.token, ttl);

    res.json({
      email: mailbox.email,
      expiresAt,
      ttl,
      generatedAt: Date.now(),
      provider: mailbox.provider
    });
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to generate mailbox with Mail.tm" });
  }
}

app.post("/api/email", generateMailbox);
app.post("/api/email/generate", generateMailbox);

app.get("/api/inbox/:email", async (req, res) => {
  try {
    const session = getSession(req.params.email);
    if (!session) {
      return res.status(404).json({ error: "Mailbox expired or unavailable" });
    }

    const data = await getMessages(session.token);
    res.json(data["hydra:member"] || []);
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to fetch inbox" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(3000, () => console.log("Tepex running on http://localhost:3000"));
