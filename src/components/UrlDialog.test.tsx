import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UrlDialog from './UrlDialog';

test('allows user to enter a URL and submit', () => {
  const handleSubmit = jest.fn((e) => e.preventDefault());
  render(<UrlDialog onSubmit={handleSubmit} />);

  const input = screen.getByPlaceholderText(/Enter IIIF Content URL/i);
  const button = screen.getByRole('button', { name: /Submit/i });

  // Simulate user typing a URL
  fireEvent.change(input, {
    target: { value: 'http://example.com/manifest.json' },
  });
  expect(input).toHaveValue('http://example.com/manifest.json');

  // Simulate form submission
  fireEvent.click(button);

  // Check that our submit handler was called
  expect(handleSubmit).toHaveBeenCalledTimes(1);
});
