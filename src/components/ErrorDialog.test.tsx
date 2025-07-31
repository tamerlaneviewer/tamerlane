import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorDialog from './ErrorDialog';

test('renders the correct error message', () => {
  render(<ErrorDialog message="A test error occurred." onDismiss={() => {}} />);
  expect(screen.getByText('A test error occurred.')).toBeInTheDocument();
});

test('calls the onDismiss function when the button is clicked', () => {
  const handleDismiss = jest.fn();
  render(<ErrorDialog message="Test" onDismiss={handleDismiss} />);

  const dismissButton = screen.getByRole('button', { name: /dismiss/i });
  fireEvent.click(dismissButton);

  expect(handleDismiss).toHaveBeenCalledTimes(1);
});
