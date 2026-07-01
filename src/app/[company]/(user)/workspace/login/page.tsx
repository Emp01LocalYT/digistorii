import LoginForm from "./LoginForm";

interface Props {
  params: Promise<{
    company: string;
  }> | { company: string };
}

export default async function LoginPage({ params }: Props) {
  // Await params to support both Next.js 14 and 15
  const resolvedParams = await params;
  const company = resolvedParams.company;

  return <LoginForm company={company} />;
}