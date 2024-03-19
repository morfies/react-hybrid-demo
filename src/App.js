import React from 'react';
import User from './User';
function App() {
  return (
    <div className='App'>
      <header className='App-header'>
        <p>Home Page</p>
      </header>
      <React.Suspense fallback={<div>Loading</div>}>
        <User />
      </React.Suspense>
    </div>
  );
}

export default App;
