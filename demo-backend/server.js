import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";

const PORT = process.env.PORT || 8080;
const PREFERRED_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

/* ══════════════════════════ ANTHROPIC ══════════════════════════ */

const anthropic = new Anthropic();

const FALLBACK_MODELS = [
  "claude-3-5-haiku-latest",
  "claude-3-7-sonnet-latest",
  "claude-3-5-sonnet-latest",
  "claude-3-haiku-20240307",
];

// Build ordered list: preferred first, then fallbacks (deduped)
const MODEL_CHAIN = [PREFERRED_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PREFERRED_MODEL)];

let workingModel = null; // resolved after first successful call

async function callAnthropic({ system, messages, max_tokens = 160 }) {
  // If we already know a working model, use it directly
  if (workingModel) {
    return anthropic.messages.create({ model: workingModel, max_tokens, system, messages });
  }

  // Try each model in the chain
  for (const model of MODEL_CHAIN) {
    try {
      const response = await anthropic.messages.create({ model, max_tokens, system, messages });
      workingModel = model;
      console.log(`Model resolved: ${model}`);
      return response;
    } catch (err) {
      const isModelNotFound =
        err?.status === 404 ||
        err?.error?.error?.type === "not_found_error" ||
        (err?.message || "").toLowerCase().includes("model");
      if (isModelNotFound) {
        console.warn(`Model ${model} not available, trying next...`);
        continue;
      }
      // Non-model error (auth, rate limit, etc.) — throw immediately
      throw err;
    }
  }

  throw new Error("No available Anthropic model for this API key.");
}

async function testModel(model) {
  try {
    await anthropic.messages.create({
      model,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    return { model, status: "ok" };
  } catch (err) {
    return { model, status: "error", error: err?.message || String(err) };
  }
}

const SYSTEM_PROMPT = `You are the LOGOFF demo agent — a Product Specialist. Showcase how LOGOFF works and answer product questions.

LANGUAGE: Always reply in the language of the user's last message. PT-PT if Portuguese.

FORMAT (mandatory — never deviate):
- 1 short sentence (max 18 words). Then exactly 3 bullets. Then 1 short question (only if relevant).
- Each bullet starts with "- " and has max 10 words.
- Never write more than 1 sentence outside the bullets. No paragraphs.
- Never repeat "Here's the flow:" or similar intros.
- Plain text only. No markdown, no bold, no asterisks, no headings.
- End every sentence and bullet with punctuation.

PRODUCT KNOWLEDGE:
- LOGOFF is an AI customer ops agent (not a chatbot).
- Handles support, sales qualification, onboarding, KPI reporting.
- Runs 24/7, integrates with existing tools.
- Flow: capture messages, classify intent, consult KB, act or escalate.
- Escalation: structured handoff to Slack with context.
- Integrations: Zendesk, Intercom, Freshdesk, HubSpot, Salesforce, Pipedrive, Notion, Confluence, GitBook, Slack, Calendly.
- Pricing: $149 USDC / 30 days, Base or Solana, manual onboarding <24h, 7-day refund.
- Contact: @LogoffAnon on X or logoff@proton.me.
- Privacy: data minimization, logs stay in client stack, GDPR-friendly.

DEMO CONTEXT: This is a demo, not live support. Never generate escalation packets or ticket outputs. For support questions, explain what LOGOFF would do in production.

DO NOT: use markdown, write paragraphs, guess policies, discuss architecture.`;

/* ══════════════════════════ CONVERSATION STORE ══════════════════════════ */

const conversations = new Map();
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES = 20;
const TTL_MS = 30 * 60 * 1000;

function getConversation(id) {
  const conv = conversations.get(id);
  if (!conv) return [];
  if (Date.now() - conv.ts > TTL_MS) {
    conversations.delete(id);
    return [];
  }
  conv.ts = Date.now();
  return conv.messages;
}

function addMessage(id, role, content) {
  if (!conversations.has(id)) {
    if (conversations.size >= MAX_CONVERSATIONS) {
      const oldest = conversations.keys().next().value;
      conversations.delete(oldest);
    }
    conversations.set(id, { messages: [], ts: Date.now() });
  }
  const conv = conversations.get(id);
  conv.messages.push({ role, content });
  conv.ts = Date.now();
  if (conv.messages.length > MAX_MESSAGES) {
    conv.messages = conv.messages.slice(-MAX_MESSAGES);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [id, conv] of conversations) {
    if (now - conv.ts > TTL_MS) conversations.delete(id);
  }
}, 5 * 60 * 1000);

/* ══════════════════════════ ANALYTICS (in-memory) ══════════════════════════ */

const events = [];
const MAX_EVENTS = 5000;

function trackEvent(type, meta = {}) {
  events.push({ type, ts: Date.now(), ...meta });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}

/* ══════════════════════════ EXPRESS ══════════════════════════ */

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error("CORS not allowed"));
    },
  })
);

app.use(express.json({ limit: "16kb" }));

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again in a minute." },
});

const eventLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many events." },
});

/* ── Health ── */
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    preferredModel: PREFERRED_MODEL,
    workingModel: workingModel || "not resolved yet",
    conversations: conversations.size,
  });
});

/* ── Demo Chat ── */
app.post("/demo/chat", chatLimiter, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    if (!message || typeof message !== "string" || message.length > 1000) {
      return res.status(400).json({ error: "Invalid message." });
    }

    const convId = typeof conversationId === "string" ? conversationId.slice(0, 64) : "anon";
    const history = getConversation(convId);
    addMessage(convId, "user", message);

    const response = await callAnthropic({
      system: SYSTEM_PROMPT,
      messages: [...history, { role: "user", content: message }],
    });

    let reply =
      response.content?.[0]?.text || "Got it. Let me look into that.";

    // Post-process: strip markdown, normalize whitespace, hard cap length
    reply = reply.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^#{1,3}\s+/gm, "");
    reply = reply.replace(/\n{3,}/g, "\n\n");
    reply = reply.trim();
    if (reply && !/[.!?…]$/.test(reply)) reply += ".";
    if (reply.length > 750) reply = reply.slice(0, 740).trimEnd() + "\u2026";

    addMessage(convId, "assistant", reply);

    trackEvent("demo_message", { convId });

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err.message);
    const msg = err.message.includes("No available Anthropic model")
      ? err.message
      : "Something went wrong.";
    res.status(500).json({ error: msg });
  }
});

/* ── Track Events ── */
app.post("/track", eventLimiter, (req, res) => {
  const { event, meta } = req.body;
  if (!event || typeof event !== "string") {
    return res.status(400).json({ error: "Invalid event." });
  }
  trackEvent(event, typeof meta === "object" && meta !== null ? meta : {});
  res.json({ ok: true });
});

/* ── Events dump (dev only) ── */
app.get("/events", (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Not available in production." });
  }
  res.json({ total: events.length, events: events.slice(-100) });
});

/* ── Debug: test all models (dev only) ── */
app.get("/debug/models", async (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Not available in production." });
  }
  const results = await Promise.all(MODEL_CHAIN.map(testModel));
  res.json({
    preferredModel: PREFERRED_MODEL,
    workingModel: workingModel || "not resolved yet",
    results,
  });
});

/* ── Start ── */
app.listen(PORT, () => {
  console.log(`LOGOFF demo backend running on :${PORT}`);
  console.log(`Preferred model: ${PREFERRED_MODEL}`);
  console.log(`Fallback chain: ${MODEL_CHAIN.join(" → ")}`);
  console.log(`CORS allowed: ${ALLOWED_ORIGINS.join(", ")}`);
});
