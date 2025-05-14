
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';
import { BrowserRouter } from 'react-router-dom';

// Wrap the component in required context providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('App component', () => {
  it('renders without crashing', () => {
    // This test simply verifies that the App component renders without throwing an error
    expect(() => {
      renderWithProviders(<App />);
    }).not.toThrow();
  });
});
