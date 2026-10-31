import { ReactNode } from "react";

export function AnnouncementMailView({ children }: { children: ReactNode }) {
  return <div data-mail-view="announcement">{children}</div>;
}
