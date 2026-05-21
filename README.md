# Aurion OS

Autonomous Autopilot Token Velocity Engine - A real-time multi-agent general ledger system for token velocity monitoring and transaction processing.

## Features

- **Real-time Telemetry**: Live metrics for circulating supply, 24h trade volume, token velocity, and network health
- **Multi-Agent Ledger**: Real-time transaction feed with multi-signature support
- **Transaction Console**: Interface for token transfers and ecosystem interactions
- **Supabase Integration**: Persistent ledger storage with PostgreSQL backend

## Tech Stack

- [Next.js 16](https://nextjs.org) - React framework
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS
- [Supabase](https://supabase.com) - Database and authentication
- [TypeScript](https://typescriptlang.org) - Type-safe JavaScript

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ledger/           # Ledger data endpoints
│   │   ├── metrics/velocity/ # Velocity metrics endpoint
│   │   └── token/transfer/   # Token transfer endpoint
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── LedgerView.tsx        # Real-time ledger display
│   └── TransactionConsole.tsx # Transaction interface
└── lib/
    ├── compliance_gate.ts    # Compliance validation
    ├── supabase.ts           # Supabase client
    └── token.ts              # Token utilities
```

## Environment Variables

Create a `.env.local` file with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

## License

MIT