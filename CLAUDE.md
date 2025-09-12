# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a comprehensive SvelteKit application that provides a complete web-based management
interface for Kanidm identity management system. The application features full lifecycle
management for OAuth2 applications, groups, and users with advanced capabilities including
Unix/POSIX extensions, SSH key management, password reset functionality, group membership
management, and credential handling.

## Development Commands

WE USE BUN USE BUN FOR ALL PACKAGE MANAGER RELATED COMMANDS

- `bun run dev` - Start development server with hot reload
- `bun run check`
- `bun run build`

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

#### Main Interface (`src/routes/+page.svelte` & `src/routes/+page.server.ts`)

- Tabbed interface with three main sections: OAuth2, Groups, and Users
- Page loader fetches data for all three entity types from Kanidm API
- Centralized notification system shared across all managers
- Responsive design with item counts displayed in tab badges

#### OAuth2 Manager (`src/lib/components/Oauth2Manager.svelte`)

- Full OAuth2 application lifecycle management (create, edit, delete)
- Advanced configuration options: PKCE, legacy crypto, redirect URLs
- Image upload and favicon fetching capabilities
- Scope mapping management for group-based permissions
- Support for both confidential and public OAuth2 clients

#### Group Manager (`src/lib/components/GroupManager.svelte`)

- **Complete group lifecycle**: Create, edit, delete groups with validation
- **Member management**: Add/remove users and groups as members with real-time updates
- **Unix/POSIX extensions**: Enable Unix group functionality with GID configuration
- **Group attributes**: Manage display names, descriptions, and metadata
- **Unix token generation**: Generate and retrieve Unix tokens for system integration
- **Modal-based workflows**: Streamlined UI for enabling Unix extensions and adding members

#### User Manager (`src/lib/components/UserManager.svelte`)

- **Full user lifecycle**: Create, edit, delete user accounts with comprehensive validation
- **User attributes**: Manage display names, email addresses, legal names, and metadata
- **Unix extensions**: Enable POSIX account functionality with UID, GID, home directory, and shell configuration
- **SSH key management**: Add, remove, and copy SSH public keys with tag-based organization
- **Password management**: Reset passwords for Unix-enabled accounts with secure workflows
- **Group membership**: Visualize and manage user group memberships with add/remove functionality
- **Credential management**: Access credential status and update intents for account security
- **Advanced UI**: In-line editing, dropdown actions, and modal-based forms for complex operations

#### Utilities (`src/utils.ts`)

- `kaniRequest()` function provides typed interface for API calls
- Abstracts all HTTP methods (GET, POST, PATCH, DELETE) to internal `/api/kani` endpoint
- Handles both JSON and FormData payloads

### Data Flow

1. Page load triggers multiple `kaniRequest()` calls to fetch OAuth2 apps, groups, and users
2. All requests go through internal API proxy (`/api/kani`) with automatic authentication
3. Proxy authenticates with Kanidm using session management and forwards requests
4. Frontend displays all entities in tabbed interface with proper component separation
5. All CRUD operations (Create, Read, Update, Delete) go through the same proxy flow
6. Specialized operations (Unix extensions, SSH keys, passwords) use dedicated API endpoints

### Important Notes

- Application uses Svelte 5 runes syntax (`$props()`, `$state()`, etc.)
- Authentication credentials are currently hardcoded in the API route
- Comprehensive management of OAuth2, Groups, and Users with advanced features
- Unix/POSIX extensions supported for both groups and users
- SSH key management with multiple key support per user
- Uses DaisyUI component classes for styling (cards, buttons, tables, tabs, modals)
- Modular architecture with separate manager components for maintainability
- Centralized notification system with toast messages

### API Endpoints Used

Based on the Kanidm OpenAPI specification, the application uses these key endpoints:

#### OAuth2 Management

- `GET /v1/oauth2` - List all OAuth2 applications
- `POST /v1/oauth2/_basic` - Create confidential OAuth2 client
- `POST /v1/oauth2/_public` - Create public OAuth2 client
- `GET /v1/oauth2/{rs_name}` - Get OAuth2 application details
- `PATCH /v1/oauth2/{rs_name}` - Update OAuth2 application
- `DELETE /v1/oauth2/{rs_name}` - Delete OAuth2 application
- `GET /v1/oauth2/{rs_name}/_basic_secret` - Get application secret
- `POST /v1/oauth2/{rs_name}/_image` - Upload application image
- `DELETE /v1/oauth2/{rs_name}/_image` - Delete application image
- `POST /v1/oauth2/{rs_name}/_scopemap/{group}` - Manage scope mappings

#### Group Management

- `GET /v1/group` - List all groups
- `POST /v1/group` - Create new group
- `GET /v1/group/{id}` - Get group details
- `PATCH /v1/group/{id}` - Update group
- `DELETE /v1/group/{id}` - Delete group
- `POST /v1/group/{id}/_attr/member` - Add group member
- `DELETE /v1/group/{id}/_attr/member` - Remove group member
- `POST /v1/group/{id}/_unix` - Enable Unix extension
- `GET /v1/group/{id}/_unix/_token` - Get Unix token

#### User Management

- `GET /v1/person` - List all users/persons
- `POST /v1/person` - Create new user
- `GET /v1/person/{id}` - Get user details
- `PATCH /v1/person/{id}` - Update user
- `DELETE /v1/person/{id}` - Delete user
- `POST /v1/account/{id}/_unix` - Enable Unix extension for user
- `POST /v1/account/{id}/_unix/_token` - Generate Unix token
- `POST /v1/account/{id}/_unix/_auth` - Reset user password
- `GET /v1/account/{id}/_ssh_pubkeys` - Get SSH keys
- `POST /v1/account/{id}/_ssh_pubkeys/{tag}` - Add SSH key
- `DELETE /v1/account/{id}/_ssh_pubkeys/{tag}` - Remove SSH key

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
