# LiteLLM Connection Manager Frontend

Enterprise admin dashboard for LiteLLM User Connection and Access Management Interface.

## Features

- 🔐 **Authentication** - JWT-based authentication with role-based access control
- 🔗 **Connection Management** - Full CRUD operations for LLM provider connections
- 🛡️ **Policy Management** - Access policy creation and management
- 📊 **Dashboard** - Real-time monitoring and analytics
- 🎨 **Modern UI** - Responsive design with Tailwind CSS
- ⚡ **Performance** - Optimized with Vite and code splitting
- 🧪 **Testing** - Comprehensive test suite with Vitest
- 🐳 **Docker** - Containerized deployment ready

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Headless UI
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + Testing Library
- **Deployment**: Docker + Nginx

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose (for containerized development)

### Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001

### Docker Development

```bash
# Start all services (backend + frontend)
docker-compose up -d

# Start only frontend with development profile
docker-compose --profile dev up frontend-dev

# View logs
docker-compose logs -f frontend
```

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run preview` - Preview production build locally

### Building
- `npm run build` - Build for production
- `npm run build:staging` - Build for staging environment
- `npm run build:production` - Build for production environment

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

### Testing
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage report

### Docker
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── auth/          # Authentication components
│   │   ├── common/        # Common/shared components
│   │   ├── connections/   # Connection management components
│   │   ├── dashboard/     # Dashboard components
│   │   └── policies/      # Policy management components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom React hooks
│   ├── layouts/           # Page layouts
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── styles/            # Global styles
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── test/              # Test setup and utilities
├── Dockerfile             # Production Docker image
├── Dockerfile.dev         # Development Docker image
├── docker-compose.yml     # Docker Compose configuration
├── nginx.conf             # Nginx configuration
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── vitest.config.ts       # Vitest configuration
```

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8001/api/v1

# Application Configuration
VITE_APP_NAME=LiteLLM Connection Manager
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=development

# Feature Flags
VITE_ENABLE_PWA=true
VITE_ENABLE_SENTRY=false
VITE_ENABLE_ANALYTICS=false

# Development Configuration
VITE_MOCK_API=false
VITE_DEBUG_MODE=true
```

## API Integration

The frontend integrates with the FastAPI backend through:

- **Authentication**: JWT token-based auth with automatic refresh
- **Connection Management**: Full CRUD operations for LLM connections
- **Policy Management**: Access policy creation and assignment
- **Health Monitoring**: System health checks and monitoring

### API Client

The API client (`src/services/api.ts`) provides:
- Automatic token refresh
- Request/response interceptors
- Error handling
- Type-safe API calls

## Authentication Flow

1. User logs in with email/password
2. Backend returns JWT access token + refresh token
3. Access token stored in localStorage
4. API client automatically includes token in requests
5. Token refreshed automatically when expired
6. User redirected to login if refresh fails

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint + Prettier configuration
- Use functional components with hooks
- Implement proper error boundaries
- Write meaningful commit messages

### Component Structure
- Keep components small and focused
- Use composition over inheritance
- Implement proper prop types
- Use custom hooks for logic reuse
- Write unit tests for complex components

### State Management
- Use React Query for server state
- Use Zustand for client state
- Keep state close to where it's used
- Avoid prop drilling with context

## Testing

### Unit Tests
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure
- `src/components/**/*.test.tsx` - Component tests
- `src/services/**/*.test.ts` - Service tests
- `src/utils/**/*.test.ts` - Utility tests

## Deployment

### Production Build
```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

### Docker Deployment
```bash
# Build production image
docker build -t litellm-frontend .

# Run production container
docker run -p 3000:80 litellm-frontend
```

### Environment-Specific Builds
```bash
# Staging
npm run build:staging

# Production
npm run build:production
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Add tests for new functionality
4. Run quality checks: `npm run lint && npm run type-check && npm run test`
5. Create a pull request

## Troubleshooting

### Common Issues

**Build failures**:
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check Node.js version: `node --version` (should be 18+)

**API connection issues**:
- Verify backend is running on port 8001
- Check CORS configuration in backend
- Verify API base URL in environment variables

**Docker issues**:
- Ensure Docker daemon is running
- Check port conflicts: `lsof -i :3000`
- Clear Docker cache: `docker system prune`

## License

This project is part of the LiteLLM ecosystem. See the main project license for details.