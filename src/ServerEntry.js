import React from 'react';
import { StaticRouter } from 'react-router-dom/server';
import Shell from './components/Shell';
import App from './App';

function ServerEntry({ url }) {
  return (
    <Shell>
      <React.StrictMode>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </React.StrictMode>
    </Shell>
  );
}
export default ServerEntry;
