import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RightSidebar } from './RightSidebar';
import type { ExportSettings } from '../types';

describe('RightSidebar', () => {
  const defaultSettings: ExportSettings = {
    outputFormat: 'html5-complete',
    theme: 'github-dark',
    fontFamily: 'system',
    fontSize: 'medium',
    includeTOC: false,
    tocPosition: 'left-sidebar',
    sanitizeHTML: true,
    includeCSS: true,
    minifyOutput: false,
    highlightCode: true,
  };

  it('renders export settings section', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    expect(screen.getByText('Export Settings')).not.toBeNull();
  });

  it('renders all setting controls', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    expect(screen.getByText('Output Format')).not.toBeNull();
    expect(screen.getByText('Theme')).not.toBeNull();
    expect(screen.getByText('Font Family')).not.toBeNull();
    expect(screen.getByText('Font Size')).not.toBeNull();
    expect(screen.getByText('Include Table of Contents')).not.toBeNull();
    expect(screen.getByText('Sanitize HTML')).not.toBeNull();
    expect(screen.getByText('Include CSS')).not.toBeNull();
    expect(screen.getByText('Minify Output')).not.toBeNull();
    expect(screen.getByText('Highlight Code')).not.toBeNull();
  });

  it('shows TOC position when TOC is enabled', () => {
    const onSettingsChange = vi.fn();
    const settingsWithTOC = { ...defaultSettings, includeTOC: true };

    render(
      <RightSidebar
        exportSettings={settingsWithTOC}
        onSettingsChange={onSettingsChange}
      />
    );

    expect(screen.getByText('Left Sidebar')).not.toBeNull();
  });

  it('renders all font family options', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    expect(screen.getByText('Inter')).not.toBeNull();
    expect(screen.getByText('Roboto')).not.toBeNull();
    expect(screen.getByText('Open Sans')).not.toBeNull();
    expect(screen.getByText('Merriweather (Serif)')).not.toBeNull();
    expect(screen.getByText('Fira Code (Mono)')).not.toBeNull();
  });

  it('hides TOC position when TOC is disabled', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    expect(screen.queryByText('Left Sidebar')).toBeNull();
  });

  it('calls onSettingsChange when output format changes', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    const select = screen.getByDisplayValue('HTML5 Complete');
    fireEvent.change(select, { target: { value: 'html-fragment' } });

    expect(onSettingsChange).toHaveBeenCalledWith({ outputFormat: 'html-fragment' });
  });

  it('calls onSettingsChange when theme changes', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    const select = screen.getByDisplayValue('GitHub Dark');
    fireEvent.change(select, { target: { value: 'dracula' } });

    expect(onSettingsChange).toHaveBeenCalledWith({ theme: 'dracula' });
  });

  it('renders status card with version', () => {
    const onSettingsChange = vi.fn();
    render(
      <RightSidebar
        exportSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    expect(screen.getByText('Status')).not.toBeNull();
    expect(screen.getByText('1.0.0')).not.toBeNull();
    expect(screen.getByText('Ready')).not.toBeNull();
  });
});
