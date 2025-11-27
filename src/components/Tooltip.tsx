import { type ReactNode, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  content: string;
  delay?: number;
}

type Position = 'top' | 'bottom' | 'left' | 'right';

interface TooltipPosition {
  top: number;
  left: number;
  position: Position;
}

export function Tooltip({ children, content, delay = 300 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const calculatePosition = (): TooltipPosition | null => {
    if (!triggerRef.current) return null;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 200; // Estimated tooltip width
    const tooltipHeight = 40; // Estimated tooltip height
    const spacing = 8; // Space between trigger and tooltip

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate available space in each direction
    const spaceTop = triggerRect.top;
    const spaceBottom = viewportHeight - triggerRect.bottom;
    const spaceRight = viewportWidth - triggerRect.right;

    // Determine best position based on available space
    let position: Position;
    let top: number;
    let left: number;

    // Priority: top > bottom > right > left
    if (spaceTop >= tooltipHeight + spacing) {
      position = 'top';
      top = triggerRect.top - tooltipHeight - spacing;
      left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    } else if (spaceBottom >= tooltipHeight + spacing) {
      position = 'bottom';
      top = triggerRect.bottom + spacing;
      left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    } else if (spaceRight >= tooltipWidth + spacing) {
      position = 'right';
      top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
      left = triggerRect.right + spacing;
    } else {
      position = 'left';
      top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
      left = triggerRect.left - tooltipWidth - spacing;
    }

    // Ensure tooltip stays within viewport bounds
    // Horizontal bounds
    if (left < spacing) {
      left = spacing;
    } else if (left + tooltipWidth > viewportWidth - spacing) {
      left = viewportWidth - tooltipWidth - spacing;
    }

    // Vertical bounds
    if (top < spacing) {
      top = spacing;
    } else if (top + tooltipHeight > viewportHeight - spacing) {
      top = viewportHeight - tooltipHeight - spacing;
    }

    return { top, left, position };
  };

  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => {
      const position = calculatePosition();
      setTooltipPosition(position);
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
    setTooltipPosition(null);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Update position on scroll or resize
  useEffect(() => {
    if (!isVisible) return;

    const updatePosition = () => {
      const position = calculatePosition();
      setTooltipPosition(position);
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible]);

  const getArrowInlineStyles = (position: Position): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };
    
    switch (position) {
      case 'top':
        return {
          ...baseStyles,
          borderWidth: '8px 8px 0 8px',
          borderColor: '#0f172a transparent transparent transparent',
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          ...baseStyles,
          borderWidth: '0 8px 8px 8px',
          borderColor: 'transparent transparent #0f172a transparent',
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          ...baseStyles,
          borderWidth: '8px 0 8px 8px',
          borderColor: 'transparent transparent transparent #0f172a',
          right: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          ...baseStyles,
          borderWidth: '8px 8px 8px 0',
          borderColor: 'transparent #0f172a transparent transparent',
          left: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
        };
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && tooltipPosition && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] px-3 py-2 text-sm rounded-lg shadow-xl max-w-[200px] pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: '1px solid #334155',
          }}
          role="tooltip"
        >
          {content}
          <div 
            className="absolute"
            style={getArrowInlineStyles(tooltipPosition.position)}
          />
        </div>,
        document.body
      )}
    </>
  );
}
