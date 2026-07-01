// import AdminLoginForm from "./AdminLoginForm";

// export default function Page({ params }: { params: { company: string } }) {
//   // Server component → params is resolved synchronously
//   return <AdminLoginForm company={params.company} />;
// }

import AdminLoginForm from "./AdminLoginForm";

interface Props {
  params: Promise<{
    company: string;
  }> | { company: string };
}

export default async function LoginPage({ params }: Props) {
  const resolvedParams = await params;
  const company = resolvedParams.company;

  return <AdminLoginForm company={company} />;
}