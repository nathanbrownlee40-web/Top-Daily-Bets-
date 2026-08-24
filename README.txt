TOP DAILY BETS — MARKET-ONLY UPDATE

Files to replace in the existing app/repository:
- index.html
- sw.js
- manifest.json (same app manifest, included for completeness)

Changes:
- Removed the separate Selection input from New Bet.
- Market is now the single field used for the bet pick, e.g. "Over 2.5 Goals", "BTTS", "Corners", "Match Result".
- New bets save the market as the displayed bet market and keep a compatibility copy in the old selection field so existing data is not broken.
- Existing bets are migrated on load if they have a selection but no market.
- Betting cards now show MARKET + the market text, with no separate selection value.
- Best-performing Market bars now group strictly by the Market field, not team names or selection values.
- Search placeholder is now "Search team, market".
- Graph point details show the date/time, market, stake, odds, and Total P/L after bet.
- Service-worker cache was bumped to v5 so phones pick up this build.

Keep the existing icon files in the repository.
