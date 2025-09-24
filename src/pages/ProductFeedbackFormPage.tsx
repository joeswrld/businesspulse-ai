import React from 'react';
import ProductFeedbackForm from '@/components/forms/ProductFeedbackForm';

const ProductFeedbackFormPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <ProductFeedbackForm />
      </div>
    </div>
  );
};

export default ProductFeedbackFormPage;