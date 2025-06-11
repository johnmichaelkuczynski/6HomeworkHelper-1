import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from './button';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isActive?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function VoiceInput({ onTranscript, isActive = false, className, size = 'md' }: VoiceInputProps) {
  const { isListening, transcript, error, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const [lastTranscript, setLastTranscript] = useState('');

  useEffect(() => {
    if (transcript && transcript !== lastTranscript) {
      onTranscript(transcript);
      setLastTranscript(transcript);
    }
  }, [transcript, lastTranscript, onTranscript]);

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  if (!isSupported) {
    return null;
  }

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <Button
      type="button"
      variant={isListening ? "default" : "outline"}
      size="sm"
      className={cn(
        sizeClasses[size],
        "p-1 transition-all duration-200",
        isListening && "bg-red-500 hover:bg-red-600 text-white animate-pulse",
        error && "border-red-300 bg-red-50",
        className
      )}
      onClick={handleToggle}
      title={isListening ? "Stop dictation" : "Start voice dictation"}
    >
      {isListening ? (
        <Volume2 className={cn(iconSizes[size], "animate-pulse")} />
      ) : error ? (
        <MicOff className={cn(iconSizes[size], "text-red-500")} />
      ) : (
        <Mic className={iconSizes[size]} />
      )}
    </Button>
  );
}