import * as React from 'react';
import { useContext, useState } from 'react';
import { renderToString } from 'react-dom/server';
import type { PassThrough } from 'stream';
import { isServer } from '@tanstack/react-query';

const Context = React.createContext<{
  useServerInsertedHTML: (fn: () => React.ReactElement) => void;
}>({ useServerInsertedHTML: () => {} });

export function StreamableContext({
  children,
  hydratedStream,
  reactStream,
}: {
  children: React.ReactNode;
  hydratedStream: PassThrough;
  reactStream: PassThrough;
}) {
  const [useServerInsertedHTML] = useState(() => {
    // we intercept the original reactStream(without data) and inject our resolved data to new stream
    reactStream.on('data', (buffer) => {
      callbacks.forEach((fn) => {
        // scriptElement is the jsx element returned by useServerInsertedHTML callback inside ReactQueryStreamedHydration
        const scriptElement = fn();
        if (!scriptElement) return;
        // order matters!! 1. we need to write the data back first
        hydratedStream.write(renderToString(scriptElement));
      });
      // 2. then write back react rendered html.
      // Otherwise, client don't know our data has hydrated successfully and try csr(api calling) to get data
      hydratedStream.write(buffer);
    });
    reactStream.on('end', () => hydratedStream.end());

    const callbacks = new Set<() => React.ReactElement>();
    return (fn: () => React.ReactElement) => callbacks.add(fn);
  });

  return (
    <Context.Provider value={{ useServerInsertedHTML }}>
      {children}
    </Context.Provider>
  );
}

// this fn is called once a suspensed data source get resolved
export function useServerInsertedHTML(fn: () => React.ReactElement) {
  if (!isServer) return;
  // server side
  return useContext(Context).useServerInsertedHTML(fn);
}
