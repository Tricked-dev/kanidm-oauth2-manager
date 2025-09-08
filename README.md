# Kanidm OAuth2 Manager

<img width="1554" height="1312" alt="image" src="https://github.com/user-attachments/assets/4f3b4943-9900-46ad-9ded-07e99b32793b" />

A web-based management interface for [Kanidm](https://kanidm.com/) OAuth2 applications. This SvelteKit
application provides an intuitive interface to view and manage OAuth2
applications configured in your Kanidm identity management system.

## Features

- View all OAuth2 applications with their configuration attributes
- Update display names for OAuth2 applications
- Display important OAuth2 settings including redirect URLs, scopes, and
  cryptographic settings
- Responsive design using Tailwind CSS and DaisyUI components
- Support for image uploads and binary data handling

## Architecture

- **Frontend**: SvelteKit 2.x with Svelte 5 (runes syntax)
- **Styling**: Tailwind CSS 4.x with DaisyUI components
- **Backend**: API proxy layer for Kanidm authentication
- **Build**: Vite with Node.js adapter
- **Package Manager**: Bun

## Required Environment Variables

The application requires the following environment variables to be configured:

| Variable          | Description                                                                    | Example                   |
| ----------------- | ------------------------------------------------------------------------------ | ------------------------- |
| `KANIDM_BASE_URL` | Base URL of your Kanidm instance                                               | `https://idm.example.com` |
| `KANIDM_USERNAME` | Username for Kanidm authentication                                             | `idm_admin`               |
| `KANIDM_PASSWORD` | Password for Kanidm authentication                                             | `your_password_here`      |
| `ORIGIN`          | Location the application is running on required for some features on localhost | `http://localhost:3000`   |

## Docker Deployment

### Using Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  kanidm-oauth2-manager:
    image: ghcr.io/tricked-dev/kanidm-oauth2-manager:latest
    container_name: kanidm-oauth2-manager
    restart: unless-stopped
    ports:
      - '3000:3000'
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
      - '3000:3000'
    env_file: .env
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
  -e ORIGIN=http://localhost:3000 \
  ghcr.io/tricked-dev/kanidm-oauth2-manager:latest
```

## Adding login shield

The application currently has no way to secure it built in you can use
[caddy with the security plugin](https://tricked.dev/blog/kanidm-caddy-security/)
or [oauth2 proxy](https://github.com/oauth2-proxy/oauth2-proxy) to secure the
site instead. pull requests that add built in authentication are welcomed (MUST
have oidc support).

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

### Or just run it locally real quick

pull the container do what you want shutdown the container and forget i exist :\)

running it with bun is also a valid option if you don't want to deal with docker btw

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
3. **Cross-site POST form submissions are forbidden when trying to upload app image**: Ensure the origin environment variable is set

### Logs

Check container logs for detailed error information:

```bash
docker logs kanidm-oauth2-manager
```

## More images

<img width="3839" height="2160" alt="Groups" src="https://github.com/user-attachments/assets/113a36e9-c995-42a8-9256-0a0839d3292e" />
<img width="3839" height="2160" alt="Oauth2" src="https://github.com/user-attachments/assets/9f23efa0-69fe-4ae3-9b22-523117ee4b6d" />
<img width="3839" height="2160" alt="Users" src="https://github.com/user-attachments/assets/d30f4f55-6fe5-4529-b324-3f422a62799c" />


## License

This project is licensed under the MPL-2.0 License.
