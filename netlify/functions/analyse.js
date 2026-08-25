import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return response({}, 204);

  if (req.method === "GET") {
    return response({
      ok: true,
      configured: Boolean(process.env.OPENAI_API_KEY),
      endpoint: "/api/analyse",
    });
  }

  if (req.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  if (!process.env.OPENAI_API_KEY) {
    return response({
      error:
        "AI service is not configured. Add OPENAI_API_KEY in Netlify Environment Variables, then redeploy.",
    }, 500);
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    return response({ error: "Invalid request body." }, 400);
  }

  const question = String(body?.question || "").trim();
  const odds = String(body?.odds || "").trim();
  const risk = String(body?.risk || "Balanced").trim();

  if (!question) {
    return response({
      error: "Tell the analyst which game or bet to research.",
    }, 400);
  }

  if (question.length > 4000) {
    return response({
      error: "Please keep the analysis request under 4,000 characters.",
    }, 400);
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
    const ai = await client.responses.create({
      model: "gpt-5.6",
      tools: [{ type: "web_search" }],
      input: prompt,
    });

    const text = ai?.output_text?.trim();

    if (!text) {
      return response({ error: "The AI returned no analysis." }, 502);
    }

    return response({ text });
  } catch (error) {
    console.error("AI ANALYST ERROR:", error);

    return response({
      error:
        error?.message ||
        error?.error?.message ||
        "The AI research service failed.",
    }, 500);
  }
}

// Keep the existing frontend endpoint /api/analyse working on Netlify.
export const config = {
  path: "/api/analyse",
};
