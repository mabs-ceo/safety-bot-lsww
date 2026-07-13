<<<<<<< HEAD
# 🦺 Safety Observation WhatsApp Bot

A WhatsApp-based safety observation logging system that lets field teams report, track, and close safety findings directly from a WhatsApp group — no separate app required.

Built on **whapi.cloud** for WhatsApp messaging and designed to run as a **BullMQ** worker (decoupled from Express request/response), so incoming messages are processed asynchronously and reliably, with automatic retries on failure.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![BullMQ](https://img.shields.io/badge/Queue-BullMQ-red)
![Redis](https://img.shields.io/badge/Store-Redis-DC382D?logo=redis&logoColor=white)
![WhatsApp](https://img.shields.io/badge/Messaging-whapi.cloud-25D366?logo=whatsapp&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Features

- **📝 Log a finding** — Report a safety observation straight from WhatsApp using a simple structured message format. Each finding gets a unique observation ID and an instant confirmation reply.
- **✅ Close observations** — Close a specific observation by ID, or close all open observations in one command.
- **📊 View summaries** — Pull a monthly summary of observations, or list every currently open observation regardless of date.
- **🔐 Admin controls** — Admin-only command to toggle the bot's active listening mode in the group.
- **♻️ Queue-based processing** — Message handling is fully decoupled from the webhook handler and runs through a BullMQ + Redis job queue, with job return values retrievable later (e.g. for a frontend polling endpoint) instead of relying on a live socket connection or extra DB query.
- **🔁 Automatic retries** — Failed WhatsApp replies throw and propagate up, so BullMQ automatically retries the job instead of silently dropping it.

---

## 💬 Command Reference

| Command | Example | Description |
|---|---|---|
| `finding:` | `finding: Loose scaffolding on level 3`<br>`party: ABC Contractors`<br>`location: Block A, Level 3` | Creates a new safety observation and returns an observation ID |
| `close$<id>` | `close$SO-1042` | Closes a specific safety observation by ID |
| `close$all` | `close$all` | Closes **all** open safety observations |
| `view$<month>` | `view$jan` | Returns a summary of observations for the given month |
| `view$` | `view$` | Returns a summary for the current month (defaults if no month is given) |
| `view$open` | `view$open` | Lists every currently open observation, regardless of when it was created |
| `!listen` | `!listen` | Admin-only — toggles the bot's active listening mode |

---

## 🧱 Architecture

```
WhatsApp Group
      │
      ▼
whapi.cloud Webhook
      │
      ▼
BullMQ Job Queue (Redis)
      │
      ▼
Worker → processWhatsappMessage()
      │
      ├── finding:  → safetyFindingsController()
      ├── close$    → closeSafetyObservationController() / closeAllSafetyObservationsController()
      └── view$     → getSafetyObservationsummary()
      │
      ▼
replyToGroup() → whapi.cloud → WhatsApp Group
```

Decoupling message handling from the Express route means the webhook can respond immediately (queueing the job), while the actual processing — and any retries on failure — happen safely in the background worker.

---

## ⚙️ Setup

### Prerequisites

- Node.js 18+
- A Redis instance (local or hosted, e.g. Upstash)
- A [whapi.cloud](https://whapi.cloud) account and API token
- A WhatsApp group to act as the reporting channel

### Environment Variables

Create a `.env` file in the project root:

```env
WHATSAPI_TOKEN=your_whapi_cloud_token
ALLOWED_GROUP_ID=your_whatsapp_group_id
REDIS_URL=rediss://your-redis-connection-string
```

### Installation

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
```

### Running

```bash
# Start the webhook server / API
npm start

# Start the BullMQ worker
npm run worker
```

> Configure your whapi.cloud webhook to point to your deployed `/webhook` endpoint so incoming WhatsApp messages are pushed into the queue.

---

## 📁 Project Structure

```
.
├── modules/
│   └── safety_observation/
│       └── controller.js      # DB logic for findings, summaries, and closures
├── workers/
│   └── whatsappHandler.js     # Message parsing + queue job logic (this file)
├── .env
└── README.md
```

---

## 🛣️ Roadmap Ideas

- [ ] Web dashboard for reviewing and exporting findings
- [ ] Photo attachment support for findings
- [ ] Multi-group / multi-site support
- [ ] Role-based reporting (reporter, contractor, safety officer)

---

## 📄 License

MIT
=======
# safety-bot-lsww
WhatsApp bot for logging field safety observations via simple chat commands. Built with whapi.cloud, BullMQ, and Redis for async, retry-safe message processing. Supports creating findings, closing single or all observations, and viewing monthly or open-status summaries — no separate app needed for on-site safety reporting.
>>>>>>> 157002bd793cd6bd7ffaad3e381d261924cab8e0
