let email = null;

async function generate() {
  const expiry = document.getElementById("expiry").value;
  const res = await fetch("/api/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiry: Number(expiry) })
  });
  const data = await res.json();
  email = data.email;
  document.getElementById("email").innerText = email;
  document.getElementById("expires").innerText =
    new Date(data.expiresAt).toLocaleTimeString();
  pollInbox();
}

function pollInbox() {
  setInterval(async () => {
    if (!email) return;
    const r = await fetch(`/api/inbox/${email}`);
    if (!r.ok) return;
    const msgs = await r.json();
    const ul = document.getElementById("inbox");
    ul.innerHTML = "";
    msgs.forEach(m => {
      const li = document.createElement("li");
      li.innerText = `${m.from.address} - ${m.subject}`;
      ul.appendChild(li);
    });
  }, 3000);
}
