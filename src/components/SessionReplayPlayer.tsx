import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Maximize2,
  Clock,
  MousePointer,
  Eye
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';

interface SessionReplayPlayerProps {
  sessionId: string;
  projectId: string;
  onClose?: () => void;
}

interface SessionData {
  events: any[];
  metadata: {
    duration: number;
    eventsCount: number;
    startTime: string;
    endTime: string;
    userAgent: string;
    url: string;
  };
}

const SessionReplayPlayer: React.FC<SessionReplayPlayerProps> = ({
  sessionId,
  projectId,
  onClose
}) => {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const replayerRef = useRef<Replayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load session data
  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (replayerRef.current) {
        replayerRef.current.destroy();
      }
    };
  }, []);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get session metadata
      const { data: sessionRecord, error: sessionError } = await supabase
        .from('session_records')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (sessionError || !sessionRecord) {
        throw new Error('Session not found');
      }

      // Download and decompress session data
      if (!sessionRecord.storage_url) {
        throw new Error('Session data not available');
      }

      const response = await fetch(sessionRecord.storage_url);
      if (!response.ok) {
        throw new Error('Failed to load session data');
      }

      const compressedData = await response.text();
      
      // Decompress the data (it's base64 encoded gzipped JSON)
      const binaryString = atob(compressedData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decompress using pako
      const { decompress } = await import('pako');
      const decompressed = decompress(bytes, { to: 'string' });
      const events = JSON.parse(decompressed);

      setSessionData({
        events,
        metadata: {
          duration: sessionRecord.duration_seconds || 0,
          eventsCount: sessionRecord.events_count || 0,
          startTime: sessionRecord.start_time,
          endTime: sessionRecord.end_time || '',
          userAgent: sessionRecord.user_agent || '',
          url: sessionRecord.url || ''
        }
      });

      setDuration(sessionRecord.duration_seconds || 0);
    } catch (err) {
      console.error('Failed to load session data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const initializeReplayer = async () => {
    if (!sessionData || !containerRef.current) return;

    try {
      // Destroy existing replayer
      if (replayerRef.current) {
        replayerRef.current.destroy();
      }

      // Create new replayer
      const { Replayer } = await import('rrweb');
      replayerRef.current = new Replayer(sessionData.events, {
        target: containerRef.current,
        props: {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        },
        mouseTail: {
          duration: 500,
          lineCap: 'round',
          lineWidth: 3,
          strokeStyle: 'red',
        },
        speed: speed,
        skipInactive: true,
        showWarning: false,
        blockClass: 'rr-block',
        liveMode: false,
        insertStyleRules: [
          `.rr-block { background: #ff0000 !important; }`
        ]
      });

      // Set up event listeners
      replayerRef.current.on('finish', () => {
        setIsPlaying(false);
        setCurrentTime(duration);
      });

      replayerRef.current.on('resize', (size) => {
        if (containerRef.current) {
          containerRef.current.style.width = `${size.width}px`;
          containerRef.current.style.height = `${size.height}px`;
        }
      });

    } catch (err) {
      console.error('Failed to initialize replayer:', err);
      setError('Failed to initialize replay player');
    }
  };

  // Initialize replayer when session data is loaded
  useEffect(() => {
    if (sessionData) {
      initializeReplayer();
    }
  }, [sessionData]);

  const togglePlayPause = () => {
    if (!replayerRef.current) return;

    if (isPlaying) {
      replayerRef.current.pause();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    } else {
      replayerRef.current.play();
      // Start progress tracking
      progressIntervalRef.current = setInterval(() => {
        if (replayerRef.current) {
          setCurrentTime(replayerRef.current.getCurrentTime());
        }
      }, 100);
    }
    setIsPlaying(!isPlaying);
  };

  const stop = () => {
    if (replayerRef.current) {
      replayerRef.current.pause();
      replayerRef.current.setCurrentTime(0);
      setCurrentTime(0);
      setIsPlaying(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  };

  const seekTo = (time: number) => {
    if (replayerRef.current) {
      replayerRef.current.setCurrentTime(time);
      setCurrentTime(time);
    }
  };

  const changeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (replayerRef.current) {
      replayerRef.current.setConfig({ speed: newSpeed });
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session replay...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-red-600 mb-4">
            <Eye className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Failed to load session</p>
            <p className="text-sm">{error}</p>
          </div>
          {onClose && (
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!sessionData) {
    return null;
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Session Replay</span>
              <Badge variant="outline">{sessionId}</Badge>
            </CardTitle>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{formatTime(duration)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MousePointer className="h-4 w-4" />
                <span>{sessionData.metadata.eventsCount} events</span>
              </div>
              <div className="text-xs">
                {new Date(sessionData.metadata.startTime).toLocaleString()}
              </div>
            </div>
          </div>
          {onClose && (
            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Replay Container */}
        <div 
          ref={containerRef}
          className="w-full bg-gray-100 rounded-lg overflow-hidden"
          style={{ minHeight: '400px' }}
        />

        {/* Controls */}
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={([value]) => seekTo(value)}
              className="w-full"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => seekTo(Math.max(0, currentTime - 10))}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayPause}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={stop}
              >
                <Square className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => seekTo(Math.min(duration, currentTime + 10))}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              {/* Speed Control */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Speed:</span>
                <select
                  value={speed}
                  onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>

              {/* Volume Control */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={([value]) => {
                    setVolume(value);
                    setIsMuted(value === 0);
                  }}
                  className="w-20"
                />
              </div>

              {/* Fullscreen */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-1">URL</h4>
            <p className="text-xs text-gray-600 truncate">{sessionData.metadata.url}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-1">User Agent</h4>
            <p className="text-xs text-gray-600 truncate">{sessionData.metadata.userAgent}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-1">Duration</h4>
            <p className="text-xs text-gray-600">{formatTime(sessionData.metadata.duration)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionReplayPlayer;