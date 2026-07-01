//C:\Users\yanna\digistorii\src\app\[company]\(admin)\admin\users\page.tsx
import CreateUserForm from "./CreateUserForm";

interface PageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ userId?: string }>; 
}

export default async function Page({ params, searchParams }: PageProps) {
  const { company } = await params;
  const { userId } = await searchParams; 

  return <CreateUserForm company={company} userId={userId} />;
}