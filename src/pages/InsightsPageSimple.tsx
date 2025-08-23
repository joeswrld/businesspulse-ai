import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Upload, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsageTracking } from '@/hooks/useUsageTracking';

const InsightsPageSimple: React.FC = () => {
  const { user } = useAuth();
  const { trackUsage } = useUsageTracking();
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Track usage
      await trackUsage('insights');
      
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock analysis result
      setAnalysisResult({
        summary: "This is a sample analysis of your input text.",
        sentiment: "positive",
        keyThemes: ["Theme 1", "Theme 2", "Theme 3"],
        suggestedActions: ["Action 1", "Action 2"]
      });
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Analytics</h1>
        <p className="text-muted-foreground">
          Analyze your data with AI-powered insights
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Input Data</span>
            </CardTitle>
            <CardDescription>
              Enter text or upload a file for AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter your text here for AI analysis..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={8}
            />
            
            <div className="flex space-x-2">
              <Button
                onClick={handleAnalyze}
                disabled={!inputText.trim() || isAnalyzing}
                className="flex-1"
              >
                {isAnalyzing ? (
                  <>
                    <Brain className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
              
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Analysis Results</span>
            </CardTitle>
            <CardDescription>
              AI-generated insights and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analysisResult ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {analysisResult.summary}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Key Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.keyThemes.map((theme: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Suggested Actions</h4>
                  <ul className="space-y-1">
                    {analysisResult.suggestedActions.map((action: string, index: number) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        • {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter text and click analyze to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InsightsPageSimple;