// Netlify Function: /api/analyse
// This version calls the OpenAI API directly so a bad SDK/base URL cannot
// turn the OpenAI response into an HTML-page parsing error.

export const config = {
  path: "/api/analyse",
};

const OPENAI_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-5.6";

function reply(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function buildPrompt(question, odds, risk) {
  return `You are the football betting research analyst inside a football dashboard.

The user wants current football research and a bet recommendation.

USER REQUEST:
${question}

RISK PREFERENCE:
${risk}

CURRENT ODDS (if supplied):
${odds || "Not supplied"}

Use current web information. Check relevant and reputable sources for:
- the fixture and competition
- recent form
- home/away form
- goals scored and conceded
- injuries and suspensions
- expected or likely line-ups
- league/cup context
- recent relevant statistics
- goals, corners, cards and other relevant markets where useful
- current previews and team news

Do not invent facts. If something cannot be verified, say so.

Return the answer with these exact headings:

MATCH
CURRENT RESEARCH
MODEL PROBABILITIES
RECOMMENDATIONS
WHY
VALUE CHECK
SOURCES

Probability figures are estimates, not guarantees.

For each recommended bet, explain the evidence and risk.

If odds are supplied, compare the model probability with the implied probability from those odds. If odds are not supplied, say that value cannot be confirmed without the current price.

If the user asks for a bet builder:
- assess each leg separately
- explain why each leg is included
- avoid unnecessary legs
- give the combined risk
- provide one final lower-risk builder where the evidence supports one

Include source names and URLs when available.`;
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return reply(204, {});
  }

  if (req.method === "GET") {
    return reply(200, {
      ok: true,
      endpoint: "/api/analyse",
      configured: Boolean(process.env.OPENAI_API_KEY),
    });
  }

  if (req.method !== "POST") {
    return reply(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return reply(500, {
      error:
        "OPENAI_API_KEY is missing in Netlify Environment Variables. Add it and redeploy.",
    });
  }

  let body;

  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "Invalid JSON request." });
  }

  const question = String(body?.question || "").trim();
  const odds = String(body?.odds || "").trim();
  const risk = String(body?.risk || "Balanced").trim();

  if (!question) {
    return reply(400, {
      error: "Tell the analyst which match or bet to research.",
    });
  }

  if (question.length > 4000) {
    return reply(400, {
      error: "The analysis request is too long.",
    });
  }

  const payload = {
    model: MODEL,
    input: buildPrompt(question, odds, risk),
    tools: [
      {
        type: "web_search_preview",
      },
    ],
  };

  try {
    const openaiResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await openaiResponse.text();

    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!openaiResponse.ok) {
      console.error("OpenAI API HTTP error:", openaiResponse.status, raw);

      return reply(502, {
        error:
          data?.error?.message ||
          `OpenAI API returned HTTP ${openaiResponse.status}.`,
      });
    }

    if (!data) {
      console.error("OpenAI returned non-JSON:", raw.slice(0, 1000));

      return reply(502, {
        error: "OpenAI returned an invalid response.",
      });
    }

    let text = String(data.output_text || "").trim();

    // Fallback extraction in case output_text is not present.
    if (!text && Array.isArray(data.output)) {
      const parts = [];

      for (const item of data.output) {
        if (item?.type !== "message" || !Array.isArray(item.content)) continue;

        for (const content of item.content) {
          if (content?.type === "output_text" && content.text) {
            parts.push(content.text);
          }
        }
      }

      text = parts.join("\n\n").trim();
    }

    if (!text) {
      console.error("OpenAI returned no text:", JSON.stringify(data).slice(0, 3000));

      return reply(502, {
        error: "The AI returned no analysis.",
      });
    }

    return reply(200, {
      text,
    });
  } catch (error) {
    console.error("Netlify AI function error:", error);

    return reply(500, {
      error: error?.message || "AI research request failed.",
    });
  }
}
