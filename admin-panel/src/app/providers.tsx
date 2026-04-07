"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { Persister, PersistedClient } from "@tanstack/query-persist-client-core";
import { get, set, del } from "idb-keyval";
import { useState } from "react";

const IDB_KEY = "jobboost-query-cache";

// IndexedDB-backed persister — handles 14K+ log records (well beyond localStorage limits)
const indexedDbPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set(IDB_KEY, client);
  },
  restoreClient: async () => {
    return await get<PersistedClient>(IDB_KEY);
  },
  removeClient: async () => {
    await del(IDB_KEY);
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            gcTime: 1000 * 60 * 60 * 24, // 24 hours — must be >= persister maxAge
          },
        },
      })
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: indexedDbPersister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours — discard persisted cache older than this
        buster: "v1",                  // bump to invalidate all cached data
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
