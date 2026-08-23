# Admin UI system

This document is the source of truth for the AH Braiding admin interface.

## Audit summary

The audit covered the admin shell, dashboard, appointments, services hierarchy,
homepage editor, gallery, pricing, availability, customer management,
administrator management, profile, authentication, wizards, drawers and modal
editors.

Recurring drift found before normalization:

- Page widths ranged from `max-w-3xl` to `max-w-7xl`, with four different page
  padding systems and duplicate page titles below the global toolbar.
- Equivalent surfaces mixed square, `rounded-sm`, `rounded-lg`, `rounded-xl`
  and `rounded-2xl` corners, sometimes with shadows and sometimes without.
- Primary actions ranged from 32px to 48px high and mixed uppercase tracked
  labels with sentence-case labels.
- Form labels used both 10px uppercase captions and 14px sentence-case text;
  inputs used at least three heights and four radius/focus treatments.
- Loading, empty, error and success states were mostly one-off implementations.
- Modal sheets used different mobile attachment, maximum height, radius,
  padding and backdrop opacity.
- Data lists used inconsistent header contrast, row padding and action sizing.
- Violet appeared as an accidental second admin accent in the category wizard;
  brown, black and neutral primary actions competed elsewhere.

## Canonical rules

- Page width: `80rem` maximum. Padding: 16px mobile, 24px tablet, 32px desktop.
- Vertical rhythm: 8px inline gaps, 16px component gaps, 24px section gaps,
  32px major page separation.
- Page title: 24/32 semibold. Section title: 16/24 semibold. Body: 14/24.
  Label: 14/20 semibold. Helper/caption: 12/16.
- Page background: warm neutral. Primary surface: white. Nested surface: subtle
  warm neutral. Dark-mode values are supplied by the same tokens.
- Cards: 1px neutral border, 12px radius, subtle 1px shadow. Nested fieldsets may
  omit the shadow but retain the border and radius.
- Controls: 44px standard height, 8px radius, 14px semibold buttons and 14px
  normal inputs. Icon-only controls use a 44px square hit area.
- Primary action: AH brown (white in dark mode). Secondary: bordered neutral.
  Destructive: red border/text with a red-tinted hover state.
- Tables: muted header surface, 44px header, at least 56px rows, 16px horizontal
  cell padding, consistent hover and dividers.
- Modal: bottom sheet on mobile, centered dialog from 640px, 45% backdrop,
  16px mobile top radius / 12px desktop radius, 90dvh maximum height.
- Focus: visible two-ring outline on every interactive element. Disabled controls
  retain readable text and use reduced opacity plus a not-allowed cursor.

## Canonical implementation

- CSS tokens and classes: `app/globals.css` under “Admin design system”.
- React primitives and variants: `components/admin/AdminUI.tsx`.
- Legacy class exports used by service forms: `app/admin/constants.ts` now point
  to the canonical classes.

New admin UI should use these primitives or classes. A one-off variation is
appropriate only when its interaction or information density is genuinely
different, and should still inherit the same tokens and focus behavior.
