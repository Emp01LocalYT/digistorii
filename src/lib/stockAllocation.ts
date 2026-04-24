import { PoolClient } from "pg";
import { insertStockLedgerEntry } from "./stockLedger";

type AllocateSalesInput = {
  schema: string;
  tenantId: string;
  salesId: number;
  salesDetailId: number;
  productId: number;
  qtyToSell: number;
  warehouseId: number;
  txnDate: string;
};

export async function allocateSalesStockFIFO(
  client: PoolClient,
  input: AllocateSalesInput
) {
  const qtyToSell = Number(input.qtyToSell || 0);
  if (qtyToSell <= 0) return;

  const layersRes = await client.query(
    `
      SELECT id, qty_remaining, locator_id
      FROM "${input.schema}".stock_layers
      WHERE product_id = $1
        AND warehouse_id = $2
        AND qty_remaining > 0
      ORDER BY created_at ASC, id ASC
      FOR UPDATE SKIP LOCKED
    `,
    [input.productId, input.warehouseId]
  );

  let remaining = qtyToSell;

  for (const row of layersRes.rows) {
    if (remaining <= 0) break;
    const available = Number(row.qty_remaining || 0);
    if (available <= 0) continue;
    const allocateQty = Math.min(available, remaining);

    await client.query(
      `
        INSERT INTO "${input.schema}".sales_allocations
          (tenant_id, sales_detail_id, stock_layer_id, qty_allocated)
        VALUES ($1, $2, $3, $4)
      `,
      [input.tenantId, input.salesDetailId, Number(row.id), allocateQty]
    );

    await client.query(
      `
        UPDATE "${input.schema}".stock_layers
        SET qty_remaining = qty_remaining - $1
        WHERE id = $2
      `,
      [allocateQty, Number(row.id)]
    );

    await insertStockLedgerEntry(client, input.schema, {
      tenant_id: input.tenantId,
      txn_date: input.txnDate,
      txn_type: "Sales",
      ref_type: "sales_header",
      ref_id: input.salesId,
      ref_line_id: input.salesDetailId,
      warehouse_id: input.warehouseId,
      locator_id: Number(row.locator_id),
      product_id: input.productId,
      qty_in: 0,
      qty_out: allocateQty
    });

    remaining -= allocateQty;
  }

  if (remaining > 0) {
    throw new Error("Insufficient stock");
  }
}
