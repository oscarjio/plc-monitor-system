# PLC Monitoring System

Ett modernt, webbaserat SCADA-system för monitorering av industriella PLC-enheter med realtidsdatainsamling, larmhantering och omfattande visualisering.

## Projektstatus

✅ **Frontend:** Komplett - Angular 21 med Material Design  
✅ **Backend:** Komplett - Node.js/Express med REST API  
✅ **Databas:** Komplett - PostgreSQL med Prisma ORM  
✅ **Datainsamling:** Aktiv - Realtidspolling av PLCs  
✅ **Schemaläggare:** Aktiv - Cron-baserad automation  

## Snabbstart

### Frontend (Angular)
```bash
cd frontend
npm install
npm start
# Öppna http://localhost:4200
```

### Backend (Node.js)
```bash
cd backend
npm install
npm run start:scheduler
# API körs på http://localhost:3001
```

## Projektstruktur

- `/frontend` - Angular 21-applikation med Material Design ✅
- `/backend` - Node.js/Express REST API med datainsamling ✅
- `/database` - PostgreSQL-schema och migrationer ✅
- `/docs` - Dokumentation
- `/ai` - AI-baserad felsökning (planerat)

## Funktioner

### Frontend
- 📊 Realtids-dashboard med statistik
- 🏭 PLC-hantering (lista, skapa, redigera, ta bort)
- 🏷️ Tag-konfiguration och övervakning
- 🚨 Larmhantering med ABC-klassificering
- 📈 Tidsseriedatavisualisering (Chart.js)
- 🎨 Modernt Material Design-gränssnitt

### Backend
- 🔌 Multi-protokollstöd (SLMP/Mitsubishi, Modbus TCP)
- 📡 Realtids-datainsamlingstjänst
- ⏰ Cron-baserad schemaläggare (var 30:e minut)
- 🗄️ PostgreSQL-databas med Prisma ORM
- 🔄 WebSocket-stöd för live-uppdateringar
- 📋 REST API med CRUD-operationer
- 🚨 Intelligent larmsystem

## Arkitektur

Systemet är uppdelat i huvudkomponenter:

### Backend/Kommunikation
- Hämtar data från PLCs via SLMP och Modbus TCP
- Node.js/Express REST API
- Real-time datainsamling med konfigurerbara pollningsintervall
- WebSocket för live-uppdateringar

### Databas
- PostgreSQL med TimescaleDB-stöd för tidsseriedata
- Prisma ORM för typsäker databasaccess
- Lagrar: Enheter, Tags, Larm, Tidsseriedata, Konfiguration

### Frontend/SCADA-UI
- Angular 21 med Material Design
- Dashboard med statistik och larmöversikt
- PLC-hantering med detaljvyer
- Tag-konfiguration
- Larmhantering med ABC-klassificering

### AI/Felsökning (Planerat)
- Analyserar insamlad data för avvikelser
- Förutser problem
- Assisterar vid felsökning

## Dokumentation

- **[FULL_STACK_GUIDE.md](./FULL_STACK_GUIDE.md)** - ⭐ Komplett guide för hela stacken (ENG)
- **[BACKEND_STATUS_REPORT.md](./BACKEND_STATUS_REPORT.md)** - Komplett backend-dokumentation (ENG)
- **[MASTER_STATUS_REPORT.md](./MASTER_STATUS_REPORT.md)** - Övergripande projektstatus (ENG)
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Implementationsdetaljer (ENG)
- **[backend/README.md](./backend/README.md)** - Backend API-referens (ENG)
- **[backend/QUICK_START.md](./backend/QUICK_START.md)** - Backend snabbstart (ENG)
- **[DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md)** - Utvecklingsstatus och nästa steg (ENG)

## Teknisk Stack

| Komponent | Teknologi |
|-----------|-----------|
| Frontend | Angular 21, Material Design, Chart.js |
| Backend | Node.js, Express.js, WebSocket |
| Databas | PostgreSQL, Prisma ORM |
| PLC-protokoll | SLMP (Mitsubishi), Modbus TCP |
| Schemaläggning | node-cron |
| Containerisering | Docker |

## API Endpoints

### Bas-URL
```
http://localhost:3001/api
```

### Huvudendpoints
```bash
# PLCs
GET    /api/plcs              # Lista alla PLCs
POST   /api/plcs              # Skapa ny PLC
GET    /api/plcs/:id          # Hämta PLC-detaljer
PUT    /api/plcs/:id          # Uppdatera PLC
DELETE /api/plcs/:id          # Ta bort PLC

# Tags
GET    /api/tags              # Hämta alla tags
POST   /api/tags              # Skapa ny tag
PUT    /api/tags/:id          # Uppdatera tag
DELETE /api/tags/:id          # Ta bort tag

# Larm
GET    /api/alarms            # Hämta alla larm
GET    /api/alarms/active     # Hämta aktiva larm
POST   /api/alarms/:id/acknowledge  # Kvittera larm

# System
GET    /health                # Hälsokontroll
GET    /api/stats             # Systemstatistik
GET    /api/scheduler/status  # Schemaläggningsstatus
```

## Utveckling

### Krav
- Node.js 18+
- PostgreSQL 14+
- npm 10+

### Installation
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### Databas
```bash
# Anslut till PostgreSQL
psql -U plc_app -d plc_monitor

# Verifiera tabeller
\dt
```

### Testa Backend
```bash
# Starta backend
cd backend
npm run start:scheduler

# Testa endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/plcs
curl http://localhost:3001/api/stats
```

### Testa Frontend
```bash
# Starta frontend
cd frontend
npm start

# Öppna i webbläsare
http://localhost:4200
```

## Felsökning

### Backend visar PLC-anslutningsfel
Detta är normalt under utveckling - det finns inga fysiska PLCs anslutna.
API:et fungerar perfekt ändå!

### Port redan använd
```bash
# Hitta process som använder porten
lsof -i :3001  # Backend
lsof -i :4200  # Frontend

# Döda processen
kill -9 <PID>
```

### Databasanslutningsfel
```bash
# Kontrollera att PostgreSQL kör
systemctl status postgresql

# Verifiera databas
psql -U plc_app -d plc_monitor -c "SELECT 1"
```

## Nästa Steg

### Färdiga Funktioner ✅
- [x] Frontend med Dashboard, PLC-lista, Detaljvyer
- [x] Backend med REST API
- [x] Databas med PostgreSQL/Prisma
- [x] CRUD-operationer för PLCs, Tags, Larm
- [x] Datainsamlingstjänst
- [x] Cron-schemaläggare
- [x] WebSocket-stöd

### Framtida Förbättringar 🔄
- [ ] Aktivera autentisering för produktion
- [ ] Anslut riktiga PLCs för testning
- [ ] Konfigurera monitoring/alerting
- [ ] Implementera rapportgenerering
- [ ] AI-baserad felsökning
- [ ] TimescaleDB-optimering
- [ ] Automatiska backups

## Licens

MIT

## Support

- Se `/docs` för detaljerad dokumentation
- GitHub Issues för buggrapporter
- Se `BACKEND_STATUS_REPORT.md` för komplett teknisk status

---

**Version:** 1.0.0  
**Senast uppdaterad:** 2026-02-08  
**Underhålls av:** PLC SCADA System Team
