import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Star, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProjectValidation {
  is_valid: boolean;
  error_message: string;
  is_available: boolean;
  taken_by_email: string;
  taken_by_user_id: string;
}

const CSATForm: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  
  const [rating, setRating] = useState<string>('');
  const [email, setEmail] = useState('');
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (projectId) {
      validateProject();
    }
  }, [projectId]);

  const validateProject = async () => {
    if (!projectId) return;
    
    try {
      setIsValidating(true);
      
      // Use the validate_project_id function
      const { data, error } = await supabase
        .rpc('validate_project_id', {
          current_user_id: '', // No user context needed for public forms
          project_id_param: projectId
        });

      if (error) {
        console.error('Validation error:', error);
        setValidationError('Failed to validate project ID');
        return;
      }

      if (data && data.length > 0) {
        const validation = data[0] as ProjectValidation;
        if (validation.is_valid) {
          setIsValid(true);
        } else {
          setValidationError(validation.error_message || 'Invalid Project ID');
        }
      } else {
        setValidationError('Invalid Project ID');
      }
    } catch (error) {
      console.error('Error validating project:', error);
      setValidationError('Failed to validate project ID');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rating) {
      toast({
        title: 'Rating Required',
        description: 'Please select a satisfaction rating',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          project_id: projectId!,
          email: email.trim() || null,
          message: `CSAT Rating: ${rating}/5${comments ? `\n\nComments: ${comments}` : ''}`,
          page_url: window.location.href,
          browser: navigator.userAgent
        });

      if (error) {
        console.error('Error submitting feedback:', error);
        throw error;
      }

      setIsSubmitted(true);
      toast({
        title: 'Thank you!',
        description: 'Your feedback has been submitted successfully.',
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validating project...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-xl">Invalid Project ID</CardTitle>
            <CardDescription>
              {validationError || 'The project ID you provided is not valid.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
              variant="outline"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-xl">Thank You!</CardTitle>
            <CardDescription>
              Your customer satisfaction feedback has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                setRating('');
                setEmail('');
                setComments('');
                setIsSubmitted(false);
              }} 
              className="w-full"
            >
              Submit Another Response
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-primary mr-2" />
            <CardTitle className="text-2xl">Customer Satisfaction Survey</CardTitle>
          </div>
          <CardDescription>
            Help us improve by sharing your experience
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">
                How satisfied are you with our service? *
              </Label>
              <RadioGroup value={rating} onValueChange={setRating} className="flex justify-center">
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <div key={value} className="flex flex-col items-center">
                      <Label
                        htmlFor={`rating-${value}`}
                        className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <RadioGroupItem
                          value={value.toString()}
                          id={`rating-${value}`}
                          className="sr-only"
                        />
                        <div className="w-12 h-12 rounded-full border-2 border-muted-foreground/25 flex items-center justify-center hover:border-primary transition-colors">
                          <Star 
                            className={`h-6 w-6 ${
                              rating && parseInt(rating) >= value 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-muted-foreground'
                            }`} 
                          />
                        </div>
                        <span className="text-sm text-muted-foreground mt-1">{value}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Very Dissatisfied</span>
                <span>Very Satisfied</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Additional Comments (optional)</Label>
              <Textarea
                id="comments"
                placeholder="Tell us more about your experience..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <Button 
              type="submit" 
              disabled={!rating || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CSATForm;