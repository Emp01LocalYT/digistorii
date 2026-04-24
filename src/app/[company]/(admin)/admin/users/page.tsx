import CreateUserForm from "./CreateUserForm";
 
// export default async function Page() {
//   return <CreateUserForm />;
// }
export default async function Page({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = await params;
 
  return <CreateUserForm company={company} />;
}