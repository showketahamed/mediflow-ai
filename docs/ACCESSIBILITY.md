# Accessibility Checklist

MediFlow AI should remain usable by keyboard, screen-reader, and reduced-motion users.

- Use semantic controls and labels; do not replace a button with a clickable `div`.
- Keep focus visible after navigation, dialogs, form errors, and asynchronous updates.
- Ensure status and error information is conveyed in text, not color alone.
- Give icons an accessible name or mark decorative icons with `aria-hidden`.
- Verify pages at narrow viewport widths and at browser zoom.
- Respect the existing reduced-motion preference before adding animation.

For every new workflow, test tab order, Enter/Space activation, Escape for modals, and an error state without a mouse.
