import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SplashScreen from './components/SplashScreen';

describe('App Infrastructure', () => {
  it('renders SplashScreen component', () => {
    render(<SplashScreen />);
    expect(screen.getByText('Tamerlane')).toBeInTheDocument();
  });
});