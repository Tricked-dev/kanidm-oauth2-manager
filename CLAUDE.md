# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SvelteKit application that provides a web-based management interface for Kanidm OAuth2 applications. The project displays OAuth2 applications with their configuration attributes and allows updating display names.

## Development Commands

- `npm run dev` - Start development server with hot reload

## Architecture

### Tech Stack
- **Frontend**: SvelteKit 2.x with Svelte 5 (using runes syntax)
- **Styling**: Tailwind CSS 4.x + DaisyUI components
- **Build Tool**: Vite
- **Deployment**: Node.js adapter (@sveltejs/adapter-node)

### Key Components

#### API Layer (`src/routes/api/kani/+server.ts`)
- Proxy server that handles authentication to Kanidm instance at `https://idm.tricked.dev`
- Implements multi-step authentication flow with session management
- Contains hardcoded credentials for `idm_admin` user
- Forwards requests to Kanidm API with Bearer token authentication

#### Frontend (`src/routes/+page.svelte` & `src/routes/+page.ts`)
- Page loader fetches OAuth2 applications via `kaniRequest` utility
- Displays applications in card layout with attribute tables
- Supports updating display names for OAuth2 apps
- Shows important OAuth2 settings like redirect URLs, scopes, and crypto settings

#### Utilities (`src/utils.ts`)
- `kaniRequest()` function provides typed interface for API calls
- Abstracts POST requests to internal `/api/kani` endpoint

### Data Flow
1. Page load triggers `kaniRequest()` to fetch OAuth2 apps
2. Request goes through internal API proxy (`/api/kani`)
3. Proxy authenticates with Kanidm and forwards request
4. Frontend displays applications and their attributes
5. Updates trigger PATCH requests through same proxy flow

### Important Notes
- Application uses Svelte 5 runes syntax (`$props()`, `$inspect()`)
- Authentication credentials are currently hardcoded in the API route
- The app specifically manages OAuth2 redirect URLs and security settings
- Uses DaisyUI component classes for styling (cards, buttons, tables)