# 🏢 AI Office — Mission Control

Real-time AI agent operations center. Watch your agents code, research, analyze and think — live.

## ✨ Features

- **4 AI Agents** with real-time status (coding, researching, analyzing, thinking)
- **Live task feed** — tasks appear and complete in real time
- **Agent inspector** — click any agent to see their terminal output
- **System metrics** — tokens, requests/min, uptime
- **Cyberpunk aesthetic** — scanlines, neon, dark ops center vibes

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🗂 Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main layout
│   └── globals.css       # Global styles + animations
├── components/
│   └── ui/
│       ├── AgentDesk.tsx    # Individual agent card
│       ├── AgentDetail.tsx  # Expanded agent view
│       ├── TaskFeed.tsx     # Live task stream
│       └── MetricsBar.tsx   # Top metrics bar
├── hooks/
│   └── useAgents.ts      # Agent state + simulation
├── lib/
│   └── agents.ts         # Agent data + config
└── types/
    └── agent.ts          # TypeScript types
```

## 🔌 Connecting Real Agents

Replace the mock simulation in `hooks/useAgents.ts` with:

```typescript
// Option A: Server-Sent Events
const eventSource = new EventSource('/api/stream');
eventSource.onmessage = (e) => {
  const update = JSON.parse(e.data);
  // update agent state
};

// Option B: WebSocket
const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);
ws.onmessage = (e) => {
  const update = JSON.parse(e.data);
  // update agent state
};
```

## 📦 Adding 3D (Next Step)

1. Get character models from [quaternius.com](https://quaternius.com)
2. Add animations from [mixamo.com](https://mixamo.com)
3. Replace the 2D grid with a `<Canvas>` using `@react-three/fiber`

## 🚢 Deploy

```bash
vercel --prod
```

## 🛠 Tech Stack

- Next.js 15 (App Router)
- Framer Motion
- Tailwind CSS
- TypeScript