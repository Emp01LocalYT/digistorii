import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantSchema } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const { schema } = await getTenantSchema(req);
    const body = await req.json();
    const purchaseId = Number(body?.purchase_id);

    if (!Number.isFinite(purchaseId) || purchaseId <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid purchase_id is required" },
        { status: 400 }
      );
    }

    const sourceHeaderRes = await pool.query(
      `
        SELECT *
        FROM "${schema}".purchase_header
        WHERE id = $1
        LIMIT 1
      `,
      [purchaseId]
    );

    if (!sourceHeaderRes.rows.length) {
      throw new Error("Purchase order not found");
    }

    const sourceHeader = sourceHeaderRes.rows[0];
    const sourceStatus = String(sourceHeader.status || "").toLowerCase();
    const sourceApprovalStatus = String(sourceHeader.approval_status || "").toLowerCase();
    const isRejected = sourceStatus === "rejected" || sourceApprovalStatus === "rejected";

    if (!isRejected) {
      throw new Error("Only rejected purchase orders can be renewed");
    }

    const sourceDetailsRes = await pool.query(
      `
        SELECT *
        FROM "${schema}".purchase_detail
        WHERE purchase_id = $1
        ORDER BY id ASC
      `,
      [purchaseId]
    );

    const sourceDetails = sourceDetailsRes.rows || [];
    if (!sourceDetails.length) {
      throw new Error("Rejected purchase order has no line items to renew");
    }

    const resetHeader = {
      ...sourceHeader,
      id: undefined,
      purchase_type: sourceHeader.purchase_type,
      purchase_no: "",
      ref_no: "",
      purchase_date: new Date().toISOString().split("T")[0],
      approval_status: undefined,
      status: "",
      reject_reason: null,
      renewed_from_po_id: purchaseId,
      renewed_from_purchase_no: sourceHeader.purchase_no,
      created_at: undefined,
      updated_at: undefined,
      approved_at: undefined,
      rejected_at: undefined,
      approved_by: undefined,
      rejected_by: undefined,
    };

    const resetDetails = sourceDetails.map((row) => ({
      ...row,
      id: undefined,
      purchase_id: undefined,
      created_at: undefined,
      updated_at: undefined,
    }));

    return NextResponse.json({
      success: true,
      message: "Purchase order template fetched successfully",
      data: {
        header: resetHeader,
        details: resetDetails,
      },
    });
  } catch (err: any) {
    console.error("Purchase Renew Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to renew purchase order",
      },
      { status: 400 }
    );
  }
}
