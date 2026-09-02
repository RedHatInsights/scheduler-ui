import { useEffect } from 'react';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';

// Federated module chrome loads into its shared drawer for the scheduler panel.
// Must match the {scope, module} contract insights-chrome registers.
export const SCHEDULER_DRAWER = { scope: 'schedulerUi', module: './SchedulerPanelContent' };

// Module-level guard: open the scheduler drawer exactly once per app session.
//
// insights-chrome's `toggleDrawerContent` is a TOGGLE, not an "open". Its
// `computeDrawerToggle` closes the drawer when the same {scope, module} is
// already open (futureOpened = scope/module differ || !isOpened). There is no
// unconditional open action — `setDrawerPanelContent` only sets content without
// expanding. So a *second* call with our content while the drawer is open would
// CLOSE it.
//
// A per-component ref is not enough: two components open it in sequence
// (SchedulerLanding on the catch-all route, then DownloadPage), and StrictMode /
// shell re-renders can remount and re-run mount effects. A module-level flag
// survives those, so we toggle open once and never accidentally toggle it shut.
let drawerOpened = false;

/**
 * useOpenSchedulerDrawer
 *
 * Best-effort: opens the global scheduler drawer via chrome so the user lands on
 * their reports. Shared by DownloadPage (email-link target) and SchedulerLanding
 * (catch-all route). No-op outside insights-chrome / when the scheduler-drawer
 * flag is off (e.g. tests) — the guard is only set once we actually toggle, so a
 * later real chrome mount can still open it.
 */
export function useOpenSchedulerDrawer(): void {
  const chrome = useChrome();

  useEffect(() => {
    if (drawerOpened) return;
    // drawerActions only exists inside insights-chrome with the flag on. It may
    // hydrate after the first render, so keep the guard unset until we can act.
    const toggle = chrome?.drawerActions?.toggleDrawerContent;
    if (!toggle) return;
    drawerOpened = true;
    try {
      toggle(SCHEDULER_DRAWER);
    } catch {
      // Opening the panel is best-effort — never block the page on it.
    }
  }, [chrome]);
}

/** Test-only: reset the module-level open-once guard between tests. */
export function __resetOpenSchedulerDrawer(): void {
  drawerOpened = false;
}

export default useOpenSchedulerDrawer;
