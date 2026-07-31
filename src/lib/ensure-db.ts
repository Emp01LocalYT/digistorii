let initialized = false;
 
import { initializeDatabase } from "./init-db";
import { startBillingCron } from "./cron";
 
export async function ensureDB() {
  if (initialized) return;
 
  try {
    console.log("Checking DB initialization...");
    await initializeDatabase();
 
    initialized = true;
    startBillingCron();
 
    console.log("DB ready");
  } catch (err) {
    console.error("DB initialization failed:", err);
    throw err;
  }
}
