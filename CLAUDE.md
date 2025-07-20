# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a SvelteKit application that provides a web-based management interface
for Kanidm OAuth2 applications. The project displays OAuth2 applications with
their configuration attributes and allows updating display names.

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

- Proxy server that handles authentication to Kanidm instance at
  `https://idm.tricked.dev`
- Implements multi-step authentication flow with session management
- Contains hardcoded credentials for `idm_admin` user
- Forwards requests to Kanidm API with Bearer token authentication

#### Frontend (`src/routes/+page.svelte` & `src/routes/+page.ts`)

- Page loader fetches OAuth2 applications via `kaniRequest` utility
- Displays applications in card layout with attribute tables
- Supports updating display names for OAuth2 apps
- Shows important OAuth2 settings like redirect URLs, scopes, and crypto
  settings

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

### Example kanidm oauth2 application payload

```json
[
    {
        "attrs": {
            "class": [
                "account",
                "key_object",
                "key_object_internal",
                "key_object_jwe_a128gcm",
                "key_object_jwt_es256",
                "key_object_jwt_rs256",
                "memberof",
                "oauth2_resource_server",
                "oauth2_resource_server_basic",
                "object"
            ],
            "directmemberof": ["idm_all_accounts@tricked.dev"],
            "displayname": ["Linkwarden"],
            "key_internal_data": [
                "147bbd7d0c39c7a01c75529e3c1f30cb: valid jwe_a128gcm 0",
                "7c0f2de437f36005df95ad639972b24e: valid jws_es256 0",
                "bf3d0c8a45f4c0af95c68dd9c3e378a039ea92369274a91c47abe40e1c348a4a: valid jws_rs256 0"
            ],
            "memberof": ["idm_all_accounts@tricked.dev"],
            "name": ["linkwarden"],
            "oauth2_jwt_legacy_crypto_enable": ["true"],
            "oauth2_rs_basic_secret": ["hidden"],
            "oauth2_rs_origin": [
                "https://links.tricked.dev/api/v1/auth/callback/authentik",
                "https://links.tricked.dev/api/v1/auth/callback/kanidm",
                "https://links.tricked.dev/api/v1/auth"
            ],
            "oauth2_rs_origin_landing": ["https://links.tricked.dev/"],
            "oauth2_rs_scope_map": [
                "idm_all_persons@tricked.dev: {\"email\", \"generic_users\", \"groups\", \"openid\", \"profile\"}"
            ],
            "oauth2_strict_redirect_uri": ["true"],
            "spn": ["linkwarden@tricked.dev"],
            "uuid": ["1ccbb914-30f0-491e-8fcf-63dceb1298a5"]
        }
    }
]
```
