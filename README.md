# AI-Powered IoT Dashboard Platform

A comprehensive IoT monitoring and management platform powered by artificial intelligence. Built with Next.js 14, React 18, TypeScript, and Tailwind CSS.

## Features

### Core Features
- **Real-time Device Monitoring** - Track IoT devices with live status updates
- **Interactive Dashboards** - Customizable widgets with drag-and-drop support
- **Alert Management** - Multi-severity alerts with acknowledge/resolve workflows
- **Data Ingestion** - High-throughput sensor data processing with deduplication

### AI-Powered Features
- **Predictive Analytics** - Forecast device metrics using ML models
- **Anomaly Detection** - Identify unusual patterns with statistical analysis
- **AI Insights** - Automated correlation detection and trend analysis
- **Smart Recommendations** - AI-driven optimization suggestions

### Technical Features
- **Multi-provider AI** - Support for OpenAI, Anthropic, and Gemini
- **Rule Engine** - Flexible condition-based automation
- **Data Aggregation** - Time-series data processing and visualization
- **Role-based Access Control** - Granular permissions system

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **UI Components**: Radix UI, Recharts, Lucide Icons
- **State Management**: Zustand
- **Validation**: Zod
- **Testing**: Jest, React Testing Library
- **Database**: PostgreSQL (via Prisma)
- **Cache**: Redis
- **Message Queue**: MQTT
- **AI**: OpenAI, Anthropic, Gemini APIs

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- MQTT Broker (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/ai-iot-dashboard.git
cd ai-iot-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`

5. Start development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### Docker Setup

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- __tests__/devices/device-service.test.ts

# Run in watch mode
npm test -- --watch
```

## Project Structure

```
ai-iot-dashboard/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   └── page.tsx      # Main page
│   ├── components/       # React components
│   │   ├── dashboard/    # Dashboard widgets
│   │   ├── devices/      # Device cards
│   │   ├── alerts/       # Alert components
│   │   └── analytics/    # AI insights
│   ├── lib/              # Utilities
│   │   ├── validators.ts # Input validation
│   │   ├── permissions.ts# RBAC system
│   │   └── monitoring.ts # Observability
│   └── services/         # Business logic
│       ├── device-service.ts
│       ├── alert-service.ts
│       ├── dashboard-service.ts
│       └── ai/           # AI services
├── __tests__/            # Test suites
│   ├── unit/             # Unit tests
│   ├── component/        # Component tests
│   └── integration/      # API tests
├── .github/workflows/    # CI/CD pipelines
├── docker/               # Docker configs
└── docs/                 # Documentation
```

## API Endpoints

### Devices
- `GET /api/devices` - List devices
- `POST /api/devices` - Create device
- `PUT /api/devices?id=` - Update device
- `DELETE /api/devices?id=` - Delete device

### Dashboards
- `GET /api/dashboards` - List dashboards
- `POST /api/dashboards` - Create dashboard
- `PUT /api/dashboards?id=` - Update dashboard
- `DELETE /api/dashboards?id=` - Delete dashboard

### Alerts
- `GET /api/alerts` - List alerts
- `POST /api/alerts` - Create alert
- `PATCH /api/alerts?id=&action=acknowledge` - Acknowledge alert
- `PATCH /api/alerts?id=&action=resolve` - Resolve alert

### Health
- `GET /api/health` - Health check

## Configuration

### AI Providers

Configure your preferred AI provider in `.env`:

```env
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
GEMINI_API_KEY=your_key
```

### Device Protocols

Support for multiple IoT protocols:
- MQTT
- HTTP/HTTPS
- WebSocket
- CoAP

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.
