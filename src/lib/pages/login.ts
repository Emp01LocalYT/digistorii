//C:\Users\yanna\digistorii\src\lib\pages\login.ts
import { pool } from "../db";
import { verifyPassword } from "../hash";
 
export async function loginUser(company: string, email: string, password: string) {
  if (!company) throw new Error("Company required");
try {
  // Get schema for company
  const companyData = await pool.query(
    "SELECT id,schema_name FROM public.companies WHERE subdomain_url = $1",
    [company]
  );
  if (!companyData.rows.length) throw new Error("Company not found");
 
  const schema = companyData.rows[0].schema_name;
  console.log("Company found:", company, "with schema:", schema);
  const companyId = companyData.rows[0].id;
  console.log("CompanyId : ",companyId);
 
  // Query user in company schema only
  const userResult = await pool.query(
    `SELECT * FROM public.users WHERE email = $1 AND company_id = $2 AND is_active=true`,
    [email,companyId]
  );
  if (!userResult.rows.length)
     return {
        success: false,
        message:
          "Incorrect email or password. Please try again."
      };
    // throw new Error("Invalid credentials");
 
  const user = userResult.rows[0];
  console.log("User found:", user);
  console.log("Verifying password for user:", email);
  const validPassword = await verifyPassword(password, user.password_hash);
  console.log("Password valid:", validPassword);
  if (!validPassword)
    // throw new Error("Invalid credentials");
   return {
        success: false,
        message: "Invalid credentials."
      };
 
  // return { user: { id: user.id,name:user.name,username:user.username,email: user.email,phone:user.phone }, schema };
  // const settingsRes = await pool.query(
  //   `SELECT default_warehouse_id, default_locator_id, branch_name
  //    FROM "${schema}".user_settings
  //    WHERE user_id = $1
  //    LIMIT 1`,
  //   [user.id]
  // );
  // const settings = settingsRes.rows[0] || {};
  const userMapResult = await pool.query(
    `SELECT location_id, warehouse_id
     FROM public.company_user_map
     WHERE user_id = $1 AND company_id = $2
       AND is_active = TRUE
     ORDER BY id DESC
     LIMIT 1`,
    [user.id, companyId]
  );
  const mappedUser = userMapResult.rows[0] || {};

  const subscriptionResult = await pool.query(
    `SELECT
       cs.plan_id,
       COALESCE(
         cs.max_warehouses,
         (
           SELECT pf.value_int
           FROM public.plan_features pf
           WHERE pf.plan_id = cs.plan_id
             AND pf.feature_key = 'max_warehouses'
           LIMIT 1
         ),
         1
       ) AS max_warehouses,
       COALESCE(
         cs.max_locations,
         (
           SELECT pf.value_int
           FROM public.plan_features pf
           WHERE pf.plan_id = cs.plan_id
             AND pf.feature_key = 'max_locations'
           LIMIT 1
         ),
         cs.max_warehouses,
         1
       ) AS max_locations
     FROM public.company_subscriptions cs
     WHERE cs.company_id = $1
     ORDER BY cs.updated_at DESC, cs.id DESC
     LIMIT 1`,
    [companyId]
  );
  const subscription = subscriptionResult.rows[0] || {};
  const maxWarehouse = Number(subscription.max_warehouses ?? 1);
  const maxLocation = Number(subscription.max_locations ?? maxWarehouse);

 console.log("Login successful for user:", email, "in company:", company);
  return {
      success: true,
      message: "Login successful!",
      user: {
        id: user.id,
        user_id: user.id,
        company_id: companyId,
        location_id: mappedUser.location_id ?? null,
        warehouse_id: mappedUser.warehouse_id ?? null,
        plan_id: subscription.plan_id ?? null,
        max_warehouse: maxWarehouse,
        max_location: maxLocation,
        max_warehouses: maxWarehouse,
        max_locations: maxLocation,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role:user.role,
        // default_warehouse_id: settings.default_warehouse_id ?? null,
        // default_locator_id: settings.default_locator_id ?? null,
        // branch_name: settings.branch_name ?? null
      },
      schema,
    };
   
  } catch (err) {
    console.error("Login error:", err);
    return { success: false, message: "Something went wrong during login. Please try again later." };
  }
}
