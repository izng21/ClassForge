import { ReactNode } from "react";

export function ActivityMailView({ children }: { children: ReactNode }) {
  return <div data-mail-view="activity">{children}</div>;
}
