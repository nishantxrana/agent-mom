import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, Loader2 } from 'lucide-react';

const AuthSuccess = ({ onLogin }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      toast.error(`Authentication failed: ${error}`);
      navigate('/login');
      return;
    }

    if (token) {
      onLogin(token);
      toast.success('Successfully signed in!');
      navigate('/');
    } else {
      toast.error('No authentication token received');
      navigate('/login');
    }
  }, [searchParams, onLogin, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <CheckCircle className="h-16 w-16 text-success-500 mx-auto mb-4" />
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Authentication Successful
        </h2>
        <p className="text-gray-600">
          Redirecting you to the application...
        </p>
      </div>
    </div>
  );
};

export default AuthSuccess;
