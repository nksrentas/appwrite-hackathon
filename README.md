# EcoTrace - Developer Carbon Footprint Tracker

Real-time carbon footprint tracking for developers with scientific transparency and actionable insights.

## 🌍 Overview

EcoTrace provides developers with immediate visibility into their carbon footprint through live tracking of development activities. The platform emphasizes data transparency, scientific credibility, and actionable insights while maintaining the smooth, responsive experience developers expect.

## 🏗️ Project Structure

```
ecotrace/
├── backend/                 # Backend services and API
│   ├── functions/          # Appwrite serverless functions
│   ├── src/               # Core backend services
│   └── README.md          # Backend documentation
├── frontend/               # Remix web application (coming soon)
│   ├── app/               # Remix routes and components
│   └── public/            # Static assets
├── documentation/          # Project documentation
│   ├── architecture.md    # Technical architecture
│   └── design/            # Design specifications
└── package.json           # Workspace configuration
```

## 🚀 Features

- **Real-time Carbon Tracking**: Live updates as you code, commit, and deploy
- **GitHub Integration**: Automatic tracking via webhooks
- **Scientific Transparency**: Full methodology documentation and calculation audit trails
- **Multi-source Data**: Integration with EPA eGRID, AWS Carbon API, and Electricity Maps
- **Leaderboards**: Community rankings for carbon efficiency
- **Developer-first Design**: Built for developers, by developers

## 🛠️ Tech Stack

### Backend
- **Appwrite Cloud**: Database, Auth, Realtime, Functions, Storage
- **TypeScript**: Type-safe backend development
- **Node.js**: Runtime environment
- **Redis**: Caching layer

### Frontend (Coming Soon)
- **Remix**: Full-stack React framework
- **Tailwind CSS v4**: Utility-first styling
- **shadcn/ui**: Component library
- **Zustand**: State management

### External Integrations
- **GitHub API**: Repository and activity tracking
- **EPA eGRID**: US grid emission factors
- **AWS Carbon API**: Regional carbon data
- **Electricity Maps**: Real-time grid intensity

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- Appwrite Cloud account
- GitHub OAuth App credentials
- API keys for carbon data sources (optional, with fallbacks)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ecotrace/ecotrace.git
   cd ecotrace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

4. **Deploy backend to Appwrite**
   ```bash
   npm run deploy:backend
   ```

## 💻 Development

### Run backend in development mode
```bash
npm run dev:backend
```

### Run frontend in development mode (when available)
```bash
npm run dev:frontend
```

### Run all services
```bash
npm run dev
```

## 🧪 Testing

```bash
npm test
```

## 📦 Deployment

### Deploy backend
```bash
npm run deploy:backend
```

### Build for production
```bash
npm run build
```

## 📊 Performance Targets

- **Concurrent Users**: 10,000+
- **Webhook Events**: 100,000/day
- **Real-time Latency**: <500ms
- **Dashboard Load**: <2 seconds

## 🔒 Security

- OAuth 2.0 authentication
- Webhook signature verification
- Encrypted data at rest
- Environment-based configuration
- Rate limiting and circuit breakers

## 📖 Documentation

- [Backend Documentation](./backend/README.md)
- [Architecture Overview](./documentation/architecture.md)
- [Design Specifications](./documentation/design/)
- [API Documentation](./backend/docs/api.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Appwrite team for the excellent backend platform
- Remix team for the modern web framework
- Carbon data providers (EPA, AWS, Electricity Maps)
- The developer community for feedback and support

---

Built with 💚 for a sustainable future