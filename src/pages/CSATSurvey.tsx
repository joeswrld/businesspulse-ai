import React from 'react';
import { useParams } from 'react-router-dom';
import CSATForm from '@/components/forms/CSATForm';

const CSATSurvey: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <CSATForm
          projectId={projectId}
          title="Customer Satisfaction Survey"
          greetingText="How satisfied are you with our service? Your feedback helps us improve."
          color="#3B82F6"
          onSuccess={(data) => {
            console.log('CSAT feedback submitted:', data);
          }}
        />
      </div>
    </div>
  );
};

export default CSATSurvey;