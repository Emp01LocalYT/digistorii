//C:\Users\yanna\digistorii\src\context\CurrentUserContext.tsx
"use client";
 
import { createContext, useContext, useState } from "react";
 
type User = {
  id: number;
  user_id?: number;
  company_id?: number;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  location_id?: number | null;
  warehouse_id?: number | null;
  plan_id?: number | null;
  max_warehouse?: number | null;
  max_location?: number | null;
  max_warehouses?: number | null;
  max_locations?: number | null;
  default_warehouse_id?: number | null;
  default_locator_id?: number | null;
  branch_name?: string | null;
};
 
type ContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
};
 
const CurrentUserContext = createContext<ContextType | null>(null);
 
export function CurrentUserProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
 
  return (
    <CurrentUserContext.Provider value={{ user, setUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}
 
export const useUser = () => {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error("useUser must be used within CurrentUserProvider");
  }
  return context;
};
