import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InputForm from './components/InputForm';
import Dashboard from './components/Dashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 min cache
      gcTime: 1000 * 60 * 30,    // 30 min garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [userData, setUserData] = useState(null);

  const handleFormSubmit = (data) => {
    setUserData(data);
  };

  const handleGoBack = () => {
    setUserData(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        {!userData ? (
          <InputForm onSubmit={handleFormSubmit} />
        ) : (
          <Dashboard userData={userData} onGoBack={handleGoBack} />
        )}
      </div>
    </QueryClientProvider>
  );
}

export default App;
