import Sidebar from "@/components/Sidebar";
import { getSession } from "@/lib/auth";

export default async function Nav() {
  const session = await getSession();
  return session ? <Sidebar email={session.email} /> : null;
}
