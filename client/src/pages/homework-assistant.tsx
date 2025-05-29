import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from '@/components/ui/file-upload';
import { MathRenderer } from '@/components/ui/math-renderer';
import { useLLMProcessor } from '@/hooks/use-llm';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, 
  Upload, 
  Keyboard, 
  Send, 
  Copy, 
  Printer, 
  Trash2, 
  Settings,
  Lightbulb,
  CheckCircle,
  Loader2
} from 'lucide-react';

export default function HomeworkAssistant() {
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const { toast } = useToast();
  
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

  const handlePrint = () => {
    window.print();
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

  if (error) {
    toast({
      title: "Processing Error",
      description: error instanceof Error ? error.message : "An error occurred",
      variant: "destructive",
    });
  }

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
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>Upload File</span>
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex items-center space-x-2">
                    <Keyboard className="w-4 h-4" />
                    <span>Type Text</span>
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
              </Tabs>
            </div>

            <div className="p-6 mt-auto">
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
                    onClick={handleCopyToClipboard}
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrint}
                    title="Print / Save as PDF"
                  >
                    <Printer className="w-4 h-4" />
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

            <div className="flex-1 p-6 overflow-y-auto">
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
                <div className="space-y-6">
                  {currentResult.extractedText && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h3 className="text-sm font-semibold text-slate-900 mb-2">Extracted Text:</h3>
                      <p className="text-sm text-slate-700">{currentResult.extractedText}</p>
                    </div>
                  )}
                  
                  <MathRenderer 
                    content={currentResult.llmResponse}
                    className="space-y-4"
                  />
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
