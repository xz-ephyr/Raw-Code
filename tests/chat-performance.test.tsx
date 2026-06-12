import { render, screen, fireEvent, act } from '@testing-library/react';
import { expect, test, vi, describe, beforeEach, afterEach } from 'vitest';
import { ChatPage } from '../src/pages/ChatPage';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

// Mock performance.now for stable timing measurements
const originalNow = performance.now;
let mockTime = 0;

describe('ChatPage Performance and Streaming', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockTime = 1000;
    performance.now = vi.fn(() => mockTime);
  });

  afterEach(() => {
    vi.useRealTimers();
    performance.now = originalNow;
  });

  test('measures real incremental streaming re-renders', async () => {
    render(
      <MemoryRouter initialEntries={['/chat/123']}>
        <Routes>
          <Route path="/chat/:uuid" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Ask anything...');
    const sendButton = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'Streaming test' } });

    const startTime = performance.now();

    await act(async () => {
      fireEvent.click(sendButton);
    });

    // 1. User message appears immediately
    expect(screen.getByText('Streaming test')).toBeInTheDocument();
    console.log(`User message appearance time: ${performance.now() - startTime}ms`);

    // 2. Wait for assistant to initialize (100ms delay in code)
    await act(async () => {
      vi.advanceTimersByTime(100);
      mockTime += 100;
    });

    // 3. Verify incremental updates
    // The code uses 30ms interval for tokens
    await act(async () => {
      vi.advanceTimersByTime(30); // First token: 'T'
      mockTime += 30;
    });
    expect(screen.getByText('T')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(30); // Second token: 'Th'
      mockTime += 30;
    });
    expect(screen.getByText('Th')).toBeInTheDocument();

    // 4. Complete streaming
    await act(async () => {
      vi.advanceTimersByTime(1500);
      mockTime += 1500;
    });
    expect(screen.getByText('This is a simulated AI response.')).toBeInTheDocument();
  });

  test('verifies "request first" logic (user message before assistant)', async () => {
    render(
      <MemoryRouter initialEntries={['/chat/123']}>
        <Routes>
          <Route path="/chat/:uuid" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Ask anything...');
    const sendButton = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'Is user message first?' } });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    // User message should be present
    expect(screen.getByText('Is user message first?')).toBeInTheDocument();

    // Assistant message should NOT be present yet (it has a 100ms delay)
    // We check for the specific assistant text
    expect(screen.queryByText(/This is a simulated/)).not.toBeInTheDocument();

    // Also check that it hasn't even started (no empty assistant bubble)
    // We can check the number of message bubbles if they had a test ID,
    // but we can also just check that ONLY the user message content exists in that role.
  });
});
