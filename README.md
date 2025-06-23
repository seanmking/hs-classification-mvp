# HS Code Classification MVP

A legally defensible HS Code classification system that guides users through the General Rules for Interpretation (GRI) systematically while documenting every decision for legal defense.

## Features

- **Sequential GRI Application**: Enforces GRI rules 1-6 in order
- **Decision Documentation**: Records every decision with timestamp and reasoning
- **AI-Powered Guidance**: Local LLM integration for intelligent classification assistance
- **Audit Trail**: Immutable record of the entire classification journey
- **Legal Report Generation**: Professional, court-ready classification reports

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Local Llama instance running on localhost:8080
- SQLite support

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite with Drizzle ORM
- **Styling**: TailwindCSS
- **Local LLM**: Llama integration
- **State Management**: React Context + Zustand
- **Form Handling**: React Hook Form with Zod validation

## Legal Compliance

This system is designed to meet international customs classification requirements by:
- Enforcing sequential GRI rule application
- Creating contemporary evidence through real-time documentation
- Maintaining immutable audit trails
- Generating legally defensible reports

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:studio` - Open Drizzle Studio for database management
- `npm run lint` - Run ESLint

## License

Proprietary - All rights reserved