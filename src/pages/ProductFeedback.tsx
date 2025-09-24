import React from 'react';
import { useParams } from 'react-router-dom';
import ProductFeedbackForm from '@/components/forms/ProductFeedbackForm';

const ProductFeedback: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <ProductFeedbackForm
          projectId={projectId}
          title="Product Feedback Form"
          greetingText="Help us improve our product by sharing your thoughts and suggestions"
          color="#10B981"
          onSuccess={(data) => {
            console.log('Product feedback submitted:', data);
          }}
        />
      </div>
    </div>
  );
};

export default ProductFeedback;