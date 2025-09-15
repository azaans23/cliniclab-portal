"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface AudioPlayerProps {
  audioUrl: string;
  callId: string;
  className?: string;
}

export const AudioPlayer = ({ audioUrl, className = "" }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [localSrc, setLocalSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch audio as blob and create object URL with correct MIME type
  useEffect(() => {
    let objectUrl: string;

    const loadAudio = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const response = await fetch(audioUrl, {
          method: "GET",
          headers: {
            Accept: "audio/*",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        // Create blob with proper audio MIME type
        // Try to detect the actual format from the URL or default to wav
        const isWav =
          audioUrl.toLowerCase().includes(".wav") ||
          audioUrl.toLowerCase().includes("wav");
        const mimeType = isWav ? "audio/wav" : "audio/mpeg";

        const blob = new Blob([arrayBuffer], { type: mimeType });
        objectUrl = URL.createObjectURL(blob);
        setLocalSrc(objectUrl);
      } catch (err) {
        console.error("Audio fetch error:", err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadAudio();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [audioUrl]);

  // Event listeners for audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !localSrc) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      setHasError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.error("Audio playback error:", e);
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setHasError(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [localSrc]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <audio ref={audioRef} src={localSrc || undefined} preload="metadata" />

      {/* Play/Pause Button */}
      <Button
        onClick={togglePlayPause}
        size="sm"
        variant="ghost"
        disabled={isLoading || hasError || !localSrc}
        className="text-sky-500 hover:text-sky-400 hover:bg-sky-500/10 disabled:opacity-50"
        title={isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        ) : hasError ? (
          <svg
            className="w-4 h-4 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </Button>

      {/* Progress Bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 min-w-[35px]">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              disabled={isLoading || hasError || duration === 0}
              className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${progress}%, #374151 ${progress}%, #374151 100%)`,
              }}
            />
          </div>
          <span className="text-xs text-neutral-400 min-w-[35px]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {hasError && (
        <span className="text-xs text-red-400">Failed to load audio</span>
      )}
    </div>
  );
};
