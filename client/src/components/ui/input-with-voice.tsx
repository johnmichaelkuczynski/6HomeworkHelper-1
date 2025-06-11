import { forwardRef } from 'react';
import { Input } from './input';
import { VoiceInput } from './voice-input';
import { cn } from '@/lib/utils';

export interface InputWithVoiceProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onVoiceTranscript?: (text: string) => void;
  showVoiceButton?: boolean;
}

const InputWithVoice = forwardRef<HTMLInputElement, InputWithVoiceProps>(
  ({ className, onVoiceTranscript, showVoiceButton = true, onChange, value, ...props }, ref) => {
    const handleVoiceTranscript = (transcript: string) => {
      if (onVoiceTranscript) {
        onVoiceTranscript(transcript);
      } else if (onChange) {
        // Simulate an input change event
        const event = {
          target: { value: transcript }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn(showVoiceButton && "pr-10", className)}
          value={value}
          onChange={onChange}
          {...props}
        />
        {showVoiceButton && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              size="sm"
            />
          </div>
        )}
      </div>
    );
  }
);

InputWithVoice.displayName = "InputWithVoice";

export { InputWithVoice };