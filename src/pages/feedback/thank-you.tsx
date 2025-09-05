import React from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, MessageCircle } from 'lucide-react';

const ThankYouPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Thank You!
            </h1>
            <p className="text-gray-600 text-lg">
              Your feedback has been received and is greatly appreciated.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-center mb-2">
                <MessageCircle className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">
                  What happens next?
                </span>
              </div>
              <p className="text-sm text-blue-700">
                Your feedback will be analyzed by our AI system and used to improve our services. 
                We may reach out if we need any clarification.
              </p>
            </div>

            <div className="flex flex-col space-y-3">
              <Button
                onClick={() => router.push('/')}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Homepage
              </Button>
              
              <Button
                onClick={() => window.close()}
                variant="outline"
                className="w-full"
              >
                Close Window
              </Button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Powered by NoteX • Secure feedback collection
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThankYouPage;