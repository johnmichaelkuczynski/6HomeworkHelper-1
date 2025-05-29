import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from '@/components/ui/file-upload';
import { MathRenderer } from '@/components/ui/math-renderer';
import { useLLMProcessor } from '@/hooks/use-llm';
import { useToast } from '@/hooks/use-toast';
import { emailSolution, getAllAssignments, getAssignment } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { 
  GraduationCap, 
  Upload, 
  Keyboard, 
  Send, 
  Copy, 
  Trash2, 
  Settings,
  Lightbulb,
  CheckCircle,
  Mail,
  Loader2,
  Save,
  Printer,
  History,
  Clock
} from 'lucide-react';

export default function HomeworkAssistant() {
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [userEmail, setUserEmail] = useState('jm@analyticphilosophy.ai');
  const [isEmailSending, setIsEmailSending] = useState(false);
  const { toast } = useToast();

  // Query for saved assignments
  const { data: savedAssignments, refetch: refetchAssignments } = useQuery({
    queryKey: ['/api/assignments'],
    queryFn: getAllAssignments,
    refetchInterval: 2000, // Refetch every 2 seconds
  });
  
  const {
    currentResult,
    uploadFile,
    processText,
    clearResult,
    isProcessing,
    error
  } = useLLMProcessor();

  const handleFileSelect = (file: File) => {
    uploadFile({ file, provider: selectedProvider });
    // Refresh saved assignments after processing
    setTimeout(() => refetchAssignments(), 1000);
  };

  const handleProcessText = () => {
    if (!inputText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to process",
        variant: "destructive",
      });
      return;
    }
    processText({ text: inputText, provider: selectedProvider });
    // Refresh saved assignments after processing
    setTimeout(() => refetchAssignments(), 1000);
  };

  const handleCopyToClipboard = async () => {
    if (currentResult?.llmResponse) {
      try {
        await navigator.clipboard.writeText(currentResult.llmResponse);
        toast({
          title: "Copied!",
          description: "Solution copied to clipboard",
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to copy to clipboard",
          variant: "destructive",
        });
      }
    }
  };



  const handleClearResults = () => {
    clearResult();
    setInputText('');
  };

  const getProviderDisplayName = (provider: string) => {
    switch (provider) {
      case 'anthropic': return 'Anthropic Claude';
      case 'openai': return 'OpenAI GPT';
      case 'perplexity': return 'Perplexity';
      default: return provider;
    }
  };

  // Handle errors with useEffect to avoid render loop
  useEffect(() => {
    if (error) {
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handlePrint = () => {
    if (!currentResult) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // Create the HTML content
    printWindow.document.write('<!DOCTYPE html>');
    printWindow.document.write('<html><head>');
    printWindow.document.write('<title>Homework Solution</title>');
    printWindow.document.write('<script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>');
    printWindow.document.write('<script>window.MathJax = {tex: {inlineMath: [["$", "$"], ["\\\\(", "\\\\)"]], displayMath: [["$$", "$$"], ["\\\\[", "\\\\]"]], processEscapes: true, packages: ["base", "ams", "newcommand", "html"]}, options: {processHtmlClass: "math-content"}, startup: {ready: function () {MathJax.startup.defaultReady(); MathJax.startup.promise.then(function () {console.log("MathJax initial typesetting complete");});}}}</script>');
    printWindow.document.write('<script id="MathJax-script" src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>');
    printWindow.document.write('<style>body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #000; background: white; } h1, h2, h3 { color: #000; margin-bottom: 10px; font-weight: bold; } .problem-section { margin-bottom: 20px; padding: 15px; border-left: 3px solid #3b82f6; background: #f8fafc; } .solution-section { margin-top: 20px; } .math-content { font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; } @media print { body { font-size: 12px; margin: 15px; } .math-content { overflow: visible; word-break: break-word; } }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>Homework Solution</h1>');
    
    if (currentResult.extractedText) {
      printWindow.document.write('<div class="problem-section">');
      printWindow.document.write('<h2>Problem:</h2>');
      printWindow.document.write('<p>' + currentResult.extractedText + '</p>');
      printWindow.document.write('</div>');
    }
    
    printWindow.document.write('<div class="solution-section">');
    printWindow.document.write('<h2>Solution:</h2>');
    printWindow.document.write('<div class="math-content">');
    printWindow.document.write(currentResult.llmResponse || '');
    printWindow.document.write('</div>');
    printWindow.document.write('</div>');
    
    printWindow.document.write('<script>window.onload = function() { if (window.MathJax) { MathJax.startup.promise.then(() => { return MathJax.typesetPromise(); }).then(() => { setTimeout(() => window.print(), 3000); }); } else { setTimeout(() => window.print(), 2000); } };</script>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
  };

  const handleEmailSolution = async () => {
    if (!currentResult) return;
    
    if (!userEmail || !userEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsEmailSending(true);
    try {
      await emailSolution({
        email: userEmail,
        extractedText: currentResult.extractedText || '',
        llmResponse: currentResult.llmResponse,
        provider: selectedProvider,
      });
      
      toast({
        title: "Email Sent!",
        description: `Solution sent to ${userEmail} successfully.`,
      });
      
      setUserEmail(''); // Clear email field after success
    } catch (error) {
      toast({
        title: "Email Failed",
        description: error instanceof Error ? error.message : "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setIsEmailSending(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Nothing to Save",
        description: "Please enter some text before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extractedText: inputText,
          llmProvider: selectedProvider,
          llmResponse: currentResult?.llmResponse || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save assignment');
      }

      toast({
        title: "Assignment Saved!",
        description: "Your assignment has been saved successfully.",
      });

      refetchAssignments();
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save assignment",
        variant: "destructive",
      });
    }
  };

  const handleLoadAssignment = async (id: number) => {
    try {
      const assignment = await getAssignment(id);
      if (assignment) {
        // Use the LLM processor's setResult function if available, otherwise simulate loading
        // For now, we'll reload the page with the assignment data by using window location
        window.location.href = `${window.location.origin}${window.location.pathname}?assignment=${assignment.id}`;
      }
    } catch (error) {
      toast({
        title: "Loading Failed",
        description: error instanceof Error ? error.message : "Failed to load assignment",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">Perfect Homework Assistant</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                  <SelectItem value="openai">OpenAI GPT</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-8rem)]">
          
          {/* Input Panel */}
          <Card className="flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Input Assignment</h2>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upload" className="flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>Upload File</span>
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex items-center space-x-2">
                    <Keyboard className="w-4 h-4" />
                    <span>Type Text</span>
                  </TabsTrigger>
                  <TabsTrigger value="saved" className="flex items-center space-x-2">
                    <History className="w-4 h-4" />
                    <span>Saved</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <FileUpload 
                    onFileSelect={handleFileSelect}
                    isProcessing={isProcessing}
                  />
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type or paste your homework question here..."
                    className="min-h-40 resize-none"
                    disabled={isProcessing}
                  />
                </TabsContent>

                <TabsContent value="saved" className="space-y-4">
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {savedAssignments && savedAssignments.length > 0 ? (
                      savedAssignments.map((assignment: any) => (
                        <div 
                          key={assignment.id}
                          className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => handleLoadAssignment(assignment.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Clock className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-600">
                                  {new Date(assignment.createdAt).toLocaleDateString()} at {new Date(assignment.createdAt).toLocaleTimeString()}
                                </span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {assignment.llmProvider}
                                </span>
                              </div>
                              <p className="text-sm text-slate-800 line-clamp-2">
                                {assignment.extractedText 
                                  ? assignment.extractedText.substring(0, 100) + (assignment.extractedText.length > 100 ? '...' : '')
                                  : assignment.fileName || 'Assignment'
                                }
                              </p>
                              <div className="flex items-center mt-2 text-xs text-slate-500">
                                <span>Response time: {(assignment.processingTime / 1000).toFixed(1)}s</span>
                                {assignment.fileName && (
                                  <span className="ml-3">File: {assignment.fileName}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No saved assignments yet.</p>
                        <p className="text-sm">Process an assignment to see it here.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="p-6 mt-auto">
              <div className="space-y-3">
                <Button 
                  onClick={handleProcessText}
                  disabled={isProcessing || (activeTab === 'text' && !inputText.trim())}
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
                      Process Assignment
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSaveAssignment}
                  disabled={!inputText.trim()}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Assignment
                </Button>
              </div>
              
              <div className="mt-3 text-center">
                <p className="text-xs text-slate-500">
                  Direct passthrough to <span className="font-medium">{getProviderDisplayName(selectedProvider)}</span> • No interference
                </p>
              </div>
            </div>
          </Card>

          {/* Results Panel */}
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
                    <Printer className="w-4 h-4" />
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
                    onClick={handleClearResults}
                    title="Clear results"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto max-h-none">
              {/* Loading State */}
              {isProcessing && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                    <p className="text-sm text-slate-600">
                      Processing with {getProviderDisplayName(selectedProvider)}...
                    </p>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!currentResult && !isProcessing && (
                <div className="flex items-center justify-center h-full text-center">
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <Lightbulb className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Ready to solve</p>
                      <p className="text-xs text-slate-500 mt-1">Upload or type your assignment to get started</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Content */}
              {currentResult && !isProcessing && (
                <div className="space-y-6 print-content">
                  {currentResult.extractedText && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                        <Lightbulb className="w-4 h-4 mr-2" />
                        Problem:
                      </h3>
                      <p className="text-sm text-blue-800 font-mono bg-white p-3 rounded border">{currentResult.extractedText}</p>
                    </div>
                  )}
                  
                  <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-emerald-500" />
                      Solution
                    </h3>
                    <MathRenderer 
                      content={currentResult.llmResponse}
                      className="space-y-4 math-content"
                    />
                    
                    {/* Action Buttons */}
                    <div className="mt-6 pt-4 border-t border-slate-200">
                      <div className="flex flex-col space-y-3">
                        {/* Email Section */}
                        <div className="flex items-center space-x-2">
                          <Input
                            type="email"
                            placeholder="Enter your email address"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            className="flex-1"
                            disabled={isEmailSending}
                          />
                          <Button
                            onClick={handleEmailSolution}
                            disabled={isEmailSending || !userEmail.trim()}
                            variant="outline"
                            size="sm"
                          >
                            {isEmailSending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Mail className="w-4 h-4 mr-2" />
                                Email Solution
                              </>
                            )}
                          </Button>
                        </div>
                        
                        {/* Other Action Buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePrint}
                              title="Download as PDF"
                            >
                              <Printer className="w-4 h-4 mr-2" />
                              Download PDF
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCopyToClipboard}
                              title="Copy to clipboard"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearResult}
                            title="Clear results"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Bar */}
            {currentResult && (
              <div className="px-6 py-3 bg-slate-50 rounded-b-xl border-t border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-emerald-500 mr-1" />
                      Processed successfully
                    </span>
                    <span>Response time: {(currentResult.processingTime / 1000).toFixed(1)}s</span>
                  </div>
                  <span>Solved by {getProviderDisplayName(selectedProvider)}</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
