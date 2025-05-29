import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadFile, processText } from '@/lib/api';
import type { ProcessAssignmentResponse } from '@shared/schema';

export function useLLMProcessor() {
  const [currentResult, setCurrentResult] = useState<ProcessAssignmentResponse | null>(null);

  const uploadMutation = useMutation({
    mutationFn: ({ file, provider }: { file: File; provider: string }) =>
      uploadFile(file, provider),
    onSuccess: (data) => {
      setCurrentResult(data);
    },
  });

  const textMutation = useMutation({
    mutationFn: ({ text, provider }: { text: string; provider: string }) =>
      processText(text, provider),
    onSuccess: (data) => {
      setCurrentResult(data);
    },
  });

  const clearResult = () => {
    setCurrentResult(null);
  };

  return {
    currentResult,
    uploadFile: uploadMutation.mutate,
    processText: textMutation.mutate,
    clearResult,
    isProcessing: uploadMutation.isPending || textMutation.isPending,
    error: uploadMutation.error || textMutation.error,
  };
}
