import { forwardRef } from 'react';
import { Textarea } from './textarea';
import { VoiceInput } from './voice-input';
import { cn } from '@/lib/utils';

export interface TextareaWithVoiceProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onVoiceTranscript?: (text: string) => void;
  showVoiceButton?: boolean;
}

const TextareaWithVoice = forwardRef<HTMLTextAreaElement, TextareaWithVoiceProps>(
  ({ className, onVoiceTranscript, showVoiceButton = true, onChange, value, ...props }, ref) => {
    const handleVoiceTranscript = (transcript: string) => {
      if (onVoiceTranscript) {
        onVoiceTranscript(transcript);
      } else if (onChange) {
        // Simulate a textarea change event
        const event = {
          target: { value: transcript }
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
      }
    };

    return (
      <div className="relative">
        <Textarea
          ref={ref}
          className={cn(showVoiceButton && "pr-12", className)}
          value={value}
          onChange={onChange}
          {...props}
        />
        {showVoiceButton && (
          <div className="absolute right-2 top-2">
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

TextareaWithVoice.displayName = "TextareaWithVoice";

export { TextareaWithVoice };