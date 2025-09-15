import { record } from 'rrweb';
import { compress } from 'pako';
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SessionRecordingOptions {
  projectId: string;
  userId?: string;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (sessionId: string, events: any[]) => void;
  onError?: (error: Error) => void;
}

export interface SessionEvent {
  type: number;
  data: any;
  timestamp: number;
}

export class SessionRecorder {
  private stopRecording: (() => void) | null = null;
  private events: SessionEvent[] = [];
  private sessionId: string | null = null;
  private projectId: string;
  private startTime: number = 0;
  private options: SessionRecordingOptions;

  constructor(options: SessionRecordingOptions) {
    this.options = options;
    this.projectId = options.projectId;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
  }

  /**
   * Start recording user session
   */
  async startRecording(): Promise<string> {
    if (this.stopRecording) {
      console.warn('Session recording already in progress');
      return this.sessionId!;
    }

    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.events = [];

    try {
      // Create session record in database
      const { error: sessionError } = await supabase
        .rpc('create_session_record', {
          p_session_id: this.sessionId,
          p_project_id: this.projectId,
          p_user_agent: navigator.userAgent,
          p_url: window.location.href
        });

      if (sessionError) {
        console.error('Failed to create session record:', sessionError);
        this.options.onError?.(new Error('Failed to create session record'));
        return this.sessionId;
      }

      // Start rrweb recording
      this.stopRecording = record({
        emit: (event) => {
          this.events.push({
            type: event.type,
            data: event.data,
            timestamp: event.timestamp
          });
        },
        recordCanvas: true,
        recordCrossOriginIframes: true,
        recordAfter: 'DOMContentLoaded',
        sampling: {
          scroll: 150, // Sample scroll events every 150ms
          mouseInteraction: true,
          input: 'last', // Only record the last input value
          media: true,
          other: 500 // Sample other events every 500ms
        },
        plugins: [
          // Custom plugin to track rage clicks
          {
            name: 'rage-click-detector',
            eventProcessor: (event) => {
              if (event.type === 3) { // Mouse interaction event
                const data = event.data as any;
                if (data.type === 0) { // Click event
                  // Track rapid successive clicks (potential rage clicks)
                  const now = Date.now();
                  const recentClicks = this.events.filter(e => 
                    e.type === 3 && 
                    e.data.type === 0 && 
                    (now - e.timestamp) < 2000 // Within last 2 seconds
                  );
                  
                  if (recentClicks.length > 3) {
                    // Mark as potential rage click
                    event.data.rageClick = true;
                  }
                }
              }
              return event;
            }
          }
        ]
      });

      this.options.onSessionStart?.(this.sessionId);
      console.log('Session recording started:', this.sessionId);
      
      return this.sessionId;
    } catch (error) {
      console.error('Failed to start session recording:', error);
      this.options.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop recording and save session data
   */
  async stopRecording(): Promise<void> {
    if (!this.stopRecording) {
      console.warn('No active session recording to stop');
      return;
    }

    try {
      // Stop the recording
      this.stopRecording();
      this.stopRecording = null;

      const duration = Math.round((Date.now() - this.startTime) / 1000);
      
      // Compress the events data
      const eventsJson = JSON.stringify(this.events);
      const compressed = compress(eventsJson);
      
      // Convert to base64 for storage
      const base64Data = btoa(String.fromCharCode(...compressed));
      
      // Generate storage filename
      const filename = `sessions/${this.projectId}/${this.sessionId}.json.gz`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('session-recordings')
        .upload(filename, base64Data, {
          contentType: 'application/json',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Failed to upload session data:', uploadError);
        this.options.onError?.(new Error('Failed to upload session data'));
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('session-recordings')
        .getPublicUrl(filename);

      // Update session record with end time and storage URL
      const { error: updateError } = await supabase
        .rpc('update_session_record', {
          p_session_id: this.sessionId!,
          p_duration_seconds: duration,
          p_events_count: this.events.length,
          p_storage_url: urlData.publicUrl
        });

      if (updateError) {
        console.error('Failed to update session record:', updateError);
      }

      this.options.onSessionEnd?.(this.sessionId!, this.events);
      console.log('Session recording stopped and saved:', this.sessionId);
      
    } catch (error) {
      console.error('Failed to stop session recording:', error);
      this.options.onError?.(error as Error);
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if recording is active
   */
  isRecording(): boolean {
    return this.stopRecording !== null;
  }

  /**
   * Get current events count
   */
  getEventsCount(): number {
    return this.events.length;
  }

  /**
   * Analyze behavior patterns from recorded events
   */
  analyzeBehavior(): {
    rageClicks: number;
    scrollBehavior: 'smooth' | 'erratic' | 'minimal';
    timeOnPage: number;
    interactionCount: number;
  } {
    const now = Date.now();
    const rageClicks = this.events.filter(e => 
      e.type === 3 && e.data.type === 0 && e.data.rageClick
    ).length;

    const scrollEvents = this.events.filter(e => e.type === 3 && e.data.type === 3);
    const scrollBehavior = scrollEvents.length > 20 ? 'erratic' : 
                          scrollEvents.length > 5 ? 'smooth' : 'minimal';

    const timeOnPage = Math.round((now - this.startTime) / 1000);
    const interactionCount = this.events.filter(e => e.type === 3).length;

    return {
      rageClicks,
      scrollBehavior,
      timeOnPage,
      interactionCount
    };
  }
}

/**
 * Hook for using session recording in React components
 */
export function useSessionRecording(projectId: string) {
  const [recorder, setRecorder] = useState<SessionRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    if (recorder && recorder.isRecording()) {
      return recorder.getSessionId();
    }

    const newRecorder = new SessionRecorder({
      projectId,
      onSessionStart: (id) => {
        setSessionId(id);
        setIsRecording(true);
      },
      onSessionEnd: (id) => {
        setIsRecording(false);
        console.log('Session ended:', id);
      },
      onError: (error) => {
        console.error('Session recording error:', error);
        setIsRecording(false);
      }
    });

    setRecorder(newRecorder);
    const id = await newRecorder.startRecording();
    return id;
  }, [projectId, recorder]);

  const stopRecording = useCallback(async () => {
    if (recorder && recorder.isRecording()) {
      await recorder.stopRecording();
    }
  }, [recorder]);

  const getSessionId = useCallback(() => {
    return recorder?.getSessionId() || null;
  }, [recorder]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    sessionId,
    getSessionId
  };
}