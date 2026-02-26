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
  lt: ReturnType<typeof vi.fn>
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
export function createMockQueryBuilder(): MockQueryBuilder {
  // Use an object holder so we can mutate the result without breaking closures
  const resultHolder = { data: null as any, error: null as any }

  const builder: any = {
    get _result() { return resultHolder },
    set _result(value) { 
      resultHolder.data = value.data
      resultHolder.error = value.error
    },
    _setResult: (result: { data: any; error: any }) => {
      resultHolder.data = result.data
      resultHolder.error = result.error
    },
  }

  // All chainable methods return the builder itself
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'gte', 'lte', 'lt', 'like',
    'order', 'limit',
  ]

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  // Terminal methods - return the holder object directly (mutated in place)
  builder.single = vi.fn().mockImplementation(() => Promise.resolve(resultHolder))
  builder.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(resultHolder))

  // Make the builder itself thenable (for `await supabase.from(...).select(...)`)
  builder.then = (resolve: any) => resolve(resultHolder)

  return builder as MockQueryBuilder
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabaseClient() {
  const queryBuilders = new Map<string, any>()

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
      let builder = queryBuilders.get(table)
      if (!builder) {
        builder = createMockQueryBuilder()
        queryBuilders.set(table, builder)
      }
      builder._setResult(result)
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
