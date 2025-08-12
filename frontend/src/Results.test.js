import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Results from './Results';

// Mock the navigate function
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
  useNavigate: () => mockNavigate,
}));

// Mock canvas getContext because it's not implemented in jsdom
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  strokeRect: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  fillText: jest.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Results Component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    localStorage.clear();
    mockNavigate.mockClear();
  });

  test('redirects to /detect if no data is in localStorage', () => {
    render(
      <MemoryRouter>
        <Results />
      </MemoryRouter>
    );
    // The component should call navigate
    expect(mockNavigate).toHaveBeenCalledWith('/detect');
  });

  test('renders detection results from localStorage', async () => {
    // Set up mock data in localStorage
    const mockImage = 'data:image/jpeg;base64,mockimagedata';
    const mockDetections = JSON.stringify([
      { label: 'Stop Sign', confidence: 0.98, box: [10, 20, 50, 60] },
    ]);

    localStorage.setItem('lastDetectedImage', mockImage);
    localStorage.setItem('lastDetectedDetections', mockDetections);

    render(
      <MemoryRouter>
        <Results />
      </MemoryRouter>
    );

    // Check if detection labels are displayed
    expect(await screen.findByText(/Stop Sign/i)).toBeInTheDocument();

    // Check if confidence scores are displayed
    expect(await screen.findByText(/98%/i)).toBeInTheDocument();

    // Check that we are not redirecting
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
