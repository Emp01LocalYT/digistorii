// import AdminLoginForm from "./AdminLoginForm";

// export default function Page({ params }: { params: { company: string } }) {
//   // Server component → params is resolved synchronously
//   return <AdminLoginForm company={params.company} />;
// }

import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import AdminLoginForm from "./AdminLoginForm";

interface Props {
  params: {
    company: string;
  };
}

export default async function LoginPage({ params }: Props) {
  const { company } = await params;

  // Check company exists in master DB
  const result = await pool.query(
    "SELECT schema_name FROM public.companies WHERE subdomain_url = $1",
    [company]
  );

  if (!result.rows.length) {
    notFound(); 
  }

  return <AdminLoginForm company={company} />;
}