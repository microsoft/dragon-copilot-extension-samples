# Dragon Copilot Extensions Sandbox

A local development environment for testing and validating Dragon Copilot extensions before deployment to customer sites.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18.x
- npm >= 9.x

## Quick Start

```bash
# 1. Navigate to the sandbox directory
cd tools/extensions-sandbox

# 2. Install dependencies
npm install

# 3. Build both client and server
npm run build

# 4. Start the production server
npm start
```

The server will be available at `http://localhost:4000`.

## Development

For local development with hot-reload:

```bash
npm run dev
```

This starts both the frontend (Vite dev server on port 3000) and backend (Express on port 4000) concurrently. The frontend proxies API calls to the backend automatically.

Open `http://localhost:3000` in your browser.

## Project Structure

```
extensions-sandbox/
├── package.json          # Root workspace configuration
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── main.tsx      # Application entry point
│   │   ├── App.tsx       # Root component
│   │   └── App.css       # Global styles
│   ├── index.html        # HTML template
│   ├── vite.config.ts    # Vite configuration with API proxy
│   └── tsconfig.json     # TypeScript configuration
└── server/               # Express backend
    ├── src/
    │   ├── index.ts      # Server entry point
    │   └── routes/
    │       └── health.ts # Health check endpoint
    └── tsconfig.json     # TypeScript configuration
```

## API Endpoints

| Method | Path          | Description          |
|--------|---------------|----------------------|
| GET    | /api/health   | Server health check  |

## Architecture

- **Frontend**: React 19 with Vite for fast HMR during development
- **Backend**: Express 5 with TypeScript
- **Communication**: Frontend proxies `/api/*` requests to the backend server
- **Build**: npm workspaces for unified dependency management

## Next Steps

The sandbox will support the following workflows (upcoming features):
- Upload & validate extension manifests
- Browse capabilities and tools from manifests
- Execute tools with custom inputs against local endpoints
- Validate responses against expected schemas
- Generate consolidated test reports
