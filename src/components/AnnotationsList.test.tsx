import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnnotationsList from './AnnotationsList';
import { IIIFAnnotation } from '../types';

// Mock lucide-react - return a simple component
jest.mock('lucide-react', () => ({
  ClipboardCopy: ({ onClick, title, className, ...props }: any) => (
    <button
      onClick={onClick}
      title={title}
      className={className}
      data-testid="copy-button"
      {...props}
    >
      Copy
    </button>
  ),
}));

// Mock DOMPurify
jest.mock('dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: (html: string) => html, // Return the string directly, not a jest.fn()
  },
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe('AnnotationsList', () => {
  const mockAnnotations: IIIFAnnotation[] = [
    {
      id: 'anno1',
      motivation: 'commenting',
      target: ['canvas1#xywh=10,20,30,40'],
      body: {
        type: 'TextualBody',
        value: 'First annotation text',
        language: 'en',
      },
    },
    {
      id: 'anno2',
      motivation: 'tagging',
      target: ['canvas1#xywh=50,60,70,80'],
      body: {
        type: 'TextualBody',
        value: 'Second annotation text',
        language: 'en',
      },
    },
    {
      id: 'anno3',
      motivation: 'commenting',
      target: ['canvas1#xywh=90,100,110,120'],
      body: {
        type: 'TextualBody',
        value: 'Latin annotation text',
        language: 'la',
      },
    },
  ];

  const defaultProps = {
    annotations: mockAnnotations,
    onAnnotationSelect: jest.fn(),
    selectedLanguage: 'en',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<AnnotationsList {...defaultProps} />);
    // Component renders as a div container, not a list
    expect(screen.getByText('First annotation text')).toBeInTheDocument();
  });

  test('renders annotations for selected language', () => {
    render(<AnnotationsList {...defaultProps} />);

    expect(screen.getByText('First annotation text')).toBeInTheDocument();
    expect(screen.getByText('Second annotation text')).toBeInTheDocument();
    // Latin annotation should not be visible when selectedLanguage is 'en'
    expect(screen.queryByText('Latin annotation text')).not.toBeInTheDocument();
  });

  test('calls onAnnotationSelect when annotation is clicked', () => {
    const mockOnSelect = jest.fn();
    render(
      <AnnotationsList {...defaultProps} onAnnotationSelect={mockOnSelect} />,
    );

    fireEvent.click(screen.getByText('First annotation text'));

    expect(mockOnSelect).toHaveBeenCalledWith(mockAnnotations[0]);
  });

  test('filters annotations by selected language', () => {
    render(<AnnotationsList {...defaultProps} selectedLanguage="la" />);

    // Only Latin annotation should be visible
    expect(screen.getByText('Latin annotation text')).toBeInTheDocument();
    expect(screen.queryByText('First annotation text')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Second annotation text'),
    ).not.toBeInTheDocument();
  });

  test('handles empty annotations array', () => {
    render(<AnnotationsList {...defaultProps} annotations={[]} />);

    // Should render without crashing - container should exist but no annotations
    expect(screen.queryByText('First annotation text')).not.toBeInTheDocument();
  });
});
