"use client";
import React from "react";
import { useParams } from "next/navigation";

export default function InventoryPage() {
  const params = useParams();
  const company = (params as any)["company"] ?? "Company";
  const user = (params as any)["user"] ?? "User";

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Inventory Dashboard</h1>
      <p>
        Welcome to the inventory section for <strong>{company}</strong> (User: <strong>{user}</strong>).
      </p>
      {/* TODO: Add actual inventory UI components here */}
    </div>
  );
}
