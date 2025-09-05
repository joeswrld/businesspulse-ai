import React from 'react';
import { RealtimeTest } from '@/components/RealtimeTest';

const RealtimeTestPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Real-time Feedback Test</h1>
        <p className="text-gray-600 mt-2">
          Test the real-time feedback system to verify notifications and badge updates work correctly.
        </p>
      </div>
      <RealtimeTest />
    </div>
  );
};

export default RealtimeTestPage;