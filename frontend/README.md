# PLC Monitor Frontend

A modern Angular application for monitoring and managing Programmable Logic Controllers (PLCs).

## Features

### 📊 Dashboard
- Real-time overview of all PLCs in the system
- Statistics cards showing:
  - Total number of PLCs
  - Online PLCs count
  - Offline PLCs count
  - PLCs with errors
- Recent PLCs list with quick access to details
- Color-coded status indicators

### 📋 PLC List
- Comprehensive table view of all PLCs
- Search functionality (by name, IP address, or location)
- Filter by status (Online, Offline, Error)
- Sortable columns
- Direct navigation to PLC details
- Responsive design for mobile and desktop

### 🔍 PLC Detail View
- Detailed information for each PLC:
  - IP Address and Port
  - Model and Location
  - Status with visual indicators
  - Last seen timestamp
- Real-time tag monitoring:
  - Tag name, address, and data type
  - Current value with unit
  - Quality indicator
  - Timestamp
- Breadcrumb navigation

## Technology Stack

- **Framework**: Angular 18+ (Standalone components)
- **Styling**: SCSS with custom design system
- **Routing**: Angular Router with lazy loading support
- **State Management**: RxJS Observables
- **Build Tool**: Angular CLI with esbuild

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── dashboard/       # Dashboard view
│   │   │   ├── navbar/          # Navigation bar
│   │   │   ├── plc-list/        # PLC list with filters
│   │   │   └── plc-detail/      # Detailed PLC view
│   │   ├── models/
│   │   │   └── plc.model.ts     # TypeScript interfaces
│   │   ├── services/
│   │   │   └── plc.service.ts   # PLC data service
│   │   ├── app.config.ts        # App configuration
│   │   ├── app.routes.ts        # Routing configuration
│   │   └── app.ts               # Root component
│   ├── styles.scss              # Global styles
│   └── index.html
├── angular.json
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Angular CLI (`npm install -g @angular/cli`)

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd plc-monitor/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server

Run the development server:
```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any source files.

### Build

Build the project for production:
```bash
npm run build
# or
ng build
```

The build artifacts will be stored in the `dist/` directory.

## API Integration

Currently, the application uses mock data in `PlcService`. To integrate with a real backend:

1. Update `PlcService` in `src/app/services/plc.service.ts`
2. Replace mock data methods with HTTP calls to your API
3. Import `HttpClient` from `@angular/common/http`
4. Add `provideHttpClient()` to `app.config.ts` providers

Example:
```typescript
import { HttpClient } from '@angular/common/http';

getAllPLCs(): Observable<PLC[]> {
  return this.http.get<PLC[]>('http://your-api-url/plcs');
}
```

## Data Models

### PLC Interface
```typescript
interface PLC {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  status: PLCStatus;
  lastSeen?: Date;
  model?: string;
  location?: string;
  tags?: PLCTag[];
}
```

### PLCTag Interface
```typescript
interface PLCTag {
  id: string;
  name: string;
  address: string;
  dataType: string;
  value: any;
  quality: string;
  timestamp: Date;
  unit?: string;
}
```

## Routing

- `/` → Redirects to dashboard
- `/dashboard` → Dashboard view
- `/plcs` → PLC list view
- `/plcs/:id` → PLC detail view

## Styling

The application uses a custom SCSS design system with:
- Modern, clean interface
- Responsive design (mobile-first)
- Color-coded status indicators
- Smooth transitions and hover effects
- Accessible design patterns

## Future Enhancements

- [ ] Real-time data updates via WebSocket
- [ ] Historical data charts and trends
- [ ] Alarm and notification system
- [ ] User authentication and authorization
- [ ] Export functionality (PDF, CSV)
- [ ] Dark mode support
- [ ] Multi-language support
- [ ] PLC configuration management
- [ ] Advanced filtering and sorting

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Your License Here]

## Contact

[Your Contact Information]
