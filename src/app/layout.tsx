// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import "./globals.css";
// import { initializeDatabase } from "../lib/init-db";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata: Metadata = {
//   title: "Finance SaaS",
//   description: "Company setup",
// };

// export default async function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {

//   await initializeDatabase();

//   return (
//     <html lang="en">
//       <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
//         {children}
//       </body>
//     </html>
//   );
// }

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { initializeDatabase } from "../lib/init-db";
import { cookies } from "next/headers";
import { CurrentUserProvider } from "@/context/CurrentUserContext";
import { ConfirmProvider } from "@/components/ui/toast/ConfirmProvider";
import { SnackbarProvider } from "@/components/ui/toast/SnackbarProvider";
 
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
 
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
 
export const metadata: Metadata = {
  title: " DigiStorii - Yaanar Product",
  description: "Company setup",
  icons: {
    icon: "./digistore-logo.png",
  },
};
 
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
 
  await initializeDatabase();
 
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");
 
  let user = null;
 
  if (userCookie?.value) {
    try {
      user = JSON.parse(userCookie.value);
    } catch (err) {
      console.error("Invalid user cookie", err);
    }
  }
 
 
  return (
    <html lang="en">
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          antialiased
          bg-gray-50
          text-gray-900
        `}
      >
        <CurrentUserProvider initialUser={user}>
          <ConfirmProvider>
            <SnackbarProvider>{children}</SnackbarProvider>
          </ConfirmProvider>
        </CurrentUserProvider>
      </body>
    </html>
  );
}
