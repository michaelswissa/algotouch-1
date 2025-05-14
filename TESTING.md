
# AlgoTouch Testing Guide

This document provides information about the testing infrastructure and how to run tests.

## Test Scripts

Since we cannot modify the package.json directly, you can run tests using the following npx commands:

```bash
# Run tests
npx vitest

# Run tests with UI
npx vitest --ui

# Run tests with coverage
npx vitest run --coverage
```

You could add these commands as npm scripts if you have access to modify package.json in the future:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "coverage": "vitest run --coverage"
  }
}
```

## Test Structure

Tests are organized in the following way:

- Unit tests are placed in the `src/__tests__` directory
- Components tests are placed in `src/__tests__/components`
- Test files use the naming convention `*.test.tsx` or `*.test.ts`

## Coverage Goals

The project aims for 80% code coverage across:
- Statements
- Branches
- Functions
- Lines

## Writing Tests

Tests are written using:
- Vitest as the test runner
- React Testing Library for component testing
- Jest DOM for additional DOM matchers

Example test:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import YourComponent from '../path/to/YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## RTL (Right-to-Left) Testing

The test setup includes configuration for RTL testing, as the application supports right-to-left languages. The test environment has RTL direction set by default.
