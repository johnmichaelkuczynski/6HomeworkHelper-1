import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { MathRenderer } from "@/components/ui/math-renderer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Send, Copy, Trash2, CheckCircle, History, Lightbulb, Download, Edit3, Save, X, ArrowDown, FileText, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { useQuery, useMutation } from "@tanstack/react-query";

export default function HomeworkAssistant() {
  const [inputText, setInputText] = useState("");
  const [currentAssignmentName, setCurrentAssignmentName] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("anthropic");
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [wordCount, setWordCount] = useState(0);
  const [aiDetectionResult, setAiDetectionResult] = useState<any>(null);
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [chatFileUpload, setChatFileUpload] = useState<File | null>(null);
  const [critiqueText, setCritiqueText] = useState("");
  const [isRewriting, setIsRewriting] = useState(false);
  const [isEditingTopSolution, setIsEditingTopSolution] = useState(false);
  const [isEditingBottomSolution, setIsEditingBottomSolution] = useState(false);
  const [editedTopSolution, setEditedTopSolution] = useState("");
  const [editedBottomSolution, setEditedBottomSolution] = useState("");
  const [isChunkedProcessing, setIsChunkedProcessing] = useState(false);
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });
  const [accumulatedContent, setAccumulatedContent] = useState("");
  const [selectedSavedAssignment, setSelectedSavedAssignment] = useState("");
  const [savedAssignments, setSavedAssignments] = useState<{[key: string]: string}>({});
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [assignmentName, setAssignmentName] = useState("");
  const [emailAddress, setEmailAddress] = useState("jm@analyticphilosophy.ai");
  const [isEmailSending, setIsEmailSending] = useState(false);

  const { toast } = useToast();

  const assignmentsQuery = useQuery<any[]>({
    queryKey: ['/api/assignments'],
    enabled: true
  });
  
  const { data: allAssignments } = assignmentsQuery;

  // Load saved assignments from database on component mount
  useEffect(() => {
    if (allAssignments && allAssignments.length > 0) {
      const saved: {[key: string]: string} = {};
      allAssignments.forEach(assignment => {
        // Show assignments that have a file_name and input_text (database uses snake_case)
        if (assignment.file_name && assignment.input_text) {
          saved[assignment.file_name] = assignment.input_text;
        }
      });
      setSavedAssignments(saved);
    }
  }, [allAssignments]);

  // Word count function
  const calculateWordCount = (text: string) => {
    if (!text) {
      setWordCount(0);
      return;
    }
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  };

  // Function to clean markdown formatting from text
  const cleanMarkdown = (text: string) => {
    return text
      .replace(/#{1,6}\s*/g, '') // Remove all header markers (# ## ### etc)
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
      .replace(/`(.*?)`/g, '$1') // Remove code formatting
      .replace(/^\s*[-*+]\s+/gm, '') // Remove bullet points
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
      .replace(/^\s*>\s+/gm, '') // Remove blockquotes
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links but keep text
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
      .replace(/---+/g, '') // Remove horizontal rules
      .replace(/\*{3,}/g, '') // Remove emphasis markers
      .replace(/_{3,}/g, '') // Remove underline emphasis
      .trim();
  };

  // AI detection function using GPTZero
  const checkAIDetection = async (text: string) => {
    if (!text) return;
    
    setIsCheckingAI(true);
    try {
      const response = await fetch('/api/ai-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setAiDetectionResult(result);
      } else {
        setAiDetectionResult({ error: 'AI detection service unavailable' });
      }
    } catch (error) {
      console.error('AI detection failed:', error);
      setAiDetectionResult({ error: 'AI detection unavailable' });
    } finally {
      setIsCheckingAI(false);
    }
  };

  // Chat with AI function
  const handleChatMessage = async () => {
    if (!chatInput.trim() && !chatFileUpload) return;
    
    const userMessage = { role: 'user', content: chatInput || (chatFileUpload ? `Uploaded file: ${chatFileUpload.name}` : ''), timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    
    const currentChatInput = chatInput;
    const currentFile = chatFileUpload;
    setChatInput("");
    setChatFileUpload(null);
    setIsChatting(true);

    try {
      let response, result;
      
      if (currentFile) {
        // Handle file upload in chat
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('provider', selectedProvider);
        if (currentChatInput) formData.append('message', currentChatInput);
        
        response = await fetch('/api/chat-upload', {
          method: 'POST',
          body: formData,
        });
        result = await response.json();
      } else {
        // Handle text-only chat
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: currentChatInput, 
            provider: selectedProvider,
            context: currentResult ? {
              problem: currentResult.extractedText || inputText,
              solution: currentResult.llmResponse
            } : null
          }),
        });
        result = await response.json();
      }
      
      const aiMessage = { 
        role: 'assistant', 
        content: result.response, 
        timestamp: new Date(),
        extractedText: result.extractedText,
        fileName: result.fileName
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat failed:', error);
      const errorMessage = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatting(false);
    }
  };

  // Handle file upload for chat
  const handleChatFileUpload = (file: File) => {
    setChatFileUpload(file);
  };

  // Send chat response to input box
  const sendToInputBox = (content: string) => {
    setInputText(content);
  };

  // Handle save assignment
  const handleSaveAssignment = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Nothing to save",
        description: "Please enter some content first",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await fetch('/api/save-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText: inputText,
          title: currentAssignmentName || inputText.substring(0, 50) + '...',
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Assignment saved",
          description: "Your assignment has been saved successfully",
        });
        setCurrentAssignmentName("");
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save assignment",
        variant: "destructive",
      });
    }
  };

  // Handle email solution
  const handleEmailSolution = async (email: string, content: string, title: string) => {
    console.log('Email function called with:', { email, content: content?.substring(0, 50), title });
    
    if (!email || !content) {
      toast({
        title: "Missing information",
        description: "Email address and content are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/email-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, content, title }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Email sent",
          description: `Solution sent to ${email}`,
        });
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error: any) {
      toast({
        title: "Email failed",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Critique and rewrite function
  const handleCritiqueRewrite = async () => {
    if (!critiqueText.trim() || !currentResult) return;
    
    setIsRewriting(true);
    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalSolution: currentResult.llmResponse,
          critique: critiqueText,
          provider: selectedProvider,
          problem: currentResult.extractedText || inputText
        }),
      });
      
      const result = await response.json();
      setCurrentResult((prev: any) => ({ ...prev, llmResponse: result.rewrittenSolution }));
      calculateWordCount(result.rewrittenSolution);
      setCritiqueText("");
      toast({
        title: "Solution rewritten",
        description: "The solution has been updated based on your critique",
      });
    } catch (error) {
      console.error('Rewrite failed:', error);
      toast({
        title: "Rewrite failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsRewriting(false);
    }
  };

  const generatePDF = async () => {
    if (!currentResult?.llmResponse) {
      toast({
        title: "No content to export",
        description: "Please generate a solution first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the rendered HTML content from the MathRenderer component
      const solutionElement = document.querySelector('.math-content');
      let htmlContent = '';
      
      if (solutionElement) {
        htmlContent = solutionElement.innerHTML;
      } else {
        // Fallback to plain text if math rendering not available
        htmlContent = currentResult.llmResponse.replace(/\n/g, '<br>');
      }

      // Add problem statement if available
      if (currentResult.extractedText) {
        htmlContent = `<h2>Problem Statement</h2><p>${currentResult.extractedText.replace(/\n/g, '<br>')}</p><h2>Solution</h2>${htmlContent}`;
      }

      const response = await fetch('/api/html-to-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent: htmlContent,
          title: currentAssignmentName || 'Assignment Solution'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Create download link for the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentAssignmentName || 'assignment'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF downloaded successfully",
        description: "High-fidelity PDF with preserved formatting and math notation",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "PDF generation failed",
        description: "Please try again or use copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Chunked processing function
  const processInChunks = async (text: string, provider: string) => {
    const words = text.trim().split(/\s+/);
    
    // Check if we need chunking (more than 1000 words)
    if (words.length <= 1000) {
      // Process normally for small requests
      return;
    }

    setIsChunkedProcessing(true);
    setAccumulatedContent("");
    
    // Calculate chunks
    const chunkSize = 800; // Slightly smaller to leave room for context
    const totalChunks = Math.ceil(words.length / chunkSize);
    setChunkProgress({ current: 0, total: totalChunks });

    let fullResponse = "";

    for (let i = 0; i < totalChunks; i++) {
      const startIdx = i * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, words.length);
      const chunkWords = words.slice(startIdx, endIdx);
      
      setChunkProgress({ current: i + 1, total: totalChunks });

      // Create chunk-specific prompt
      let chunkPrompt;
      if (i === 0) {
        chunkPrompt = `Please write the first part (approximately ${chunkWords.length} words) of: ${text}

This is part 1 of ${totalChunks}. Focus on a strong introduction and the beginning of the main content.`;
      } else if (i === totalChunks - 1) {
        chunkPrompt = `Please write the final part (approximately ${chunkWords.length} words) of: ${text}

This is part ${i + 1} of ${totalChunks}. Focus on conclusions and final thoughts. Here's what has been written so far for context:

${fullResponse.slice(-1000)}...`;
      } else {
        chunkPrompt = `Please write part ${i + 1} of ${totalChunks} (approximately ${chunkWords.length} words) of: ${text}

Continue from where the previous part left off. Here's what has been written so far for context:

${fullResponse.slice(-1000)}...`;
      }

      try {
        const response = await fetch('/api/process-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            inputText: chunkPrompt, 
            inputType: 'text',
            llmProvider: provider 
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          const cleanedResponse = cleanMarkdown(result.llmResponse);
          fullResponse += cleanedResponse + "\n\n";
          const cleanedFullResponse = cleanMarkdown(fullResponse);
          setAccumulatedContent(cleanedFullResponse);
          
          // Update the current result with accumulated content
          setCurrentResult((prev: any) => ({
            ...prev,
            llmResponse: cleanedFullResponse,
            extractedText: text
          }));
          
          calculateWordCount(cleanedFullResponse);
        } else {
          throw new Error(result.error || 'Chunk processing failed');
        }
      } catch (error) {
        console.error(`Chunk ${i + 1} failed:`, error);
        toast({
          title: `Chunk ${i + 1} failed`,
          description: "Continuing with remaining chunks...",
          variant: "destructive",
        });
      }
    }

    setIsChunkedProcessing(false);
    toast({
      title: "Large assignment completed",
      description: `Processed ${totalChunks} chunks successfully`,
    });
  };

  const uploadMutation = useMutation({
    mutationFn: ({ file, provider }: { file: File; provider: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('llmProvider', provider);
      return fetch('/api/upload', {
        method: 'POST',
        body: formData,
      }).then(res => res.json());
    },
    onSuccess: (data) => {
      setCurrentResult(data);
      // Keep the extracted text in the input box so user can save it
      if (data.extractedText) {
        setInputText(data.extractedText);
      }
      calculateWordCount(data.llmResponse);
      checkAIDetection(data.llmResponse);
      toast({
        title: "Assignment processed successfully",
        description: `Solution generated by ${getProviderDisplayName(selectedProvider)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process assignment",
        variant: "destructive",
      });
    },
  });

  const textMutation = useMutation({
    mutationFn: ({ text, provider }: { text: string; provider: string }) => {
      return fetch('/api/process-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          inputText: text, 
          inputType: 'text',
          llmProvider: provider 
        }),
      }).then(res => res.json());
    },
    onSuccess: (data) => {
      // Clean markdown from the response
      const cleanedResponse = cleanMarkdown(data.llmResponse);
      const cleanedData = { ...data, llmResponse: cleanedResponse };
      
      setCurrentResult(cleanedData);
      calculateWordCount(cleanedResponse);
      checkAIDetection(cleanedResponse);
      toast({
        title: "Assignment processed successfully",
        description: `Solution generated by ${getProviderDisplayName(selectedProvider)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process assignment",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract text from file');
      }
      
      const data = await response.json();
      setInputText(data.extractedText);
      
      toast({
        title: "File processed",
        description: "Text extracted and ready for processing",
      });
    } catch (error: any) {
      toast({
        title: "File extraction failed",
        description: error.message || "Could not extract text from file",
        variant: "destructive",
      });
    }
  };

  const handleProcessText = async () => {
    if (!inputText.trim()) {
      toast({
        title: "No content to process",
        description: "Please enter some text or upload a file",
        variant: "destructive",
      });
      return;
    }

    const textToProcess = specialInstructions.trim() 
      ? `${inputText}\n\nSpecial Instructions: ${specialInstructions}`
      : inputText;

    // Check if we need chunked processing
    const words = textToProcess.trim().split(/\s+/);
    if (words.length > 1000) {
      await processInChunks(textToProcess, selectedProvider);
    } else {
      textMutation.mutate({ text: textToProcess, provider: selectedProvider });
    }
  };

  const isProcessing = uploadMutation.isPending || textMutation.isPending || isChunkedProcessing;



  const handlePrint = () => {
    if (!currentResult) return;

    // Create HTML content that preserves mathematical notation
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Assignment Solution</title>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            margin: 1in;
            color: black;
            background: white;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid black;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            font-size: 14pt;
            margin-bottom: 10px;
            color: black;
        }
        .content {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        @media print {
            @page { margin: 1in; }
            body { margin: 0; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Assignment Solution</h1>
        <p>Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>
    
    ${currentResult.extractedText ? `
    <div class="section">
        <h2>Problem:</h2>
        <div class="content">${currentResult.extractedText}</div>
    </div>
    ` : ''}
    
    <div class="section">
        <h2>Solution:</h2>
        <div class="content">${currentResult.llmResponse}</div>
    </div>
</body>
</html>`;

    // Create blob and download as HTML file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assignment_solution_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "HTML file downloaded",
      description: "Open the file and print to PDF to preserve formatting",
    });
  };
  
  const handleCopyToClipboard = () => {
    if (!currentResult) return;
    
    const textToCopy = `${currentAssignmentName ? `Assignment: ${currentAssignmentName}\n\n` : ''}${
      currentResult.extractedText ? `Problem: ${currentResult.extractedText}\n\n` : ''
    }Solution:\n${currentResult.llmResponse}`;
    
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Copied to clipboard",
      description: "Solution copied successfully",
    });
  };

  const clearResult = () => {
    setCurrentResult(null);
    setInputText("");
    setCurrentAssignmentName("");
    setSpecialInstructions("");
  };

  // Save assignment to database
  const saveAssignment = async () => {
    const textToSave = inputText.trim() || currentResult?.extractedText?.trim();
    if (!textToSave) {
      toast({
        title: "Nothing to save",
        description: "Please enter some text or upload a document first",
        variant: "destructive",
      });
      return;
    }
    setShowSaveDialog(true);
  };

  const confirmSave = async () => {
    if (!assignmentName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this assignment",
        variant: "destructive",
      });
      return;
    }

    try {
      const textToSave = inputText.trim() || currentResult?.extractedText?.trim();
      
      const response = await fetch('/api/save-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: assignmentName,
          inputText: textToSave,
          extractedText: textToSave
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save assignment');
      }

      toast({
        title: "Assignment saved",
        description: `Saved as "${assignmentName}"`,
      });
      
      setShowSaveDialog(false);
      setAssignmentName("");
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Load assignment from saved list
  const loadAssignment = (name: string) => {
    if (savedAssignments[name]) {
      setInputText(savedAssignments[name]);
      toast({
        title: "Assignment loaded",
        description: `Loaded "${name}"`,
      });
    }
  };

  // Delete saved assignment
  const deleteAssignment = (name: string) => {
    const updated = { ...savedAssignments };
    delete updated[name];
    setSavedAssignments(updated);
    localStorage.setItem('savedAssignments', JSON.stringify(updated));
    
    toast({
      title: "Assignment deleted",
      description: `Deleted "${name}"`,
    });
  };

  const getProviderDisplayName = (provider: string) => {
    switch (provider) {
      case "anthropic": return "Claude (Anthropic)";
      case "openai": return "GPT (OpenAI)";
      case "perplexity": return "Perplexity";
      default: return provider;
    }
  };



  const handleLoadAssignment = (id: number) => {
    // Load saved assignment logic would go here
    toast({
      title: "Loading assignment",
      description: "This feature is being implemented",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Homework Assistant</h1>
              <p className="text-sm text-slate-600 mt-1">AI-powered assignment solver</p>
            </div>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Claude (Anthropic)</SelectItem>
                <SelectItem value="openai">GPT (OpenAI)</SelectItem>
                <SelectItem value="perplexity">Perplexity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Input Panel */}
          <Card className="flex flex-col">
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-semibold text-slate-900">Assignment Details</h2>
              
              {/* Saved Assignments */}
              {Object.keys(savedAssignments).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Load Saved Assignment
                  </label>
                  <Select 
                    value={selectedSavedAssignment} 
                    onValueChange={(value) => {
                      setSelectedSavedAssignment(value);
                      if (value) {
                        loadAssignment(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a saved assignment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(savedAssignments).map((name) => (
                        <SelectItem key={name} value={name}>
                          <div className="flex items-center justify-between w-full">
                            <span>{name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAssignment(name);
                              }}
                              className="ml-2 h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Main Question Input */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Enter Your Question or Problem
                </label>
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleProcessText();
                    }
                  }}
                  placeholder="Type or paste your homework question here... (Enter to solve, Shift+Enter for new line)"
                  className="min-h-[200px] resize-none w-full text-base"
                  disabled={isProcessing}
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Or Upload Document/Image
                </label>
                <FileUpload 
                  onFileSelect={handleFileSelect}
                  isProcessing={isProcessing}
                />
              </div>

              {/* Special Instructions - Collapsed by default */}
              <details className="group">
                <summary className="text-sm font-medium text-slate-700 cursor-pointer hover:text-slate-900">
                  Special Instructions (Optional)
                </summary>
                <div className="mt-2">
                  <Textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Add any special instructions for solving this problem..."
                    className="min-h-[80px] resize-none w-full"
                  />
                </div>
              </details>

              {/* Save Assignment - Always Visible */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Save This Assignment</h3>
                <div className="flex space-x-2">
                  <Input
                    value={currentAssignmentName}
                    onChange={(e) => setCurrentAssignmentName(e.target.value)}
                    placeholder="Enter assignment title..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveAssignment();
                      }
                    }}
                  />
                  <Button
                    onClick={async () => {
                      if (!inputText.trim()) {
                        toast({
                          title: "Nothing to save",
                          description: "Please enter some content first",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      try {
                        const response = await fetch('/api/save-assignment', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            inputText: inputText,
                            title: currentAssignmentName || inputText.substring(0, 50) + '...',
                            specialInstructions: specialInstructions
                          }),
                        });
                        
                        if (response.ok) {
                          toast({
                            title: "Assignment saved",
                            description: "You can now reuse this assignment anytime",
                          });
                          setCurrentAssignmentName(""); // Clear the name field after saving
                        } else {
                          throw new Error('Failed to save');
                        }
                      } catch (error) {
                        toast({
                          title: "Save failed",
                          description: "Could not save assignment",
                          variant: "destructive",
                        });
                      }
                    }}
                    variant="outline"
                    size="sm"
                    disabled={!inputText.trim()}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6 mt-auto">
              <div className="flex gap-2">
                <Button 
                  onClick={handleProcessText}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Solve This Problem
                    </>
                  )}
                </Button>
              </div>
              
              <div className="mt-3 text-center">
                <p className="text-xs text-slate-500">
                  Direct passthrough to <span className="font-medium">{getProviderDisplayName(selectedProvider)}</span> • No interference
                </p>
              </div>
            </div>
          </Card>

          {/* Solution Panel */}
          <Card className="flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Solution</h2>
              
              {currentResult && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrint}
                    title="Print/Save as PDF"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyToClipboard}
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearResult}
                    title="Clear results"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              {isProcessing && !accumulatedContent && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                    {isChunkedProcessing ? (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-600">
                          Processing large assignment with {getProviderDisplayName(selectedProvider)}...
                        </p>
                        <p className="text-xs text-slate-500">
                          Chunk {chunkProgress.current} of {chunkProgress.total}
                        </p>
                        <div className="w-64 bg-slate-200 rounded-full h-2 mx-auto">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(chunkProgress.current / chunkProgress.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400">
                          Results will appear as each chunk completes
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">
                        Processing with {getProviderDisplayName(selectedProvider)}...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Show accumulated content during chunked processing */}
              {isChunkedProcessing && accumulatedContent && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Problem:
                    </h3>
                    <p className="text-sm text-blue-800 font-mono bg-white p-3 rounded border">
                      Large assignment being processed in chunks...
                    </p>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2 text-emerald-500" />
                        Solution <span className="text-sm text-slate-500 ml-2">(In Progress - Chunk {chunkProgress.current} of {chunkProgress.total})</span>
                      </h3>
                      <div className="w-32 bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(chunkProgress.current / chunkProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <MathRenderer 
                        content={accumulatedContent}
                        className="space-y-4 math-content pr-12"
                      />
                    </div>
                  </div>
                </div>
              )}

              {!currentResult && !isProcessing && (
                <div className="flex items-center justify-center h-64 text-center">
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <Lightbulb className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Ready to solve</p>
                      <p className="text-xs text-slate-500 mt-1">Enter your question and click "Solve This Problem"</p>
                    </div>
                  </div>
                </div>
              )}

              {currentResult && !isProcessing && (
                <div className="space-y-6">
                  {currentResult.extractedText && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                        <Lightbulb className="w-4 h-4 mr-2" />
                        Problem:
                      </h3>
                      <p className="text-sm text-blue-800 font-mono bg-white p-3 rounded border">{currentResult.extractedText}</p>
                    </div>
                  )}
                  
                  <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm min-h-[500px]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2 text-emerald-500" />
                        Solution
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={async () => {
                            if (!currentResult?.llmResponse) {
                              toast({
                                title: "No solution to email",
                                description: "Please generate a solution first",
                                variant: "destructive",
                              });
                              return;
                            }

                            setIsEmailSending(true);
                            try {
                              const response = await fetch('/api/email-solution', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  email: emailAddress,
                                  solution: currentResult.llmResponse,
                                  assignmentTitle: currentAssignmentName || 'Assignment Solution'
                                }),
                              });

                              if (response.ok) {
                                toast({
                                  title: "Email sent successfully",
                                  description: `Solution sent to ${emailAddress}`,
                                });
                              } else {
                                const error = await response.json();
                                throw new Error(error.error || 'Failed to send email');
                              }
                            } catch (error: any) {
                              toast({
                                title: "Email failed",
                                description: error.message || "Could not send email",
                                variant: "destructive",
                              });
                            } finally {
                              setIsEmailSending(false);
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-slate-900"
                          title="Email solution"
                          disabled={isEmailSending}
                        >
                          {isEmailSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          onClick={generatePDF}
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-slate-900"
                          title="Download as PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={handleCopyToClipboard}
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-slate-900"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>


                    
                    <div className="relative mb-6 max-h-[400px] overflow-y-auto">
                      <MathRenderer 
                        content={currentResult.llmResponse}
                        className="space-y-4 math-content"
                      />
                    </div>
                    

                  </div>
                </div>
              )}
            </div>

            {/* Critique & Rewrite Section */}
            {currentResult && (
              <div className="p-6 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Critique & Rewrite</h3>
                <div className="space-y-3">
                  <Textarea
                    value={critiqueText}
                    onChange={(e) => setCritiqueText(e.target.value)}
                    placeholder="Describe what you'd like changed or improved in the solution..."
                    className="min-h-[80px] resize-none"
                  />
                  <Button
                    onClick={handleCritiqueRewrite}
                    disabled={isRewriting || !critiqueText.trim()}
                    size="sm"
                    className="w-full"
                  >
                    {isRewriting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Rewriting...
                      </>
                    ) : (
                      'Rewrite Solution'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {currentResult && (
              <div className="px-6 py-3 bg-slate-50 rounded-b-xl border-t border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-emerald-500 mr-1" />
                      Processed successfully
                    </span>
                    <span>Response time: {(currentResult.processingTime / 1000).toFixed(1)}s</span>
                    <span>Words: {wordCount}</span>
                    {isCheckingAI && <span>Checking AI...</span>}
                    {aiDetectionResult && !isCheckingAI && (
                      <span className={`font-medium ${
                        aiDetectionResult.error 
                          ? 'text-gray-500' 
                          : aiDetectionResult.documents?.[0]?.average_generated_prob > 0.5 
                            ? 'text-red-600' 
                            : 'text-green-600'
                      }`}>
                        {aiDetectionResult.error 
                          ? 'AI check failed' 
                          : `${Math.round((aiDetectionResult.documents?.[0]?.average_generated_prob || 0) * 100)}% AI detected`
                        }
                      </span>
                    )}
                  </div>
                  <span>Solved by {getProviderDisplayName(selectedProvider)}</span>
                </div>
              </div>
            )}
          </Card>
        </div>



        {/* AI Chat Section */}
        <div className="mt-8">
          <Card className="flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Chat with AI</h2>
              <p className="text-sm text-slate-600 mt-1">Ask questions about the solution, discuss the assignment, or chat freely</p>
            </div>

            <div className="flex-1 p-6 min-h-[400px] flex flex-col">
              <div className="flex-1 mb-4 p-4 bg-gray-50 rounded-lg overflow-y-auto max-h-80">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.126-.964L3 20l1.036-5.874A8.955 8.955 0 013 12a8 8 0 018-8c4.418 0 8 3.582 8 8z" />
                      </svg>
                    </div>
                    <p className="text-sm">Start a conversation with {getProviderDisplayName(selectedProvider)}</p>
                    <p className="text-xs mt-1">Ask about the solution, request explanations, or chat about anything</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map((message, index) => (
                      <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white border border-slate-200'
                        }`}>
                          <MathRenderer content={message.content} />
                          {message.role === 'assistant' && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendToInputBox(message.content)}
                                className="text-xs"
                              >
                                <ArrowDown className="w-3 h-3 mr-1" />
                                Send to Input
                              </Button>
                              {message.extractedText && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => sendToInputBox(message.extractedText)}
                                  className="text-xs"
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  Send File Text
                                </Button>
                              )}
                            </div>
                          )}
                          <div className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                            {message.fileName && (
                              <span className="ml-2">📎 {message.fileName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isChatting && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 p-3 rounded-lg">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                {chatFileUpload && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800">{chatFileUpload.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setChatFileUpload(null)}
                      className="ml-auto h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask the AI anything or upload a file..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatMessage();
                      }
                    }}
                    disabled={isChatting}
                  />
                  <FileUpload
                    onFileSelect={handleChatFileUpload}
                    isProcessing={isChatting}
                    accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleChatMessage}
                    disabled={isChatting || (!chatInput.trim() && !chatFileUpload)}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Save Assignment Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Save Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Assignment Title</label>
              <Input
                value={assignmentName}
                onChange={(e) => setAssignmentName(e.target.value)}
                placeholder="Enter a descriptive title for this assignment..."
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Question or Problem</label>
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type or paste your homework question here..."
                className="min-h-[120px] resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Upload Document (Optional)</label>
              <FileUpload
                onFileSelect={(file) => {
                  // Handle file upload in the dialog
                  const formData = new FormData();
                  formData.append('file', file);
                  
                  fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.extractedText) {
                      setInputText(data.extractedText);
                      toast({
                        title: "File processed",
                        description: "Text extracted and added to the assignment",
                      });
                    }
                  })
                  .catch(error => {
                    toast({
                      title: "Upload failed",
                      description: "Could not process the file",
                      variant: "destructive",
                    });
                  });
                }}
                accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Special Instructions (Optional)</label>
              <Textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Add any special instructions for solving this problem..."
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSave} disabled={!assignmentName.trim()}>
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}