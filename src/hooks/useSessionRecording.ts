import { useState, useEffect, useCallback, useRef } from 'react';
import { SessionRecorder } from '@/utils/sessionRecording';

interface UseSessionRecordingOptions {
  projectId: string;
  autoStart?: boolean;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (sessionId: string) => void;
  onError?: (error: Error) => void;
}

export function useSessionRecording({
  projectId,
  autoStart = false,
  onSessionStart,
  onSessionEnd,
  onError
}: UseSessionRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [eventsCount, setEventsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const recorderRef = useRef<SessionRecorder | null>(null);

  // Initialize recorder
  useEffect(() => {
    if (!recorderRef.current) {
      recorderRef.current = new SessionRecorder({
        projectId,
        onSessionStart: (id) => {
          setSessionId(id);
          setIsRecording(true);
          setError(null);
          onSessionStart?.(id);
        },
        onSessionEnd: (id) => {
          setIsRecording(false);
          onSessionEnd?.(id);
        },
        onError: (err) => {
          setError(err.message);
          setIsRecording(false);
          onError?.(err);
        }
      });
    }

    // Auto-start recording if enabled
    if (autoStart && !isRecording) {
      startRecording();
    }

    // Cleanup on unmount
    return () => {
      if (recorderRef.current && recorderRef.current.isRecording()) {
        recorderRef.current.stopRecording();
      }
    };
  }, [projectId, autoStart]);

  // Update events count periodically
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      if (recorderRef.current) {
        setEventsCount(recorderRef.current.getEventsCount());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (!recorderRef.current) return null;

    try {
      setError(null);
      const id = await recorderRef.current.startRecording();
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recorderRef.current || !recorderRef.current.isRecording()) return;

    try {
      await recorderRef.current.stopRecording();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getBehaviorAnalysis = useCallback(() => {
    if (!recorderRef.current) return null;
    return recorderRef.current.analyzeBehavior();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isRecording,
    sessionId,
    eventsCount,
    error,
    startRecording,
    stopRecording,
    getBehaviorAnalysis,
    clearError
  };
}