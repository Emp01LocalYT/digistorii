
import { pool } from "@/lib/db";
 
export const getDashboardMetrics = async (schema: string) => {
  try {
    console.log("Dashboard Metrics Fetch Start");
    console.log("Tenant Schema:", schema);
 
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM ${schema}.customers) AS customers,
        (SELECT COUNT(*)::int FROM ${schema}.sales_header) AS orders,
 
        /* customer growth */
        (SELECT COUNT(*) FROM ${schema}.customers
         WHERE created_at >= NOW() - INTERVAL '30 days') AS customer_current,
 
        (SELECT COUNT(*) FROM ${schema}.customers
         WHERE created_at >= NOW() - INTERVAL '60 days'
         AND created_at < NOW() - INTERVAL '30 days') AS customer_previous,
 
        /* order growth */
        (SELECT COUNT(*) FROM ${schema}.sales_header
         WHERE created_at >= NOW() - INTERVAL '30 days') AS order_current,
 
        (SELECT COUNT(*) FROM ${schema}.sales_header
         WHERE created_at >= NOW() - INTERVAL '60 days'
         AND created_at < NOW() - INTERVAL '30 days') AS order_previous
    `);
 
    const row = result.rows[0];
 
    const customers = Number(row.customers || 0);
    const orders = Number(row.orders || 0);
 
    const customerCurrent = Number(row.customer_current || 0);
    const customerPrevious = Number(row.customer_previous || 0);
 
    const orderCurrent = Number(row.order_current || 0);
    const orderPrevious = Number(row.order_previous || 0);
 
    // console.log("Customers:", customers);
    // console.log("Orders:", orders);
    // console.log("Customer Current:", customerCurrent);
    // console.log("Customer Previous:", customerPrevious);
    // console.log("Order Current:", orderCurrent);
    // console.log("Order Previous:", orderPrevious);
 
    const customerGrowth =
      customerPrevious === 0
        ? 0
        : Number((((customerCurrent - customerPrevious) / customerPrevious) * 100).toFixed(2));
 
    const orderGrowth =
      orderPrevious === 0
        ? 0
        : Number((((orderCurrent - orderPrevious) / orderPrevious) * 100).toFixed(2));
 
    const metrics = {
      customers,
      orders,
      customerGrowth,
      orderGrowth,
    };
    // console.log("Dashboard Metrics Result:", metrics);
    return metrics;
  } catch (error: any) {
    /* DB Error Logging */
    console.error("Dashboard Metrics DB Error");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Detail:", error.detail);
    console.error("Stack:", error.stack);
    throw new Error("Database error while fetching dashboard metrics");
  }
};
 
 
export const getMonthlySales = async (schema: string) => {
  try {
    // console.log("Monthly Sales Fetch Start");
    // console.log("Tenant Schema:", schema);
 
    const result = await pool.query(`
      SELECT
        m.month,
        COALESCE(SUM(p.total_amount),0) AS sales
      FROM generate_series(1,12) m(month)
      LEFT JOIN ${schema}.sales_header p
      ON EXTRACT(MONTH FROM p.created_at) = m.month
      AND EXTRACT(YEAR FROM p.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY m.month
      ORDER BY m.month
    `);
 
    const monthlySales = result.rows.map((row: any) => Number(row.sales));
 
    // console.log("Monthly Sales Result:", monthlySales);
 
    return monthlySales;
  } catch (error: any) {
    console.error("Monthly Sales DB Error");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Detail:", error.detail);
    console.error("Stack:", error.stack);
    throw new Error("Database error while fetching monthly sales");
  }
};
 
export const getMonthlyTargetMetrics = async (schema: string, salesTarget: number) => {
  try {
 
    // console.log("Monthly Target Fetch Start");
    // console.log("Tenant Schema:", schema);
 
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(total_amount) FILTER (
          WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
        ),0) AS revenue,
 
        COALESCE(SUM(total_amount) FILTER (
          WHERE created_at::date = CURRENT_DATE
        ),0) AS today_revenue
 
      FROM ${schema}.sales_header
    `);
 
    const revenue = Number(result.rows[0].revenue || 0);
    const todayRevenue = Number(result.rows[0].today_revenue || 0);
 
    /* Example fixed target (can come from settings) */
    // console.log("getMonthlyTargetMetrics salesTarget : ",salesTarget);
    const target: number = salesTarget;
 
    const progress = target === 0 ? 0 : Number(((revenue / target) * 100).toFixed(2));
 
    const data = {
      target,
      revenue,
      todayRevenue,
      progress
    };
 
    // console.log("Monthly Target Result:", data);
    return data;
  } catch (error: any) {
    console.error("Monthly Target DB Error");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Detail:", error.detail);
    console.error("Stack:", error.stack);
    throw new Error("Database error while fetching monthly target");
 
  }
};
 
export const getStatisticsChart = async (schema: string) => {
  try {
    // console.log("Statistics Chart Fetch Start");
    // console.log("Tenant Schema:", schema);
 
    const result = await pool.query(`
      SELECT
        m.month,
        COALESCE(COUNT(p.id),0) AS sales,
        COALESCE(SUM(p.total_amount),0) AS revenue
      FROM generate_series(1,12) m(month)
      LEFT JOIN ${schema}.sales_header p
      ON EXTRACT(MONTH FROM p.created_at) = m.month
      AND EXTRACT(YEAR FROM p.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY m.month
      ORDER BY m.month
    `);
 
    const sales: number[] = [];
    const revenue: number[] = [];
 
    result.rows.forEach((row: any) => {
      sales.push(Number(row.sales));
      revenue.push(Number(row.revenue));
    });
 
    const data = {
      sales,
      revenue
    };
 
    // console.log("Statistics Chart Result:", data);
    return data;
  } catch (error: any) {
    console.error("Statistics Chart DB Error");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Stack:", error.stack);
    throw new Error("Database error while fetching statistics chart");
  }
};
 