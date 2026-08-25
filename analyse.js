import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!process.env.OPENAI_API_KEY) return json(res, 500, { error: "AI service is not configured yet. Add OPENAI_API_KEY to the server environment." });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const question = String(body.question || "").trim();
  const odds = String(body.odds || "").trim();
  const risk = String(body.risk || "Balanced").trim();

  if (!question) return json(res, 400, { error: "Tell the analyst which game or bet to research." });
  if (question.length > 4000) return json(res, 400, { error: "Please keep the analysis request under 4,000 characters." });

  const prompt = `You are the football betting research analyst inside a football dashboard. Research the user's request using current web information before answering.

USER REQUEST: ${question}
RISK PREFERENCE: ${risk}
CURRENT ODDS (if supplied): ${odds || "Not supplied"}

Research current relevant information such as fixture/date, recent form, home/away form, goals, injuries/suspensions, team news, league context, expected line-ups and reputable previews/statistical sources. For markets involving goals, corners, cards or similar, use relevant recent and season-level statistics where available. Do not invent facts. Where sources disagree, say so.

Return a concise but useful report with these exact sections:
MATCH
MODEL PROBABILITIES
MARKET PROBABILITIES
RECOMMENDATIONS
WHY
VALUE CHECK
SOURCES

Give probability estimates as ranges or percentages and clearly label them as model estimates, not guarantees. Never call any bet guaranteed or genuinely safe. For recommendations use Lower-risk, Balanced, or Value labels. If odds were supplied, calculate implied probability and compare it with the model estimate. If odds were not supplied, say that value cannot be confirmed. For a bet builder or accumulator request, assess each leg separately first, then assess the combined risk. Include source names and clickable URLs where available.`;

  try {
    const response = await client.responses.create({
      model: "gpt-5.6",
      tools: [{ type: "web_search" }],
      input: prompt,
      include: ["web_search_call.action.sources"],
    });

    return json(res, 200, { text: response.output_text || "No analysis was returned." });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error?.message || "The AI research service failed." });
  }
}
