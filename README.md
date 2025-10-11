# Liteyfy - Real-Time Notification System

A Progressive Web App (PWA) that delivers real-time notifications for train delays, weather alerts, and public transport disruptions in Belgium.

## 📖 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Docker Setup](#-docker-setup)
- [Project Structure](#-project-structure)
- [Modern Angular Architecture](#-modern-angular-architecture)
- [Internationalization](#-internationalization)
- [Code Quality & Best Practices](#-code-quality--best-practices)
- [API Integration](#-api-integration)
- [PWA Features](#-pwa-features)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

## 🚀 Features

### Core Features
- **🔔 Push Notifications**: Real-time browser push notifications
- **📱 Progressive Web App**: Install on mobile and desktop
- **🔌 Offline Support**: Works without internet connection
- **💾 Local Storage**: IndexedDB for offline data persistence
- **🎨 Material Design**: Modern, responsive UI with Angular Material
- **⚡ Real-Time Updates**: Live status dashboard
- **🌍 Multi-Language**: English, French, and Dutch translations

### Notification Types
- **🚆 SNCB Train Delays & Cancellations**
- **🌦️ Weather Alerts** (KMI/IRM)
- **🚇 STIB/MIVB Disruptions** (Metro, Tram, Bus)
- **📍 Station-Specific Updates**
- **🔄 Platform Changes**

### Subscription Management
- Subscribe to specific train lines
- Select preferred stations
- Choose weather alert regions
- Configure notification preferences
- Set quiet hours
- Filter by severity/priority

## 🛠️ Technology Stack

- **Frontend Framework**: Angular 20 (latest)
- **UI Components**: Angular Material Design
- **State Management**: RxJS with Signals
- **Offline Storage**: Dexie.js (IndexedDB wrapper)
- **Service Worker**: @angular/service-worker
- **Push API**: Web Push Notifications
- **HTTP Client**: Angular HttpClient
- **Internationalization**: ngx-translate (EN, FR, NL)
- **Code Quality**: ESLint + Prettier + Husky
- **Git Hooks**: Husky + lint-staged
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (production)
- **TypeScript**: 5.8+

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (recommended)
- OR Node.js 18+ and npm

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd Liteyfy

# Development with hot reload
docker-compose up

# Access the app at http://localhost:4200

# Production build
docker-compose -f docker-compose.prod.yml up

# Access production build at http://localhost
```

### Option 2: Local Installation

```bash
# Install dependencies
npm install

# Run development server
npm start

# Build for production
npm run build:prod
```

## 🐳 Docker Setup

### Development Environment

The development setup includes:
- **Hot Reload**: Live reload on code changes
- **Volume Mounting**: Your local code is mounted in the container
- **Port**: 4200

```bash
docker-compose up
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  frontend-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: liteyfy-dev
    ports:
      - "4200:4200"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

### Production Environment

The production setup includes:
- **Multi-stage Build**: Optimized Docker image
- **Nginx**: Serves the static files
- **Port**: 80

```bash
docker-compose -f docker-compose.prod.yml up
```

### Docker Commands

```bash
# Build images
npm run docker:build

# Run development container
npm run docker:dev

# Run production container
npm run docker:prod

# Stop containers
docker-compose down

# View logs
docker-compose logs -f frontend-dev
```

## 📁 Project Structure

```
src/
├── app/
│   ├── core/                    # Core services and models
│   │   ├── models/             # TypeScript interfaces
│   │   │   ├── notification.model.ts
│   │   │   ├── subscription.model.ts
│   │   │   ├── train.model.ts
│   │   │   ├── weather.model.ts
│   │   │   └── stib.model.ts
│   │   └── services/           # Core services
│   │       ├── push-notification.service.ts
│   │       ├── offline-storage.service.ts
│   │       ├── subscription-manager.service.ts
│   │       ├── network-status.service.ts
│   │       ├── notification-history.service.ts
│   │       └── translation.service.ts
│   │
│   ├── features/               # Feature modules
│   │   ├── dashboard/         # Main dashboard
│   │   ├── notifications/     # Notification history
│   │   ├── subscriptions/     # Subscription management
│   │   │   ├── train-subscriptions/
│   │   │   ├── weather-subscriptions/
│   │   │   ├── stib-subscriptions/
│   │   │   └── subscription-settings/
│   │   └── live-status/       # Live status dashboard
│   │
│   ├── shared/                # Shared components
│   │   └── components/
│   │       └── language-selector/
│   │
│   ├── app.component.ts       # Root component
│   ├── app.config.ts          # App configuration
│   └── app.routes.ts          # Routing configuration
│
├── environments/              # Environment configs
├── assets/                   # Static assets
│   ├── icons/               # PWA icons
│   └── i18n/               # Translation files (en, fr, nl)
├── manifest.webmanifest     # PWA manifest
├── ngsw-config.json        # Service Worker config
└── styles.scss             # Global styles with Material theming
```

## 🏗️ Modern Angular Architecture

This project follows Angular best practices and modern patterns:

### 1. Standalone Components
All components use the standalone API (no NgModules):

```typescript
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, ...],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### 2. Dependency Injection with `inject()`
Using functional dependency injection instead of constructor injection:

```typescript
export class DashboardComponent {
  private readonly pushService = inject(PushNotificationService);
  private readonly subscriptionManager = inject(SubscriptionManagerService);
  private readonly destroyRef = inject(DestroyRef);
}
```

### 3. Signals for Reactive State
Using Angular Signals for fine-grained reactivity:

```typescript
isPushEnabled = signal(false);
preferences = signal<NotificationPreferences | null>(null);

// In template: {{ isPushEnabled() }}
```

### 4. Automatic Subscription Cleanup
Using `takeUntilDestroyed()` for automatic unsubscription:

```typescript
this.pushService.subscription$
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(subscription => {
    this.isPushEnabled.set(subscription !== null);
  });
```

### 5. OnPush Change Detection
All components use OnPush for better performance:

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### 6. Lazy Loading Routes
Routes are lazy-loaded for optimal bundle size:

```typescript
{
  path: 'dashboard',
  loadComponent: () => import('./features/dashboard/dashboard.component')
    .then(m => m.DashboardComponent)
}
```

## 🌍 Internationalization

The app supports three languages with automatic language detection:
- **English** (en) - Default
- **French** (fr) - Français (Belgian French)
- **Dutch** (nl) - Nederlands (Flemish)

### How It Works

1. **Automatic Language Detection**: Detects browser language on first load
2. **Language Persistence**: Stores selected language in localStorage
3. **Language Selector**: UI component (EN/FR/NL codes) in the toolbar
4. **ngx-translate**: Uses `@ngx-translate/core` for translations

### Translation Files

Located in `src/assets/i18n/`:
- `en.json` - English translations
- `fr.json` - French translations
- `nl.json` - Dutch translations

### Usage in Templates

```html
<!-- Simple translation -->
<h1>{{ 'DASHBOARD.TITLE' | translate }}</h1>

<!-- Translation with parameters -->
<p>{{ 'NOTIFICATIONS.UNREAD' | translate: {count: 5} }}</p>
```

### Usage in Components

```typescript
// Inject TranslateService
private translate = inject(TranslateService);

// Get translation
this.translate.get('COMMON.ERROR').subscribe(text => {
  console.log(text);
});

// Instant translation
const text = this.translate.instant('COMMON.SUCCESS');
```

### Adding New Translations

1. Add keys to all three JSON files (`en.json`, `fr.json`, `nl.json`)
2. Use the translation key in your template or component
3. Translation files are cached by Service Worker for offline support

## 🧪 Code Quality & Best Practices

### Linting & Formatting

```bash
# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

### ESLint Configuration

The project uses `@angular-eslint` with strict rules:
- TypeScript strict mode
- Angular best practices
- No unused variables
- Consistent code style

### Prettier Configuration

Automatic code formatting with Prettier:
- 2 spaces indentation
- Single quotes
- Trailing commas
- 100 character line width

### Git Hooks with Husky

Automated quality checks on every commit:

- **pre-commit**: Lints and formats staged files using `lint-staged`
- **pre-push**: Runs full project lint
- **commit-msg**: Validates commit message format (Conventional Commits)

**Commit Message Format**:
```bash
type(scope): message

# Types: feat, fix, docs, style, refactor, test, chore
# Examples:
feat(dashboard): add real-time updates
fix(notifications): resolve push notification bug
docs(readme): update installation instructions
```

### TypeScript Configuration

Strict TypeScript settings for type safety:
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

## 📊 API Integration

### Data Sources

#### 1. Weather Data
- **Source**: Royal Meteorological Institute of Belgium (KMI/IRM)
- **Endpoint**: `https://api.meteo.be`
- **Data**: Weather alerts, forecasts, current conditions

#### 2. Train Data
- **Source**: iRail API
- **Endpoint**: `https://api.irail.be`
- **Data**: Train delays, cancellations, live departures/arrivals

#### 3. STIB Data
- **Source**: STIB-MIVB Open Data
- **Endpoint**: `https://data.stib-mivb.be`
- **Data**: Metro/tram/bus disruptions, real-time positions

### Environment Configuration

Update `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY',
  weatherApiUrl: 'https://api.meteo.be',
  trainApiUrl: 'https://api.irail.be',
  stibApiUrl: 'https://data.stib-mivb.be'
};
```

## 💾 Offline Storage Strategy

### IndexedDB Tables (Dexie.js)

- **notifications**: Notification history
- **trainDelays**: Cached train delay data
- **stations**: Station information
- **weatherAlerts**: Active weather alerts
- **weatherRegions**: Available regions
- **stibDisruptions**: STIB line disruptions
- **stibLines**: STIB line information
- **cachedData**: Generic API response cache

### Caching Strategy

- **App Shell**: Prefetch and cache on install
- **API Responses**: Cache-first with network fallback
- **Static Assets**: Lazy load and cache
- **TTL**: Configurable expiration per data type
- **Translation Files**: Cached by Service Worker

## 📱 PWA Features

### Installability
- Add to Home Screen on mobile devices
- Install as desktop application
- Custom splash screen
- Theme color customization

### Offline Functionality
- View cached notifications
- Browse subscription settings
- Access recent data
- Automatic sync when connection restored

### Service Worker Features
- Background notification updates
- Push notification handling
- Automatic cache updates
- Network-first/Cache-first strategies

### Push Notification Setup

1. User subscribes via browser Push API
2. Backend stores subscription with preferences
3. Event ingestion service fetches data from APIs
4. Notification service matches events with subscriptions
5. Push server sends notifications
6. Service Worker receives and displays notifications

## 🚀 Deployment

### Build for Production

```bash
# Create production build
npm run build:prod

# Output directory: dist/liteyfy/
```

### Deployment Options

#### 1. Docker Deployment
```bash
# Build production image
docker build -f Dockerfile -t liteyfy:prod .

# Run production container
docker run -p 80:80 liteyfy:prod
```

#### 2. Static Hosting (Netlify, Vercel, Firebase)
```bash
# Build the app
npm run build:prod

# Deploy the dist/liteyfy folder
```

### Important Notes

- ⚠️ **HTTPS Required**: Push notifications only work over HTTPS
- ⚠️ **Service Worker**: Only activates on HTTPS (except localhost)
- ⚠️ **CORS Configuration**: Configure API endpoints properly
- ⚠️ **VAPID Keys**: Keep VAPID keys secret and secure
- ⚠️ **CSP Headers**: Implement Content Security Policy

### Nginx Configuration

For production deployment with Nginx:

```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Angular routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔐 Security

- Store VAPID keys securely (environment variables)
- Use HTTPS for all API calls
- Implement rate limiting on backend
- Validate push subscription endpoints
- Sanitize user input
- Implement CSP headers
- Regular dependency updates

## 📈 Performance

- **OnPush Change Detection**: Optimizes rendering
- **Lazy Loading**: Routes loaded on demand
- **Bundle Optimization**: Tree-shaking and code splitting
- **Virtual Scrolling**: For long lists
- **Service Worker Caching**: Instant repeat visits
- **Preloading Strategies**: Prefetch critical routes

## 🤝 Contributing

### Development Workflow

1. Create a feature branch
2. Make your changes
3. Run linting and formatting
4. Commit with conventional commit messages
5. Push and create a pull request

### Coding Standards

- Follow Angular style guide
- Use TypeScript strict mode
- Write meaningful commit messages
- Add comments for complex logic
- Keep components small and focused
- Use OnPush change detection
- Implement proper error handling

## 📝 Project Phases

This is **Step 1: Frontend Skeleton** ✅

### Completed
- ✅ Angular 20 setup with standalone components
- ✅ Material Design UI
- ✅ PWA with Service Worker
- ✅ Push notifications (client-side)
- ✅ Offline storage with IndexedDB
- ✅ Multi-language support (EN, FR, NL)
- ✅ Docker setup (dev + prod)
- ✅ Code quality tools (ESLint, Prettier, Husky)
- ✅ Modern Angular patterns (inject, signals, OnPush)

### Next Steps
- Step 2: Backend API Architecture
- Step 3: Event Ingestion Service
- Step 4: Notification Processing Engine
- Step 5: Infrastructure & Deployment

## 📄 License

MIT License

## 👥 Authors

Built with modern Angular best practices and enterprise-grade architecture.

---

**Note**: This is the frontend application. Backend services for event ingestion, user management, and push notification delivery need to be implemented separately.

For questions or issues, please open a GitHub issue.
