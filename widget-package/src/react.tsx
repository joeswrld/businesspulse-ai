import React, { useEffect, useRef } from 'react';
import { initNoteXWidget, getNoteXWidget, NoteXWidgetConfig } from './index';

// React Hook
export function useNoteXWidget(config: NoteXWidgetConfig) {
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    widgetRef.current = initNoteXWidget(config);

    return () => {
      widgetRef.current?.destroy();
    };
  }, [config]);

  const open = () => widgetRef.current?.open();
  const close = () => widgetRef.current?.close();
  const toggle = () => widgetRef.current?.toggle();
  const updateConfig = (newConfig: Partial<NoteXWidgetConfig>) => 
    widgetRef.current?.updateConfig(newConfig);

  return { open, close, toggle, updateConfig };
}

// React Component
interface NoteXWidgetProps extends NoteXWidgetConfig {
  children?: React.ReactNode;
}

export const NoteXWidget: React.FC<NoteXWidgetProps> = ({ 
  children, 
  ...config 
}) => {
  const { open, close, toggle } = useNoteXWidget(config);

  return (
    <div>
      {children}
      {/* Optional: Add a trigger button */}
      {children && (
        <button 
          onClick={toggle}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9998,
            background: config.primaryColor || '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            cursor: 'pointer'
          }}
        >
          💬
        </button>
      )}
    </div>
  );
};

// Provider Component
interface NoteXProviderProps {
  config: NoteXWidgetConfig;
  children: React.ReactNode;
}

export const NoteXProvider: React.FC<NoteXProviderProps> = ({ 
  config, 
  children 
}) => {
  useEffect(() => {
    initNoteXWidget(config);
    
    return () => {
      getNoteXWidget()?.destroy();
    };
  }, [config]);

  return <>{children}</>;
};