import { PoolClient } from "pg";
import { pool } from "@/lib/db";

type QueryRunner = Pick<PoolClient, "query">;
 
export async function generatePurchaseNo(schema: string) {
  if (!schema) {
    throw new Error("Schema name is empty");
  }
  try {
    const datePart = new Date().toISOString().split("T")[0].replaceAll("-", ""); // YYYYMMDD
 
    // Find last purchase number for today
    const lastRes = await pool.query(
      `SELECT purchase_no FROM ${schema}.purchase_header
     WHERE purchase_no LIKE $1
     ORDER BY id DESC LIMIT 1`,
      [`PUR-${datePart}-%`]
    );
 
    let nextNumber = "0001";
    if (lastRes.rows.length) {
      const lastNo = lastRes.rows[0].purchase_no; // e.g., PUR-20260305-0001
      if (!lastNo) {
        throw new Error("Invalid purchase_no found in DB");
      }
 
      const num = parseInt(lastNo.split("-")[2], 10);
      nextNumber = String(num + 1).padStart(4, "0");
    }
 
    const purchaseNo = `PUR-${datePart}-${nextNumber}`;
    console.log("Generated Purchase No: here", purchaseNo);
 
    return purchaseNo;
  } catch (err: any) {
 
    if (err.code === "42P01") {
      throw new Error(
        `Table "${schema}.purchase_header" does not exist. Please create purchase tables for tenant schema "${schema}".`
      );
    }
 
    throw new Error(`Generate PurchaseNo DB Error: ${err.message}`);
  }
}
 
export async function generateSalesNo(schema: string) {
  if (!schema) {
    throw new Error("Schema name is empty");
  }
  try {
    const datePart = new Date().toISOString().split("T")[0].replaceAll("-", ""); // YYYYMMDD
 
    // Find last sales number for today
    const lastRes = await pool.query(
      `SELECT sales_no FROM ${schema}.sales_header
     WHERE sales_no LIKE $1
     ORDER BY id DESC LIMIT 1`,
      [`SAL-${datePart}-%`]
    );
 
    let nextNumber = "0001";
    if (lastRes.rows.length) {
      const lastNo = lastRes.rows[0].sales_no; // e.g., SAL-20260305-0002
      if (!lastNo) {
        throw new Error("Invalid sales_no found in DB");
      }
 
      const num = parseInt(lastNo.split("-")[2], 10);
      nextNumber = String(num + 1).padStart(4, "0");
    }
 
    const salesNo = `SAL-${datePart}-${nextNumber}`;
    console.log("Generated Sales No:", salesNo);
 
    return salesNo;
  } catch (err: any) {
 
    if (err.code === "42P01") {
      throw new Error(
        `Table "${schema}.sales_header" does not exist. Please create sales tables for tenant schema "${schema}".`
      );
    }
 
    throw new Error(`Generate SalesNo DB Error: ${err.message}`);
  }
}
 
export async function generateGRNNo(schema: string) {
  if (!schema) {
    throw new Error("Schema name is empty");
  }
  try {
    const datePart = new Date().toISOString().split("T")[0].replaceAll("-", ""); // YYYYMMDD
 
    // Find last GRN number for today
    const lastRes = await pool.query(
      `SELECT grn_no FROM ${schema}.grn_header
     WHERE grn_no LIKE $1
     ORDER BY id DESC LIMIT 1`,
      [`GRN-${datePart}-%`]
    );
 
    let nextNumber = "0001";
    if (lastRes.rows.length) {
      const lastNo = lastRes.rows[0].grn_no; // e.g., GRN-20260305-0001
      if (!lastNo) {
        throw new Error("Invalid grn_no found in DB");
      }
 
      const num = parseInt(lastNo.split("-")[2], 10);
      nextNumber = String(num + 1).padStart(4, "0");
    }
 
    const grnNo = `GRN-${datePart}-${nextNumber}`;
    console.log("Generated GRN No:", grnNo);
 
    return grnNo;
  } catch (err: any) {
 
    if (err.code === "42P01") {
      throw new Error(
        `Table "${schema}.grn_header" does not exist. Please create grn tables for tenant schema "${schema}".`
      );
    }
 
    throw new Error(`Generate GRNNo DB Error: ${err.message}`);
  }
}

export async function getNextProductCodeByType(
  schema: string,
  type: string,
  runner: QueryRunner = pool
): Promise<string> {
  if (!schema) {
    throw new Error("Schema name is empty");
  }
  const normalized =
    type === "raw_material" || type === "other" ? type : "finished_good";
  const prefix = normalized === "raw_material" ? "RW" : normalized === "other" ? "OT" : "PR";

  try {
    const result = await runner.query(
      `
        SELECT COALESCE(
          MAX(CAST(SUBSTRING(product_code FROM 4) AS INTEGER)),
          0
        ) AS max_code
        FROM "${schema}".products
        WHERE product_code ~ $1
      `,
      [`^${prefix}-[0-9]+$`]
    );

    const next = Number(result.rows[0]?.max_code || 0) + 1;
    return `${prefix}-${String(next).padStart(3, "0")}`;
  } catch (err: any) {
    if (err.code === "42P01") {
      throw new Error(
        `Table "${schema}.products" does not exist. Please create product tables for tenant schema "${schema}".`
      );
    }
    throw new Error(`Generate ProductCode DB Error: ${err.message}`);
  }
}
