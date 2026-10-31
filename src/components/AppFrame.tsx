"use client";

import { usePathname } from "next/navigation";

export default function AppFrame({
  children,
  navigation,
  hasSession,
}: {
  children: React.ReactNode;
  navigation: React.ReactNode;
  hasSession: boolean;
}) {
  const pathname = usePathname();
  const isPublicAttendance = pathname.startsWith("/attend/");

  if (isPublicAttendance) {
    return <main className="flex-1 w-full">{children}</main>;
  }

  return (
    <>
      {navigation}
      <main className={`flex-1 w-full px-5 py-7 sm:px-6 lg:px-10 lg:py-8 ${hasSession ? "lg:ml-64 lg:w-[calc(100%-16rem)]" : ""}`}>
        {children}
      </main>
    </>
  );
}
