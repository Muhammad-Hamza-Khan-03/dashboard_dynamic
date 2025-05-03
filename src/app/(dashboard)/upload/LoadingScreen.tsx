import React, { useEffect, useState } from 'react';
import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
  showProgressBar?: boolean;
  logo?: string;
  accentColor?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading your data, please wait...",
  showProgressBar = true,
  logo,
  accentColor = "#3b82f6" // blue-500 by default
}) => {
  const [progress, setProgress] = useState(0);
  
  // Simulate progress for visual feedback
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        // Gradually increment but never reach 100% until actual loading completes
        return prevProgress < 90 ? prevProgress + Math.random() * 10 : prevProgress;
      });
    }, 800);
    
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-50 bg-opacity-90 backdrop-blur-sm z-50 flex flex-col items-center justify-center transition-all duration-300 ease-in-out">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md text-center transform transition-all duration-500 animate-fadeIn">
        {logo && (
          <div className="mb-6 transform transition-all duration-700 animate-bounce-subtle">
            <img src={logo} alt="Company Logo" className="h-16 mx-auto" />
          </div>
        )}
        
        <div className="relative">
          <Loader2 
            style={{ color: accentColor }} 
            className="h-12 w-12 animate-spin mx-auto mb-6" 
          />
          <div className="absolute inset-0 bg-white bg-opacity-0 rounded-full animate-pulse" />
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Please Wait</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        
        {showProgressBar && (
          <div className="mt-6">
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                 className="h-2 rounded-full transition-all duration-300 ease-out"
                 style={{ 
                  width: `${progress}%`,
                  backgroundColor: accentColor,
                  boxShadow: `0 0 10px ${accentColor}80` 
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{Math.round(progress)}% complete</p>
          </div>
        )}
      </div>
    </div>
  );
};


export default LoadingScreen;