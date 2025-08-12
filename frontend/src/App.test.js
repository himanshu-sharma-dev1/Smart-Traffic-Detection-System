import { render, screen, within } from '@testing-library/react';
import App from './App';

test('renders main navigation links', () => {
  render(<App />);

  // Find the navigation bar landmark
  const nav = screen.getByRole('navigation');

  // Check for the brand link specifically within the navigation bar
  // This is more specific and avoids matching the same text in the footer
  expect(within(nav).getByText(/Smart Traffic Detection/i)).toBeInTheDocument();

  // Check for other nav links within the navigation bar
  expect(within(nav).getByRole('link', { name: /^Home$/i })).toBeInTheDocument();
  expect(within(nav).getByRole('link', { name: /Features/i })).toBeInTheDocument();
  // Use an exact match regex to avoid matching "Smart Traffic Detection"
  expect(within(nav).getByRole('link', { name: /^Detection$/i })).toBeInTheDocument();
  expect(within(nav).getByRole('link', { name: /About Us/i })).toBeInTheDocument();
  expect(within(nav).getByRole('link', { name: /Contact/i })).toBeInTheDocument();
});
