import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import {migrate } from "drizzle-orm/neon-http/migrator";
import { drizzle } from "drizzle-orm/neon-http";

config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql);

//created everytime we create a migration
const main = async () => {
    try {
        await migrate(db, { migrationsFolder: "drizzle" });
    }
    catch (err) {
        console.error("Error during migration", err);
        process.exit(1);
    }
};

main();