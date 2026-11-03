import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from '@tanstack/react-query';

// NOTE: `superjson` is installed but currently unused — no transformer is
// configured on the tRPC links or server initializer. Serialization parameters
// (serialize/deserialize) are left commented below in case a transformer is
// added later.
 
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        // serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
      hydrate: {
        // deserializeData: superjson.deserialize,
      },
    },
  });
}