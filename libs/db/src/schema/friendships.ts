import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const friendships = pgTable(
  'friendships',
  {
    id: serial('id').primaryKey(),
    userId1: integer('user_id1')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userId2: integer('user_id2')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('friendships_pair_unique').on(
      sql`LEAST(${table.userId1}, ${table.userId2})`,
      sql`GREATEST(${table.userId1}, ${table.userId2})`,
    ),
    index('friendships_user_id2_idx').on(table.userId2),
    check('friendships_no_self', sql`${table.userId1} <> ${table.userId2}`),
  ],
);
