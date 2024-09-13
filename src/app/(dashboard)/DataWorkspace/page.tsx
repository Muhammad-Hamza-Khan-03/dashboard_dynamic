"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useUser, SignIn, UserButton } from "@clerk/nextjs";

const DataAnalysisWorkspace = dynamic(() => import('./DataAnalysisWorkspace'), {
  loading: () => <p>Loading Data Analysis Workspace...</p>,
  ssr: false
});

const Workspace = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [userId, setUserId] = useState<string>();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setUserId(user.id);
    }
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Please sign in to access the Data Analysis Tool</h1>
        <SignIn />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Data Analysis Tool</h1>
        <UserButton />
      </div>
      {userId ? (
        <DataAnalysisWorkspace userId={userId} />
      ) : (
        <p>Loading user data...</p>
      )}
    </div>
  );
};

export default Workspace;