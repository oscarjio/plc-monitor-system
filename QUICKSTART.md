# PLC Monitor - Quick Start Guide

Get up and running with the PLC Monitor frontend in 5 minutes! 🚀

## Prerequisites

Make sure you have these installed:
- **Node.js** 18+ ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** (for cloning)

## Installation

### 1. Clone the Repository
```bash
git clone github.com:oscarjio/plc-monitor-system.git
cd plc-monitor-system
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

This will install all required packages (~340 packages, may take 1-2 minutes).

## Running the Application

### Start Development Server
```bash
npm start
```

or

```bash
ng serve
```

The application will start on **http://localhost:4200**

You should see:
```
✔ Browser application bundle generation complete.
Initial chunk files | Names         |  Raw size
...
Application bundle generation complete. [X.XXX seconds]

** Angular Live Development Server is listening on localhost:4200 **
```

### Open in Browser
Navigate to: **http://localhost:4200**

The application should load and show:
- Navigation bar at the top
- Dashboard with PLC statistics
- Sample data with 4 PLCs

## Navigation

Once running, you can explore:

### 📊 Dashboard (`/dashboard`)
- View total PLC count
- See online/offline/error statistics
- Browse recent PLCs
- Click "View Details" on any PLC card

### 📋 PLC List (`/plcs`)
- See all PLCs in a table
- Search by name, IP, or location
- Filter by status (All, Online, Offline, Error)
- Click "View" to see details

### 🔍 PLC Detail (`/plcs/:id`)
- View detailed information about a specific PLC
- See all tags with real-time values
- Check connection status
- View last seen timestamp

## Sample Data

The app comes with 4 mock PLCs:

| Name    | Status  | IP Address      | Location           |
|---------|---------|-----------------|-------------------|
| PLC-001 | Online  | 192.168.1.100   | Production Line 1 |
| PLC-002 | Online  | 192.168.1.101   | Production Line 2 |
| PLC-003 | Offline | 192.168.1.102   | Warehouse         |
| PLC-004 | Error   | 192.168.1.103   | Quality Control   |

## Building for Production

```bash
npm run build
```

Build output will be in `dist/frontend/` directory.

To serve the production build:
```bash
# Install a simple HTTP server
npm install -g http-server

# Serve the dist folder
cd dist/frontend
http-server -p 8080
```

Then open: **http://localhost:8080**

## Project Structure

```
plc-monitor/
├── frontend/                    # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/      # UI components
│   │   │   ├── models/          # TypeScript interfaces
│   │   │   ├── services/        # Data services
│   │   │   └── app.routes.ts    # Routing config
│   │   ├── styles.scss          # Global styles
│   │   └── index.html           # Entry point
│   ├── angular.json             # Angular config
│   └── package.json             # Dependencies
├── backend/                     # Backend (TBD)
├── database/                    # Database scripts (TBD)
└── README.md                    # Project docs
```

## Common Issues & Solutions

### Port 4200 already in use
```bash
# Use a different port
ng serve --port 4300
```

### npm install fails
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### TypeScript errors
```bash
# Make sure you're using Node.js 18+
node --version

# Update npm
npm install -g npm@latest
```

## Development Tips

### Hot Reload
The dev server supports hot reload - any changes you make to the code will automatically refresh the browser!

### Browser DevTools
- Open DevTools: `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Opt+I` (Mac)
- Check Console for errors
- Use Network tab to see API calls

### VS Code Extensions (Recommended)
- Angular Language Service
- Angular Snippets
- ESLint
- Prettier
- SCSS IntelliSense

## Next Steps

1. **Explore the Code**
   - Check out `src/app/components/` for UI components
   - Look at `src/app/services/plc.service.ts` for data logic
   - Review `src/app/models/plc.model.ts` for data structures

2. **Make Changes**
   - Try modifying colors in SCSS files
   - Add new fields to the PLC model
   - Create new components

3. **Connect Real Data**
   - Replace mock data in `PlcService`
   - Implement HTTP calls to a backend API
   - Add WebSocket for real-time updates

## Getting Help

- Check the [README.md](./frontend/README.md) for detailed documentation
- Review [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) for roadmap
- Check Angular docs: https://angular.io/docs

## What's Next?

This frontend is complete with mock data. The next phase is:
- ✅ Phase 1: Frontend (Complete)
- ⏳ Phase 2: Backend API (Next)
- 📋 Phase 3: Real-time Features
- 🚀 Phase 4: Advanced Features
- 💯 Phase 5: Optimization

---

**Happy Coding! 🎉**

If you have any questions or run into issues, feel free to open an issue on GitHub!
