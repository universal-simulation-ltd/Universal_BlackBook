// A fake of the only four PostgREST calls `lib/cloud.ts` makes, with the
// semantics `cloud.live.test.ts` pinned down against the real server.
//
// ⚠️ THE FAKE IS ONLY WORTH ANYTHING BECAUSE THE LIVE TEST EXISTS. A fake
// proves our code does what we think the server does; it cannot prove the
// server does it. Every behaviour below is here because a real round trip
// established it, and the two files have to be kept honest against each other:
//
//   • an INSERT onto an existing row fails with code '23505' — `createVault`
//     branches on that exact string, so a fake that threw a generic error
//     would let a broken branch pass;
//   • an UPDATE with `.eq('rev', n)` that matches nothing returns an EMPTY
//     ARRAY and no error — not an error, not null. That is the entire
//     no-silent-data-loss story, and "zero rows means conflict" is a
//     convention, not something a type system enforces;
//   • RLS scopes every statement to `auth.uid()`, which is why nothing here
//     takes a user id: a client IS an identity.
//
// The server is a single object shared between clients; a "device" is a client
// pointed at it. Two devices on one account share the server AND the identity,
// which is exactly what the live test does by handing device B device A's
// session tokens.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface FakeRow {
  user_id: string
  ciphertext: string
  kdf_salt: string
  kdf_iterations: number
  rev: number
  updated_at: string
}

export interface FakeServer {
  /** The one row per account, or null before anyone creates it. */
  row: FakeRow | null
  /** Every statement, in order — so a test can assert what the wire saw. */
  log: string[]
  /** Set to make the next call reject, as an offline device would. */
  failNext: string | null
}

export function newServer(): FakeServer {
  return { row: null, log: [], failNext: null }
}

interface PgError { message: string; code?: string }

/**
 * A client bound to one account on one server.
 *
 * Returns something shaped like the fragment of `SupabaseClient` that
 * `lib/cloud.ts` uses. The cast is deliberate and narrow: implementing the
 * real interface would mean stubbing hundreds of members that this code never
 * touches, and a test double that big stops being readable as a spec.
 */
export function fakeClient(server: FakeServer, userId = 'user-1'): SupabaseClient {
  const check = () => {
    if (!server.failNext) return null
    const message = server.failNext
    server.failNext = null
    return { message } as PgError
  }

  const api = {
    from(table: string) {
      return {
        select() {
          return {
            maybeSingle: async () => {
              server.log.push(`select ${table}`)
              const err = check()
              if (err) return { data: null, error: err }
              return { data: server.row, error: null }
            },
          }
        },

        async insert(values: Omit<FakeRow, 'user_id' | 'updated_at'>) {
          server.log.push(`insert ${table} rev=${values.rev}`)
          const err = check()
          if (err) return { error: err }
          // The primary key is user_id, so a second create for the same account
          // is a duplicate — the race two devices actually run into.
          if (server.row) {
            return { error: { message: 'duplicate key value violates unique constraint', code: '23505' } }
          }
          server.row = { ...values, user_id: userId, updated_at: new Date().toISOString() }
          return { error: null }
        },

        update(values: Partial<FakeRow>) {
          return {
            eq(column: keyof FakeRow, value: unknown) {
              return {
                select: async () => {
                  server.log.push(`update ${table} where ${String(column)}=${String(value)}`)
                  const err = check()
                  if (err) return { data: null, error: err }
                  // The compare-and-set. A row that no longer matches the
                  // predicate is simply not updated, and PostgREST reports that
                  // as zero rows returned rather than as a failure.
                  if (!server.row || server.row[column] !== value) return { data: [], error: null }
                  server.row = { ...server.row, ...values } as FakeRow
                  return { data: [{ rev: server.row.rev }], error: null }
                },
              }
            },
          }
        },

        delete() {
          return {
            neq: async () => {
              server.log.push(`delete ${table}`)
              const err = check()
              if (err) return { error: err }
              server.row = null
              return { error: null }
            },
          }
        },
      }
    },
  }

  return api as unknown as SupabaseClient
}
