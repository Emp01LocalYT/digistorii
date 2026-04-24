import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import LoginForm from "./LoginForm";

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
    notFound(); // shows Next.js 404 page
  }

  return <LoginForm company={company} />;
}