# Contributing to AI-Powered IoT Dashboard

Thank you for your interest in contributing! This document provides guidelines and information about contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)

## Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. Please be respectful and constructive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/ai-iot-dashboard.git
   cd ai-iot-dashboard
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/original-org/ai-iot-dashboard.git
   ```

## Development Setup

### Prerequisites

- Node.js 20+
- npm or yarn
- PostgreSQL 16+
- Redis 7+

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript compiler
- `npm test` - Run tests
- `npm test -- --coverage` - Run tests with coverage

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-new-widget`
- `fix/alert-acknowledge-bug`
- `docs/update-api-documentation`
- `refactor/improve-ai-service`

### Commit Messages

Follow conventional commits:
```
feat: add new dashboard widget
fix: resolve alert acknowledgment issue
docs: update API documentation
refactor: improve AI service architecture
test: add unit tests for device service
chore: update dependencies
```

### Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

## Testing

### Writing Tests

- Write tests for new features
- Maintain test coverage above 60%
- Use descriptive test names
- Test both success and error cases

```typescript
describe('FeatureName', () => {
  it('should handle expected behavior', () => {
    // Arrange
    const input = createTestData();
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- __tests__/path/to/test.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Write or update tests
4. Ensure all tests pass
5. Update documentation if needed
6. Submit a pull request

### PR Description

Include:
- Summary of changes
- Motivation/context
- Testing performed
- Screenshots (if applicable)
- Related issues

### Review Process

- All PRs require at least one review
- Address review feedback promptly
- Keep PRs focused and small when possible

## Style Guidelines

### TypeScript

```typescript
// Use explicit types
function processDevice(device: Device): ProcessedDevice {
  // Implementation
}

// Avoid 'any' type
// Bad: function process(data: any)
// Good: function process(data: DeviceData)
```

### React Components

```typescript
// Use functional components with hooks
interface Props {
  deviceId: string;
  onSelect: (id: string) => void;
}

function DeviceCard({ deviceId, onSelect }: Props) {
  // Implementation
}
```

### File Organization

- Keep related code together
- Use index files for clean imports
- Separate concerns (components, services, utils)

## Questions?

Feel free to open an issue for any questions about contributing.
