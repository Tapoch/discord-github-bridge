# discord-github-bridge

Discord bot that syncs a forum channel with GitHub Issues. Create a post in Discord — get an issue in GitHub. Comment on the issue — see it in Discord.

## How it works

```
Discord Forum Channel               GitHub Repository
 +-----------------+                 +-----------------+
 | New post        | ─── creates ──> | New issue       |
 | Message in      | ─── creates ──> | Comment on      |
 |   thread        |                 |   issue         |
 | Thread archived | ─── closes ───> | Issue closed    |
 |                 |                 |                 |
 | Notification    | <── webhook ─── | Comment added   |
 | Notification    | <── webhook ─── | Issue closed    |
 | Notification    | <── webhook ─── | Label changed   |
 | Notification    | <── webhook ─── | Assignee set    |
 +-----------------+                 +-----------------+
```

## Features

### Discord to GitHub

- **Auto-create issues** — new forum post becomes a GitHub issue
- **Tag to label mapping** — forum tags (bug, feature...) map to GitHub labels
- **Message sync** — thread messages become issue comments (with author name)
- **Attachments** — images and files are embedded as markdown links
- **Auto-close** — archiving a thread closes the linked issue

### GitHub to Discord

- **Comments** — new issue comments appear as embeds in the thread (with avatar, link, timestamp)
- **Issue closed/reopened** — notification in thread
- **Labels** — added/removed label notification
- **Assignees** — assigned/unassigned notification
- **Webhook verification** — `x-hub-signature-256` validated via secret

### Slash Commands

| Command | Description |
|---------|-------------|
| `/link-issue <number>` | Link a thread to an existing GitHub issue |
| `/close-issue` | Close the linked issue from Discord |
| `/sync-status` | Show link status: issue number, state, labels, URL |

### Infrastructure

- **SQLite** with WAL mode for thread-to-issue mapping (persisted via Docker volume)
- **GitHub App** auth with automatic token refresh
- **Fastify** webhook server with `/health` endpoint
- **Pino** structured logging
- **Graceful shutdown** on SIGINT/SIGTERM
- **Docker** multi-stage build with tini
- **Traefik** labels for automatic HTTPS via Let's Encrypt
- **Echo guard** prevents message loops between Discord and GitHub

## Tech Stack

- Node.js 22 + TypeScript
- discord.js v14
- @octokit/app + @octokit/webhooks
- Fastify
- better-sqlite3
- Pino

## Setup

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** tab, enable **Message Content Intent**
4. Go to **OAuth2** tab, select scopes: `bot`, `applications.commands`
5. Bot permissions: Send Messages, Read Message History, Manage Threads, Use Slash Commands
6. Copy the invite URL and add the bot to your server
7. Copy the **Bot Token**

### 2. Create a GitHub App

1. Go to GitHub **Settings** > **Developer Settings** > **GitHub Apps** > **New GitHub App**
2. Set permissions:
   - **Issues**: Read & Write
   - **Metadata**: Read-only
3. Subscribe to webhook events: `issues`, `issue_comment`
4. Set **Webhook URL** to `https://your-domain.com/api/webhooks/github`
5. Set a **Webhook secret** (save it)
6. After creation, note the **App ID**
7. Generate a **Private Key** (downloads a `.pem` file)
8. Install the app on your repository
9. Note the **Installation ID** (visible in the URL after installing: `github.com/settings/installations/<ID>`)

### 3. Configure Environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
# Discord
DISCORD_TOKEN=your-bot-token
DISCORD_GUILD_ID=your-server-id
DISCORD_FORUM_CHANNEL_ID=your-forum-channel-id

# GitHub App
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY=<base64-encoded .pem>
GITHUB_APP_INSTALLATION_ID=12345678
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name

# Server
WEBHOOK_PORT=3000
```

Encode the private key:

```bash
base64 -i your-app-name.pem
```

### 4. Run

**Local development:**

```bash
npm install
npm run dev
```

**Docker:**

```bash
docker compose up -d --build
```

Before deploying, update `docker-compose.yml`:
- Replace `bridge.example.com` with your domain
- Adjust the Traefik network name if needed

## Project Structure

```
src/
├── index.ts                    # Entry point
├── config.ts                   # Env validation
├── discord/
│   ├── client.ts               # Discord.js client setup
│   ├── events/
│   │   ├── index.ts            # Event registration
│   │   ├── threadCreate.ts     # Forum post -> GitHub issue
│   │   ├── messageCreate.ts    # Thread message -> issue comment
│   │   └── threadUpdate.ts     # Thread archived -> close issue
│   └── commands/
│       ├── register.ts         # Slash command registration
│       ├── linkIssue.ts        # /link-issue
│       ├── closeIssue.ts       # /close-issue
│       └── syncStatus.ts       # /sync-status
├── github/
│   ├── app.ts                  # GitHub App auth + token refresh
│   ├── issues.ts               # Issues API (create, close, comment, get)
│   ├── webhooks.ts             # Fastify server for GitHub webhooks
│   └── handlers/
│       ├── issueHandler.ts     # Issue events -> Discord notifications
│       └── commentHandler.ts   # Comment events -> Discord embeds
├── storage/
│   ├── database.ts             # SQLite initialization
│   └── mappings.ts             # Thread <-> Issue mapping CRUD
└── utils/
    ├── logger.ts               # Pino logger
    ├── echoGuard.ts            # Loop prevention markers
    └── attachments.ts          # Discord attachments to markdown
```

## License

MIT
