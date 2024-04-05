import * as React from 'react';
import { StaticRouter } from 'react-router-dom/server';

import App from './App';

function ServerEntry({ url }: { url: string }) {
  return (
    <React.StrictMode>
      {/* server-side we need to use this StaticRouter with optional location prop to access MPA */}
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </React.StrictMode>
  );
}
export default ServerEntry;
