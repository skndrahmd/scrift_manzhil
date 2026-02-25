/**
 * Mock Supabase client factory
 * Creates chainable mock query builders for testing
 */
import { vi } from 'vitest'

export interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  neq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  gte: ReturnType<typeof vi.fn>
  lte: ReturnType<typeof vi.fn>
  like: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  // Result
  _result: { data: any; error: any }
}

/**
 * Create a mock query builder that supports chaining
 */
export function createMockQueryBuilder(result?: { data: any; error: any }): MockQueryBuilder {
  const defaultResult = result || { data: null, error: null }

  const builder: any = {
    _result: defaultResult,
  }

  // All chainable methods return the builder itself
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'gte', 'lte', 'like',
    'order', 'limit',
  ]

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  // Terminal methods return the result
  builder.single = vi.fn().mockResolvedValue(defaultResult)
  builder.maybeSingle = vi.fn().mockResolvedValue(defaultResult)

  // Make the builder itself thenable (for `await supabase.from(...).select(...)`)
  builder.then = (resolve: any) => resolve(defaultResult)

  return builder as MockQueryBuilder
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabaseClient() {
  const queryBuilders = new Map<string, MockQueryBuilder>()

  const client = {
    from: vi.fn((table: string) => {
      if (!queryBuilders.has(table)) {
        queryBuilders.set(table, createMockQueryBuilder())
      }
      return queryBuilders.get(table)!
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    // Helper: set return value for a specific table
    __setResult(table: string, result: { data: any; error: any }) {
      queryBuilders.set(table, createMockQueryBuilder(result))
    },
    // Helper: get the query builder for a table
    __getBuilder(table: string) {
      return queryBuilders.get(table)
    },
    // Helper: reset all mocks
    __reset() {
      queryBuilders.clear()
    },
  }

  return client
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>
