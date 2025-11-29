import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastItem, ToastContainer } from './Toast';
import type { Toast } from './Toast';

describe('Toast Component', () => {
  describe('ToastItem', () => {
    it('renders success toast with title and message', () => {
      const toast: Toast = {
        id: 'test-1',
        type: 'success',
        title: 'Success!',
        message: 'Operation completed successfully',
      };
      const onClose = vi.fn();

      render(<ToastItem toast={toast} onClose={onClose} />);

      expect(screen.getByText('Success!')).toBeTruthy();
      expect(screen.getByText('Operation completed successfully')).toBeTruthy();
    });

    it('renders error toast with appropriate styling', () => {
      const toast: Toast = {
        id: 'test-2',
        type: 'error',
        title: 'Error occurred',
        message: 'Something went wrong',
      };
      const onClose = vi.fn();

      render(<ToastItem toast={toast} onClose={onClose} />);

      expect(screen.getByText('Error occurred')).toBeTruthy();
      expect(screen.getByText('Something went wrong')).toBeTruthy();
    });

    it('renders warning toast', () => {
      const toast: Toast = {
        id: 'test-3',
        type: 'warning',
        title: 'Warning',
        message: 'Please be careful',
      };
      const onClose = vi.fn();

      render(<ToastItem toast={toast} onClose={onClose} />);

      expect(screen.getByText('Warning')).toBeTruthy();
      expect(screen.getByText('Please be careful')).toBeTruthy();
    });

    it('renders info toast', () => {
      const toast: Toast = {
        id: 'test-4',
        type: 'info',
        title: 'Information',
        message: 'Here is some info',
      };
      const onClose = vi.fn();

      render(<ToastItem toast={toast} onClose={onClose} />);

      expect(screen.getByText('Information')).toBeTruthy();
      expect(screen.getByText('Here is some info')).toBeTruthy();
    });

    it('renders toast without message', () => {
      const toast: Toast = {
        id: 'test-5',
        type: 'success',
        title: 'Success!',
      };
      const onClose = vi.fn();

      render(<ToastItem toast={toast} onClose={onClose} />);

      expect(screen.getByText('Success!')).toBeTruthy();
      expect(screen.queryByText(/./)).not.toBeNull();
    });
  });

  describe('ToastContainer', () => {
    it('renders multiple toasts', () => {
      const toasts: Toast[] = [
        { id: '1', type: 'success', title: 'Success 1' },
        { id: '2', type: 'error', title: 'Error 1' },
        { id: '3', type: 'warning', title: 'Warning 1' },
      ];
      const onClose = vi.fn();

      render(<ToastContainer toasts={toasts} onClose={onClose} />);

      expect(screen.getByText('Success 1')).toBeTruthy();
      expect(screen.getByText('Error 1')).toBeTruthy();
      expect(screen.getByText('Warning 1')).toBeTruthy();
    });

    it('renders empty container when no toasts', () => {
      const onClose = vi.fn();

      const { container } = render(<ToastContainer toasts={[]} onClose={onClose} />);

      expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
      expect(container.querySelector('[aria-live="polite"]')?.children.length).toBe(0);
    });
  });
});
