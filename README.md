# Top Daily Bets — AI Analyst v27

This is the secure version of Top Daily Bets with the AI Analyst server function included.

## Why you saw “Failed to fetch”

The app was being opened as a downloaded `content://` HTML file. That file can display the app, but it cannot provide the `/api/analyse` server function itself. The API key must stay on a server, so the AI feature cannot work from a standalone downloaded HTML file.

## Deploy this exact folder

1. Upload/import this whole folder into Vercel.
2. In Vercel → Project Settings → Environment Variables, add:
   `OPENAI_API_KEY` = your OpenAI API key.
3. Redeploy.
4. Open the Vercel URL on your phone and use AI Analyst.

Do not put the API key into `index.html` or the browser.

The frontend calls `/api/analyse`, and the included server function calls the OpenAI Responses API with web search. The API key remains server-side.
