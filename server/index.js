import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createMailboxViaMailTm,
  deleteMessage,
  getMessage,
  getMessages
} from "./mailtm.js";
import { createSession, extendSession, getSession } from "./expiry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");
import { createMailboxViaMailTm, getMessages } from "./mailtm.js";
import { createSession, getSession } from "./expiry.js";

const app = express();
app.use(express.json());
app.use(express.static(publicDir));

function getTtl(expiry) {
  return Number(expiry) === 60 ? 3600 : 600;
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

function requireSession(req, res) {
  const session = getSession(req.params.email);
  if (!session) {
    res.status(404).json({ error: "Mailbox expired or unavailable" });
    return null;
  }
  return session;
}

app.post("/api/email", generateMailbox);
app.post("/api/email/generate", generateMailbox);

app.post("/api/email/:email/extend", (req, res) => {
  const ttl = getTtl(req.body?.expiry || 10);
  const expiresAt = extendSession(req.params.email, ttl);

  if (!expiresAt) {
    return res.status(404).json({ error: "Mailbox expired or unavailable" });
  }

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

function requireSession(req, res) {
  const session = getSession(req.params.email);
  if (!session) {
    res.status(404).json({ error: "Mailbox expired or unavailable" });
    return null;
  }
  return session;
}

app.post("/api/email", generateMailbox);
app.post("/api/email/generate", generateMailbox);

app.post("/api/email/:email/extend", (req, res) => {
  const ttl = getTtl(Number(req.body?.expiry || 10));
  const expiresAt = extendSession(req.params.email, ttl);

  if (!expiresAt) {
    return res.status(404).json({ error: "Mailbox expired or unavailable" });
  }

  res.json({ email: req.params.email, expiresAt, ttl });
});

app.get("/api/inbox/:email", async (req, res) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const data = await getMessages(session.token);
    res.json(data["hydra:member"] || []);
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to fetch inbox" });
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

app.get("/api/inbox/:email/:messageId", async (req, res) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const message = await getMessage(session.token, req.params.messageId);
    res.json(message);
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to fetch message" });
  }
});

app.delete("/api/inbox/:email/:messageId", async (req, res) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    await deleteMessage(session.token, req.params.messageId);
    res.status(204).send();
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to delete message" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/inbox/:email/:messageId", async (req, res) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    const message = await getMessage(session.token, req.params.messageId);
    res.json(message);
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to fetch message" });
  }
});

app.delete("/api/inbox/:email/:messageId", async (req, res) => {
  try {
    const session = requireSession(req, res);
    if (!session) return;

    await deleteMessage(session.token, req.params.messageId);
    res.status(204).send();
  } catch (error) {
    res.status(502).json({ error: error.message || "Unable to delete message" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`Tepex running on http://localhost:${port}`));
}

export default app;
