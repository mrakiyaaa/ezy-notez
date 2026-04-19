/**
 * Creates a chainable Supabase query mock.
 *
 * Supports both patterns used in the codebase:
 *   await supabaseAdmin.from("t").select().eq().order()        → awaitable chain
 *   await supabaseAdmin.from("t").insert().select().single()   → .single() Promise
 *   await supabaseAdmin.from("t").select("id",{count:"exact"}).eq() → { count }
 */
export function makeQueryChain(
  data: unknown = null,
  error: unknown = null,
  count: number | null = null,
) {
  const result = { data, error, count };

  const chain: Record<string, unknown> = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    // maybeSingle: like single() but does not error on empty rows
    maybeSingle: jest.fn().mockResolvedValue(result),
    // Allow `await chain` to resolve (Supabase PromiseLike behaviour)
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return chain;
}

/**
 * Creates a mock supabaseAdmin object.
 * Call `configureFrom` in each test to control per-table responses.
 */
export function createSupabaseMock() {
  const mockFrom = jest.fn();
  const mockGetUser = jest.fn();
  const mockRefreshSession = jest.fn();

  const supabaseAdmin = {
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
      refreshSession: mockRefreshSession,
    },
  };

  /** Configure from() to return specific data for a given table name. */
  const configureFrom = (
    responses: Record<string, { data: unknown; error?: unknown }>,
    defaultData: unknown = null,
  ) => {
    mockFrom.mockImplementation((table: string) => {
      if (table in responses) {
        const { data, error = null } = responses[table];
        return makeQueryChain(data, error);
      }
      return makeQueryChain(defaultData);
    });
  };

  return { supabaseAdmin, mockFrom, mockGetUser, mockRefreshSession, configureFrom };
}
