const express = require("express");
const cors    = require("cors");
const https   = require("https");

const app        = express();
const BOT_TOKEN  = "8680923943:AAHxnuH_wAv3GO9Arnx8Aj3aDhdR1B7-TeA";
const MINI_APP_URL = "https://novaprime.netlify.app";
const OFFICIAL_CHANNEL = "@Moneyplug_ng001";
const PAYMENT_CHANNEL  = "@paymentchannelalways";

app.use(cors());
app.use(express.json());

function telegramPost(method, body) {
  return new Promise((resolve, reject) => {
    const data    = JSON.stringify(body);
    const options = {
      hostname: "api.telegram.org",
      path:     `/bot${BOT_TOKEN}/${method}`,
      method:   "POST",
      headers:  {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let result = "";
      res.on("data", chunk => result += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(result)); }
        catch(e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function telegramGet(method, params) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams(params).toString();
    const url   = `https://api.telegram.org/bot${BOT_TOKEN}/${method}?${query}`;
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on("error", reject);
  });
}

app.get("/", (req, res) => {
  res.json({ status: "₦aira Rewards Bot — online ✅" });
});

async function notifyWithdrawal({ firstName, username, userId, amount, fee, net, bank, account, accountName, type }) {
  const typeText = type === 'ads' ? 'Ads Earnings' : 'Referral Earnings';
  const msg = `
💸 *NEW ₦AIRA WITHDRAWAL (${typeText})*

👤 *Name:* ${escapeMarkdown(firstName)}
🔗 *Username:* ${username ? '@' + username : 'N/A'}
🆔 *User ID:* \`${userId}\`

💰 *Amount:* ₦${amount}
💸 *Fee (${type === 'ads' ? '40%' : '50%'}):* -₦${fee}
📤 *You Receive:* ₦${net}

🏦 *Bank:* ${bank}
📬 *Account Number:* \`${account}\`
👤 *Account Name:* ${escapeMarkdown(accountName)}

⏰ *Time:* ${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}
📊 *Status:* 📎 Track payment: @paymentchannelalways
  `.trim();

  await telegramPost("sendMessage", {
    chat_id:    PAYMENT_CHANNEL,
    text:       msg,
    parse_mode: "MarkdownV2"
  });
}

function escapeMarkdown(text) {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\]/g, "\\$&");
}

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  const msg = req.body?.message;
  if (!msg) return;
  const chatId    = msg.chat.id;
  const userId    = msg.from.id;
  const firstName = msg.from.first_name || "Friend";
  const text      = msg.text || "";

  if (text.startsWith("/start")) {
    const parts    = text.split(" ");
    const refParam = parts[1] ? parts[1].trim() : null;
    const appUrl = refParam && refParam !== String(userId)
      ? `${MINI_APP_URL}?ref=${refParam}`
      : MINI_APP_URL;

    await telegramPost("sendMessage", {
      chat_id: chatId,
      text: `💵 *Welcome to ₦aira Rewards, ${firstName}!*\n\nEarn Naira by joining channels and watching ads.\n\n*Minimum Ad Withdrawal:* ₦550 (40% fee)\n*Minimum Referral Withdrawal:* ₦1500 (50% fee)\n\nTap below to start earning!`,
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💵 Open ₦aira Rewards", web_app: { url: appUrl } }],
          [{ text: "👥 Invite Friends", url: `https://t.me/share/url?url=https://t.me/Novaprimev3_bot?start=${userId}&text=Earn free Naira!` }]
        ]
      }
    });
  }
});

app.post("/notify-withdrawal", async (req, res) => {
  const { firstName, username, userId, amount, fee, net, bank, account, accountName, type } = req.body;
  if (!userId || !amount || !bank || !account || !accountName) {
    return res.status(400).json({ ok: false, error: "Missing fields" });
  }
  try {
    await notifyWithdrawal({ firstName, username, userId, amount, fee, net, bank, account, accountName, type });
    return res.json({ ok: true });
  } catch(err) {
    console.error("Notify error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/check-member", async (req, res) => {
  const { userId, channel } = req.body;
  if (!userId || !channel) {
    return res.status(400).json({ ok: false, error: "Missing userId or channel" });
  }
  try {
    const result = await telegramGet("getChatMember", { chat_id: channel, user_id: userId });
    if (!result.ok) {
      return res.json({ ok: false, member: false, error: result.description || "Not found" });
    }
    const status = result.result?.status;
    const joined = ["member", "administrator", "creator"].includes(status);
    return res.json({ ok: true, member: joined, status });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/set-webhook", async (req, res) => {
  const webhookUrl = req.query.url;
  if (!webhookUrl) return res.json({ error: "Pass ?url=YOUR_RENDER_URL/webhook" });
  const result = await telegramGet("setWebhook", { url: webhookUrl + "/webhook" });
  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 ₦aira Rewards Bot running on port ${PORT}`));