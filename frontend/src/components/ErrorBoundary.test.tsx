import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Broken(): never { throw new Error('internal detail that must not be shown'); }

test('a page error shows a plain explanation and next steps without technical detail', () => {
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  render(<ErrorBoundary resetKey="/a"><Broken /></ErrorBoundary>);
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong on this page');
  expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  expect(screen.queryByText(/internal detail/)).not.toBeInTheDocument();
  quiet.mockRestore();
});
