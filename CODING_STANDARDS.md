
# TypeScript Coding Standards for AlgoTouch Project

This document outlines the TypeScript coding standards and best practices for the AlgoTouch project. Following these guidelines ensures consistency, maintainability, and helps prevent common errors.

## TypeScript Types and Interfaces

### Naming Conventions

- Use **PascalCase** for type names and interfaces
- Use **camelCase** for function, parameter, method, property, and variable names
- Use **UPPER_SNAKE_CASE** for constants

```typescript
// Good
interface UserProfile {}
type ApiResponse = {}
const fetchData = () => {}
const MAX_RETRY_COUNT = 3;

// Bad
interface userProfile {}
type apiResponse = {}
const FetchData = () => {}
const maxRetryCount = 3;
```

### Interface vs. Type

- Prefer `interface` for object typing (including React props and state)
- Use `type` for unions, intersections, and simple type aliases
- Use `interface` for public API definitions as they are more extendable

```typescript
// Prefer interface for objects (especially for React components)
interface ButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

// Use type for unions or when you need to use complex type features
type Theme = 'light' | 'dark' | 'system';
type Callback = (data: unknown) => void;
```

### Use Readonly Where Appropriate

- Use `readonly` modifier for properties that should not be mutated
- Use `ReadonlyArray<T>` for arrays that should not be modified

```typescript
interface Configuration {
  readonly apiKey: string;
  readonly endpoints: ReadonlyArray<string>;
  timeoutMs: number; // This can be changed
}
```

### Avoid Using `any` Type

- Avoid using `any` as it defeats TypeScript's type checking
- If the type is unknown, use `unknown` instead and perform type narrowing
- For functions with dynamic parameters or return types, use generics

```typescript
// Bad
function process(data: any): any {
  return data.value;
}

// Good
function process<T extends { value: unknown }>(data: T): unknown {
  return data.value;
}

// Better with type constraints
function process<T extends { value: V }, V>(data: T): V {
  return data.value;
}
```

### Error Handling

- Define proper error types instead of using `any` in catch blocks
- Create custom error classes when needed

```typescript
// Bad
try {
  // some code
} catch (error: any) {
  console.error(error.message);
}

// Good
try {
  // some code
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
}

// Better with custom errors
class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
```

## React Component Types

### Function Components

- Use React.FC (or React.FunctionComponent) type for function components
- Define props interface separately for reusability and clarity
- Export prop interfaces when they might be used by other components

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};
```

### Event Handlers

- Use proper React event types from React.SyntheticEvent
- Name event handlers with handle* prefix followed by the action

```typescript
interface FormProps {
  onSubmit: (data: FormData) => void;
}

const Form: React.FC<FormProps> = ({ onSubmit }) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSubmit(formData);
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
};
```

### Children Props

- Be explicit about components that accept children

```typescript
interface CardProps {
  title: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="content">{children}</div>
    </div>
  );
};
```

## Third-Party Libraries

### Type Declarations

- Use official type declarations where available (`@types/*` packages)
- For libraries without type declarations, create custom type declarations in a `types` folder
- Use module augmentation for extending existing types

```typescript
// src/types/external-lib.d.ts
declare module 'external-lib' {
  export function doSomething(arg: string): number;
  export class Helper {
    process(input: string): Promise<string>;
  }
}
```

### API Responses

- Define interfaces for all API responses
- Use partial types for responses that might be incomplete
- Consider using generics for responses with similar structures

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
}

// Usage
async function fetchUser(id: string): Promise<ApiResponse<UserData>> {
  const response = await api.get(`/users/${id}`);
  return response;
}
```

## Advanced TypeScript Features

### Type Guards

- Use type guards to narrow types in conditional blocks
- Create custom type guard functions when needed

```typescript
// Type guard function
function isUserResponse(obj: unknown): obj is UserResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'email' in obj
  );
}

// Usage
if (isUserResponse(data)) {
  // TypeScript knows data is UserResponse here
  console.log(data.name);
}
```

### Utility Types

- Leverage built-in TypeScript utility types like Partial, Required, Pick, Omit, etc.
- Create and export reusable custom utility types when needed

```typescript
// Built-in utility types
type UserCreationParams = Omit<User, 'id'>;
type UserUpdateParams = Partial<User>;

// Custom utility type
type NonEmptyArray<T> = [T, ...T[]];
```

## ESLint Integration

- The ESLint configuration is set to enforce these coding standards
- Warnings are treated as errors in CI builds
- All TypeScript strict checks are enabled

## Review Process

- Code reviews should check for proper type usage
- Types should be reviewed for correctness and completeness
- The use of `any` should be flagged for refactoring

Following these guidelines will help maintain high-quality TypeScript code in the AlgoTouch project and prevent common type-related issues.
