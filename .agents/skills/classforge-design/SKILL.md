---
name: classforge-design
description: Design system for ClassForge. Use for ANY UI work, including new pages, components, layout changes, styling, and emails. Do not use for backend-only changes.
---

# ClassForge design system

Modern SaaS dashboard: clean, calm, dense but not cramped.

## Layout

- Left sidebar nav (subjects + settings), top bar with breadcrumbs.
- Content max-width 1200px, page padding 24px, card gap 16px.
- Subject page: two columns. Left = mail, right = attendance.
- Multi-step flows (CSV upload > preview > send) use a stepper.
- Each mail type (announcement, activity, grades) has its own page.

## Visual language

- Primary: purple. TODO exact hex (match the email header gradient).
- Neutrals: slate/gray scale. Page bg off-white, cards white.
- Cards: 1px border, radius 12px, very soft shadow. No heavy drop shadows.
- Type: one sans-serif family (e.g. Inter). Sizes: 12 / 14 / 16 / 20 / 28.
  Body 14px. Page titles 28px semibold.
- Icons: one set only (e.g. Lucide), 16-20px.

## Components

- Buttons: primary (filled), secondary (outline), ghost. 36px height, radius 8px.
- Tables: sticky header, row hover, zebra off, status shown with badges.
- Forms: label above input, helper text below, inline error in red-600.
- Empty states: icon + one-line explanation + primary action.
- CSV upload: dropzone, then a preview table with invalid rows highlighted.

## Rules

- Reuse existing components in `TODO/path` before creating new ones.
- No new colors or fonts outside this file. No inline hex values; use tokens/classes.
- Every page needs loading, empty, and error states.
- Responsive down to tablet; sidebar collapses to a drawer on mobile.
- Before finishing UI work, compare against an existing page and match spacing.

## Don't

- No ledger/registrar-style borders-everywhere look (the old design).
- No gradients except the primary button hover and the email header.
- No emoji as icons.
