import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders initial scaffolding header', () => {
    render(<App />);
    expect(screen.getByText('Billetera Caja Chica')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
  });
});
