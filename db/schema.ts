import { pgTable,text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const accounts = pgTable("account", {
    id: text("id").primaryKey(),
    // plaid_id:text("plaid_id"),
    name: text("name").notNull(),
    userId: text("user_id").notNull(),
});

export const insertAccountSchema = createInsertSchema(accounts);
