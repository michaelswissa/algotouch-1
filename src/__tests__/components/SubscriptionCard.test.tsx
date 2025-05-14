
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SubscriptionCard from '../../components/subscription/SubscriptionCard';

describe('SubscriptionCard component', () => {
  it('renders title and description correctly', () => {
    const testTitle = 'Test Title';
    const testDescription = 'Test Description';
    
    render(
      <SubscriptionCard 
        title={testTitle} 
        description={testDescription}
      >
        <div data-testid="test-children">Test children content</div>
      </SubscriptionCard>
    );
    
    expect(screen.getByText(testTitle)).toBeInTheDocument();
    expect(screen.getByText(testDescription)).toBeInTheDocument();
    expect(screen.getByTestId('test-children')).toBeInTheDocument();
  });
});
