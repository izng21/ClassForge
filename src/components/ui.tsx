import { ButtonHTMLAttributes, forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import Link from "next/link";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const base = "inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-4 focus:ring-brass/15 disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "bg-brass text-white hover:bg-brass-deep",
    secondary: "border border-rule bg-paper-raised text-ink hover:bg-paper",
    ghost: "text-ink-soft hover:bg-paper hover:text-ink",
    danger: "border border-rust bg-paper-raised text-rust hover:bg-rust-soft",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  return (
    <input
      ref={ref} {...props}
      className={`w-full rounded-lg border border-rule bg-paper-raised px-3 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink-soft/70 focus:border-brass focus:ring-4 focus:ring-brass/10 disabled:cursor-not-allowed disabled:bg-paper ${props.className ?? ""}`}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(props, ref) {
  return (
    <textarea
      ref={ref} {...props}
      className={`w-full rounded-lg border border-rule bg-paper-raised px-3 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink-soft/70 focus:border-brass focus:ring-4 focus:ring-brass/10 disabled:cursor-not-allowed disabled:bg-paper ${props.className ?? ""}`}
    />
  );
});

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-rule bg-paper-raised px-3 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-brass focus:ring-4 focus:ring-brass/10 disabled:cursor-not-allowed disabled:bg-paper ${props.className ?? ""}`}
    />
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, { cls: string; icon: string }> = {
    draft: { cls: "bg-[#f2f4f7] text-ink-soft", icon: "○" }, pending: { cls: "bg-[#f2f4f7] text-ink-soft", icon: "○" }, excluded: { cls: "bg-[#f2f4f7] text-ink-soft", icon: "−" },
    validated: { cls: "bg-[#eef2ff] text-brass-deep", icon: "✓" }, sending: { cls: "bg-[#fffaeb] text-[#b54708]", icon: "◌" }, sent: { cls: "bg-sage-soft text-pine-deep", icon: "✓" }, valid: { cls: "bg-sage-soft text-pine-deep", icon: "✓" }, failed: { cls: "bg-rust-soft text-rust", icon: "!" }, error: { cls: "bg-rust-soft text-rust", icon: "!" },
  };
  const item = styles[status] || styles.pending;
  return (
    <span className={`status-pill ${item.cls}`}>
      <span aria-hidden className="font-bold">{item.icon}</span>{status}
    </span>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-ink-soft">{items.map((item, index) => <span key={`${item.label}-${index}`} className="flex items-center gap-2">{index > 0 && <span aria-hidden className="text-rule">/</span>}{item.href ? <Link href={item.href} className="hover:text-brass">{item.label}</Link> : <span className="font-medium text-ink">{item.label}</span>}</span>)}</nav>;
}

export function Stepper({ active, steps }: { active: number; steps: string[] }) {
  return <ol className="mb-8 grid grid-cols-3 gap-2">{steps.map((step, index) => { const current = index + 1 === active; const done = index + 1 < active; return <li key={step} className="flex items-center gap-2 text-xs font-semibold"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${current ? "bg-brass text-white" : done ? "bg-sage-soft text-pine-deep" : "bg-[#eaecf0] text-ink-soft"}`}>{done ? "✓" : index + 1}</span><span className={current ? "text-ink" : "text-ink-soft"}>{step}</span></li>; })}</ol>;
}
