import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return json(res, 204, {});
  }

  if (req.method === "GET") {
    return json(res, 200, {
      ok: true,
      configured: Boolean(process.env.OPENAI_API_KEY),
      endpoint: "/api/analyse",
    });
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(res, 500, {
      error: "AI service is not configured. Add OPENAI_API_KEY to Vercel Environment Variables and redeploy.",
    });
  }

  let body = req.body || {};

  try {
    if (typeof body === "string") {
      body = JSON.parse(body || "{}");
    }
  } catch {
    return json(res, 400, { error: "Invalid request body." });
  }

  const question = String(body.question || "").trim();
  const odds = String(body.odds || "").trim();
  const risk = String(body.risk || "Balanced").trim();

  if (!question) {
    return json(res, 400, {
      error: "Tell the analyst which game or bet to research.",
    });
  }

  if (question.length > 4000) {
    return json(res, 400, {
      error: "Please keep the analysis request under 4,000 characters.",
    });
  }

  const prompt = `You are the football betting research analyst inside a football dashboard.

Research the user's request using current web information before answering.

USER REQUEST:
${question}

RISK PREFERENCE:
${risk}

CURRENT ODDS (if supplied):
${odds || "Not supplied"}

Research current relevant information such as:
- fixture and date
- recent form
- home/away form
- goals scored and conceded
- injuries and suspensions
- team news
- expected line-ups
- league context
- reputable previews and statistical sources
- relevant recent and season-level statistics for goals, corners, cards and similar markets

Do not invent facts. If information cannot be verified, say so. Where sources disagree, say so.

Return a concise but useful report using these exact sections:

MATCH
MODEL PROBABILITIES
MARKET PROBABILITIES
RECOMMENDATIONS
WHY
VALUE CHECK
SOURCES

Give probability estimates as ranges or percentages and clearly label them as model estimates, not guarantees.

Never describe any bet as guaranteed or genuinely safe.

For recommendations use:
- Lower-risk
- Balanced
- Value-focused

If odds were supplied, calculate the implied probability and compare it with the model estimate.

If odds were not supplied, clearly say that value cannot be confirmed without the current price.

For a bet builder or accumulator request:
1. Assess every leg separately first.
2. Explain the reasoning for each leg.
3. Assess the combined risk.
4. Give the final suggested builder only if the available evidence supports it.

Include source names and clickable URLs where available.`;

  try {
    const response = await client.responses.create({
      model: "gpt-5.6",
      tools: [{ type: "web_search" }],
      input: prompt,
      include: ["web_search_call.action.sources"],
    });

    const text = response?.output_text?.trim();

    if (!text) {
      return json(res, 502, {
        error: "The AI returned no analysis.",
      });
    }

    return json(res, 200, { text });
  } catch (error) {
    console.error("AI ANALYST ERROR:", error);

    const message =
      error?.message ||
      error?.error?.message ||
      "The AI research service failed.";

    return json(res, 500, {
      error: message,
    });
  }
}
