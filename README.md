# Kanidm OAuth2 Manager

<img width="1554" height="1312" alt="image" src="https://github.com/user-attachments/assets/4f3b4943-9900-46ad-9ded-07e99b32793b" />


A web-based management interface for Kanidm OAuth2 applications. This SvelteKit
application provides an intuitive interface to view and manage OAuth2
applications configured in your Kanidm identity management system.

## Features

- View all OAuth2 applications with their configuration attributes
- Update display names for OAuth2 applications
- Display important OAuth2 settings including redirect URLs, scopes, and
  cryptographic settings
- Responsive design using Tailwind CSS and DaisyUI components
- Session-based authentication with token caching
- Support for image uploads and binary data handling

## Architecture

- **Frontend**: SvelteKit 2.x with Svelte 5 (runes syntax)
- **Styling**: Tailwind CSS 4.x with DaisyUI components
- **Backend**: API proxy layer for Kanidm authentication
- **Build**: Vite with Node.js adapter
- **Package Manager**: Bun

## Required Environment Variables

The application requires the following environment variables to be configured:

| Variable          | Description                        | Example                   |
| ----------------- | ---------------------------------- | ------------------------- |
| `KANIDM_BASE_URL` | Base URL of your Kanidm instance   | `https://idm.example.com` |
| `KANIDM_USERNAME` | Username for Kanidm authentication | `idm_admin`               |
| `KANIDM_PASSWORD` | Password for Kanidm authentication | `your_password_here`      |

## Docker Deployment

### Using Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: "3.8"

services:
  kanidm-oauth2-manager:
    image: ghcr.io/tricked-dev/kanidm-oauth2-manager:latest
    container_name: kanidm-oauth2-manager
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - KANIDM_BASE_URL=https://your-kanidm-instance.example.com
      - KANIDM_USERNAME=idm_admin
      - KANIDM_PASSWORD=your_admin_password
    depends_on:
      - kanidm # Optional: if running Kanidm in the same compose stack
    networks:
      - kanidm-network

networks:
  kanidm-network:
    driver: bridge
```

or if you like them like this

```yaml
services:
  kanidm-oauth2-manager:
    image: ghcr.io/tricked-dev/kanidm-oauth2-manager:latest
    container_name: kanidm-oauth2-manager
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file: .
```

### Using Docker Run

```bash
docker run -d \
  --name kanidm-oauth2-manager \
  --restart unless-stopped \
  -p 3000:3000 \
  -e KANIDM_BASE_URL=https://your-kanidm-instance.example.com \
  -e KANIDM_USERNAME=idm_admin \
  -e KANIDM_PASSWORD=your_admin_password \
  ghcr.io/tricked-dev/kanidm-oauth2-manager:latest
```

## Development Setup

### Prerequisites

- Bun package manager
- Node.js 18+
- Access to a Kanidm instance

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Kanidm configuration
   ```

4. Start the development server:
   ```bash
   bun run dev
   ```

### Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run check` - Run Svelte type checking
- `bun run lint` - Check code formatting
- `bun run format` - Format code

## Configuration

The application connects to your Kanidm instance through an API proxy layer that
handles authentication and session management. The proxy automatically manages
Bearer token authentication with a 5-minute token cache to optimize performance.

## Security Considerations

- Ensure your Kanidm credentials are stored securely
- Use environment variables or Docker secrets for sensitive configuration
- The application requires administrative access to Kanidm for OAuth2
  application management
- Consider running behind a reverse proxy with TLS termination

## OAuth2 Application Management

The interface displays OAuth2 applications with their complete configuration
including:

- Application name and display name
- Redirect URLs and origin settings
- Scope mappings and security settings
- Cryptographic configuration
- Basic secret configuration (hidden for security)

## Troubleshooting

### Common Issues

1. **Authentication failures**: Verify `KANIDM_USERNAME` and `KANIDM_PASSWORD`
   are correct
2. **Connection errors**: Ensure `KANIDM_BASE_URL` is accessible from the
   container
3. **Permission denied**: Confirm the user account has administrative privileges
   in Kanidm

### Logs

Check container logs for detailed error information:

```bash
docker logs kanidm-oauth2-manager
```

## License

This project is licensed under the MIT License.
