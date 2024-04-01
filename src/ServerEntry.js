import React from 'react';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';

function ServerEntry({ url }) {
  return (
    <React.StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </React.StrictMode>
  );
}
export default ServerEntry;
