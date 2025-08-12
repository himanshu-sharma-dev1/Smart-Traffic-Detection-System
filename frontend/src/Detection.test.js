import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Detection from './Detection';

// Mock navigator.mediaDevices.getUserMedia
beforeAll(() => {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockResolvedValue(null),
    },
    writable: true,
  });
});

test('renders detection page with initial buttons', () => {
  render(
    <Router>
      <Detection />
    </Router>
  );

  // Check for the main heading
  expect(screen.getByText(/Live Traffic Sign Detection/i)).toBeInTheDocument();

  // Check for initial buttons
  const startCameraButton = screen.getByRole('button', { name: /Start Camera/i });
  expect(startCameraButton).toBeInTheDocument();
  expect(startCameraButton).not.toBeDisabled();

  const uploadButton = screen.getByRole('button', { name: /Upload Image/i });
  expect(uploadButton).toBeInTheDocument();
  expect(uploadButton).not.toBeDisabled();

  // The capture button should be disabled initially
  const captureButton = screen.getByRole('button', { name: /Capture from Webcam/i });
  expect(captureButton).toBeInTheDocument();
  expect(captureButton).toBeDisabled();
});
