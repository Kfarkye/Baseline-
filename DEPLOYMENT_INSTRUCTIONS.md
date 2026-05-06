# Production Deployment Setup

## 1. GitHub Connection
You requested to push the current codebase to a new GitHub repo.
1. Create a **private** repository on GitHub named `baseline-mlb`.
2. From the AI Studio settings menu, use **Export to ZIP** or link directly to GitHub if connected.
3. If downloading ZIP:
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/baseline-mlb.git
   git push -u origin main
   \`\`\`

## 2. GitHub Actions Setup
A strictly scoped GitHub Actions file has been placed in `.github/workflows/deploy.yml`. 
It executes an auto-deploy to Cloud Run (`gen-lang-client-0281999829` project) on every push to the `main` branch.

**To configure securely:**
1. In your new GitHub Repo, go to **Settings > Secrets and variables > Actions**.
2. Create a new Repository Secret named `GCP_CREDENTIALS`.
3. Paste the contents of your Google Cloud Service Account JSON key the action will use to authenticate to `gen-lang-client-0281999829`.

## 3. Cloud Run & Secret Manager Setup
In your architecture, the `deploy.yml` references environment variables safely managed via **Google Cloud Secret Manager**. It does NOT upload `.env.local` to GitHub.

Create these secrets in **Google Cloud Secret Manager** inside the `gen-lang-client-0281999829` project:
- `stripe_secret_key`
- `odds_api_key`
- `firebase_service_account`
- `gemini_api_key`

Grant the Cloud Run Service Agent permission to access these secrets (`roles/secretmanager.secretAccessor`).

## 4. MCP Server Endpoints
The platform exposes two primary standard MCP endpoints required for the Model Context Protocol:
- **SSE Transport Endpoint:** `/mcp`
- **POST Messages Endpoint:** `/mcp/messages`

It securely registers the requested tools (`get_slate`, `get_game`, `get_team_record`, `get_pitcher_matchup`).
Once launched remotely, external UI clients can connect to `https://baseline.bet/mcp`. 

*Note: Write-tools and strict authenticated-clients are marked as a V2 addition.*

## 5. Deployment Setup Checklist
- [x] **Project Verification:** Deploy to `gen-lang-client-0281999829` on `us-central1`
- [ ] **Custom Domain:** Map your custom domain (`baseline.bet`) directly to the Cloud Run service via the **Cloud Run > Manage Custom Domains** UI or via **Global HTTP(s) Load Balancer** (recommended for Cloud CDN).
- [ ] **Cloud CDN:** If scaling, route the custom domain through a GCP Global HTTP(S) Load Balancer and enable Cloud CDN on the backend service to cache static assets located in the `/dist` directory.
- [ ] **Cloud Logging/Monitoring:** Already native to Cloud Run. Application errors and access events are recorded automatically in Operations Suite via stdout.
