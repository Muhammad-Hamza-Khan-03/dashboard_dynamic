import { pgTable,text } from "drizzle-orm/pg-core";

export const accounts = pgTable("account", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    userId: text("user_id").notNull(),
});