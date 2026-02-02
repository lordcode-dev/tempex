import express from "express";
import crypto from "crypto";
import { getDomain, createAccount, login, getMessages } from "./mailtm.js";
import { createSession, getSession } from "./expiry.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/api/email", async (req, res) => {
  const expiry = req.body.expiry === 60 ? 3600 : 600;
  const domain = await getDomain();
  const local = crypto.randomBytes(3).toString("hex");
  const email = `${local}@${domain}`;
  const password = crypto.randomBytes(6).toString("hex");

  await createAccount(email, password);
  const token = await login(email, password);
  const expiresAt = createSession(email, token, expiry);

  res.json({ email, expiresAt, ttl: expiry });
});

app.get("/api/inbox/:email", async (req, res) => {
  const session = getSession(req.params.email);
  if (!session) return res.status(404).json({ error: "Expired" });

  const data = await getMessages(session.token);
  res.json(data["hydra:member"]);
});

app.listen(3000, () => console.log("Tepex running on http://localhost:3000"));
