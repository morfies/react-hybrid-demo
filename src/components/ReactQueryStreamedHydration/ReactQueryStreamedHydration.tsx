'use client';

import {
  defaultShouldDehydrateQuery,
  dehydrate,
  hydrate,
  useQueryClient,
} from '@tanstack/react-query';
import * as React from 'react';
import { createHydrationStreamProvider } from './HydrationStreamProvider';
import type { HydrationStreamProviderProps } from './HydrationStreamProvider';
import type {
  DehydrateOptions,
  DehydratedState,
  HydrateOptions,
  QueryClient,
} from '@tanstack/react-query';

const stream = createHydrationStreamProvider<DehydratedState>();

/**
 * This component is responsible for:
 * - hydrating the query client on the server
 * - dehydrating the query client on the server
 */
export function ReactQueryStreamedHydration(props: {
  children: React.ReactNode;
  queryClient?: QueryClient;
  options?: {
    hydrate?: HydrateOptions;
    dehydrate?: DehydrateOptions;
  };
  transformer?: HydrationStreamProviderProps<DehydratedState>['transformer'];
}) {
  const queryClient = useQueryClient(props.queryClient);

  /**
   * We need to track which queries were added/updated during the render
   */
  const [trackedKeys] = React.useState(() => new Set<string>());

  // <server only>
  if (typeof window === 'undefined') {
    // Do we need to care about unsubscribing? I don't think so to be honest
    // The subscribe method can be used to subscribe to the query cache as a whole
    // and be informed of safe / known updates to the cache like query states changing or queries being updated, added or removed
    queryClient.getQueryCache().subscribe((event) => {
      switch (event.type) {
        case 'added':
        case 'updated':
          // console.log('tracking', event.query.queryHash, 'b/c of a', event.type)
          trackedKeys.add(event.query.queryHash);
      }
    });
  }
  // </server only>

  return (
    <stream.Provider
      // Happens on server:
      // so this returns a dehydratedState, which will be used on client
      onFlush={() => {
        /**
         * Dehydrated state of the client where we only include the queries that were added/updated since the last flush
         */
        const shouldDehydrate =
          props.options?.dehydrate?.shouldDehydrateQuery ??
          defaultShouldDehydrateQuery;

        // dehydrate creates a frozen representation of a cache that can later be hydrated with HydrationBoundary or hydrate.
        // This is useful for passing prefetched queries from server to client
        // This includes everything that is needed to hydrate the queryClient at a later point
        const dehydratedState = dehydrate(queryClient, {
          ...props.options?.dehydrate,
          shouldDehydrateQuery(query) {
            // dehydrate the queries that involved in our Suspense
            return trackedKeys.has(query.queryHash) && shouldDehydrate(query);
          },
        });
        trackedKeys.clear();

        if (!dehydratedState.queries.length) {
          return [];
        }

        return [dehydratedState];
      }}
      // Happens in browser: we hydrate the states from server above
      onEntries={(entries) => {
        for (const hydratedState of entries) {
          // hydrate adds a previously dehydrated state into a cache. so that reqct-query itself knows some apis are already been called on the server thus client will skip calling again
          hydrate(queryClient, hydratedState, props.options?.hydrate);
        }
      }}
      // Handle BigInts etc using superjson
      transformer={props.transformer}
    >
      {props.children}
    </stream.Provider>
  );
}
