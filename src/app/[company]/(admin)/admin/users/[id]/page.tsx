"use client";
import { useParams } from "next/navigation";
import CreateUserForm from "../CreateUserForm";
 
export default function EditUserPage() {
  const params = useParams();
  const company = Array.isArray(params.company) ? params.company[0] : params.company;
  const userId = Array.isArray(params.id) ? params.id[0] : params.id;
 
  return <CreateUserForm company={company} userId={userId} />;
}