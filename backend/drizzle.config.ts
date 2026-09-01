/// <reference types="node" />
import { defineConfig } from "drizzle-kit";
import 'dotenv/config';

export default defineConfig({
    schema: "./src/config/db/schema/index.ts",
    out: './src/config/db/migrations',
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    }
});
