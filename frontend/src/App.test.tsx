import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/OverviewDashboard', () => () => <div>Dashboard Overview</div>);

test('renders learn react link', () => {
  render(<App />);
  expect(screen.getByText(/digi carotene/i)).toBeInTheDocument();
});
