let currentEmail = "";
let poller = null;

const emailEl = document.getElementById("email");
const expiresEl = document.getElementById("expires");
const inboxEl = document.getElementById("inbox");
const messageCountEl = document.getElementById("message-count");
const expirySelect = document.getElementById("expiry");

async function generateEmail() {
  const expiry = Number(expirySelect.value);
  const res = await fetch("/api/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiry })
  });

  const data = await res.json();
  currentEmail = data.email;
  emailEl.innerText = currentEmail;
  expiresEl.innerText = new Date(data.expiresAt).toLocaleTimeString();
  await refreshInbox();

  if (poller) clearInterval(poller);
  poller = setInterval(refreshInbox, 4000);
}

async function refreshInbox() {
  if (!currentEmail) return;

  const r = await fetch(`/api/inbox/${currentEmail}`);
  if (!r.ok) return;
  const messages = await r.json();

  inboxEl.innerHTML = "";
  if (!messages.length) {
    inboxEl.innerHTML = `
      <li class="empty">
        <h4>No messages yet</h4>
        <p>We are checking automatically. Try refresh if you expect mail.</p>
      </li>
    `;
  } else {
    messages.forEach(message => {
      const li = document.createElement("li");
      li.className = "message";
      li.innerHTML = `
        <h4>${message.subject || "(No subject)"}</h4>
        <span>${message.from.address} · ${new Date(message.createdAt).toLocaleTimeString()}</span>
      `;
      inboxEl.appendChild(li);
    });
  }

  messageCountEl.innerText = `${messages.length} message${messages.length === 1 ? "" : "s"}`;
}

async function copyEmail() {
  if (!currentEmail) return;
  await navigator.clipboard.writeText(currentEmail);
}

const generateBtn = document.getElementById("generate");
const refreshBtn = document.getElementById("refresh");
const copyBtn = document.getElementById("copy");

generateBtn.addEventListener("click", generateEmail);
refreshBtn.addEventListener("click", refreshInbox);
copyBtn.addEventListener("click", copyEmail);
