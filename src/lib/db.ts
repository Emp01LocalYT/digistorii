import { Pool,types } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

types.setTypeParser(1082, (val: string) => val);
 