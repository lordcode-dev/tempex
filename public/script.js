let currentEmail = "";
let expiresAt = null;
let poller = null;
let timer = null;
let selectedMessageId = "";
let messages = [];

const addressInput = document.getElementById("address");
const countdownEl = document.getElementById("countdown");
const statusEl = document.getElementById("status");
const expirySelect = document.getElementById("expiry");
const messageCountEl = document.getElementById("message-count");
const messageListEl = document.getElementById("message-list");

const emptyView = document.getElementById("empty-view");
const messageView = document.getElementById("message-view");
const deleteBtn = document.getElementById("delete");

const subjectEl = document.getElementById("view-subject");
const fromEl = document.getElementById("view-from");
const toEl = document.getElementById("view-to");
const dateEl = document.getElementById("view-date");
const textEl = document.getElementById("view-text");
const htmlEl = document.getElementById("view-html");

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("muted", !isError);
}

function startCountdown() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (!expiresAt) {
      countdownEl.textContent = "--:--";
      return;
    }

    const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
    const seconds = (remaining % 60).toString().padStart(2, "0");
    countdownEl.textContent = `${minutes}:${seconds}`;

    if (remaining === 0) {
      setStatus("Mailbox expired", true);
    }
  }, 1000);
}

async function generateEmail() {
  setStatus("Generating...");

  const response = await fetch("/api/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiry: Number(expirySelect.value) })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to generate email");
  }

  currentEmail = data.email;
  expiresAt = data.expiresAt;
  addressInput.value = currentEmail;
  selectedMessageId = "";
  renderMessages([]);
  resetViewer();

  if (poller) clearInterval(poller);
  poller = setInterval(refreshInbox, 4000);

  await refreshInbox();
  setStatus("Mailbox ready");
}

async function extendMailbox() {
  if (!currentEmail) return;

  const response = await fetch(`/api/email/${encodeURIComponent(currentEmail)}/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiry: 10 })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Could not extend mailbox");
  }

  expiresAt = data.expiresAt;
  setStatus("Extended by 10 minutes");
}

function renderMessages(items) {
  messages = items;
  messageCountEl.textContent = `${items.length} message${items.length === 1 ? "" : "s"}`;

  if (!items.length) {
    messageListEl.innerHTML = '<li class="empty-view">No messages yet. Waiting for incoming mail...</li>';
    return;
  }

  messageListEl.innerHTML = "";
  items.forEach(item => {
    const li = document.createElement("li");
    li.className = `message-item ${item.id === selectedMessageId ? "active" : ""}`;
    li.innerHTML = `
      <h4>${item.subject || "(No subject)"}</h4>
      <p>${item.from?.address || "Unknown sender"}</p>
      <p>${new Date(item.createdAt).toLocaleString()}</p>
    `;
    li.addEventListener("click", () => openMessage(item.id));
    messageListEl.appendChild(li);
  });
}

async function refreshInbox() {
  if (!currentEmail) return;

  const response = await fetch(`/api/inbox/${encodeURIComponent(currentEmail)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Unable to refresh inbox");
  }

  renderMessages(data);

  if (selectedMessageId && !data.some(item => item.id === selectedMessageId)) {
    selectedMessageId = "";
    resetViewer();
  }
}

function resetViewer() {
  messageView.classList.add("hidden");
  emptyView.classList.remove("hidden");
  deleteBtn.disabled = true;
  htmlEl.srcdoc = "";
}

async function openMessage(messageId) {
  selectedMessageId = messageId;
  renderMessages(messages);

  const response = await fetch(`/api/inbox/${encodeURIComponent(currentEmail)}/${encodeURIComponent(messageId)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Unable to open message");
  }

  subjectEl.textContent = data.subject || "(No subject)";
  fromEl.textContent = `From: ${data.from?.address || "Unknown"}`;
  toEl.textContent = `To: ${data.to?.map(entry => entry.address).join(", ") || currentEmail}`;
  dateEl.textContent = `Received: ${new Date(data.createdAt).toLocaleString()}`;
  textEl.textContent = data.text || "No text content available.";
  htmlEl.srcdoc = data.html?.[0] || "<p style='padding:8px'>No HTML content available.</p>";

  emptyView.classList.add("hidden");
  messageView.classList.remove("hidden");
  deleteBtn.disabled = false;
}

async function deleteCurrentMessage() {
  if (!currentEmail || !selectedMessageId) return;

  const response = await fetch(`/api/inbox/${encodeURIComponent(currentEmail)}/${encodeURIComponent(selectedMessageId)}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Unable to delete message");
  }

  selectedMessageId = "";
  resetViewer();
  await refreshInbox();
}

async function copyAddress() {
  if (!currentEmail) return;
  await navigator.clipboard.writeText(currentEmail);
  setStatus("Address copied");
}

async function withErrors(task) {
  try {
    await task();
  } catch (error) {
    setStatus(error.message || "Unexpected error", true);
  }
}

document.getElementById("new-email").addEventListener("click", () => withErrors(generateEmail));
document.getElementById("refresh").addEventListener("click", () => withErrors(refreshInbox));
document.getElementById("copy").addEventListener("click", () => withErrors(copyAddress));
document.getElementById("extend").addEventListener("click", () => withErrors(extendMailbox));
deleteBtn.addEventListener("click", () => withErrors(deleteCurrentMessage));

startCountdown();
