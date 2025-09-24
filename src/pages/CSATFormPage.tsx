import React from 'react';
import CSATForm from '@/components/forms/CSATForm';

const CSATFormPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <CSATForm />
      </div>
    </div>
  );
};

export default CSATFormPage;