import { ReactNode } from "react";

export function GradeMailView({ children }: { children: ReactNode }) {
  return <div data-mail-view="grade">{children}</div>;
}
