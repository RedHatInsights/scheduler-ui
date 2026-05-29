module.exports = {
  appUrl: '/apps/scheduler-ui',
  appEntry: './src/AppEntry.tsx',
  debug: true,
  useProxy: true,
  proxyVerbose: true,
  sassPrefix: '.scheduler-ui, .schedulerUi',
  interceptChromeConfig: false,
  plugins: [],
  hotReload: process.env.HOT === 'true',
  moduleFederation: {
    exposes: {
      './RootApp': './src/AppEntry',
      // Full-drawer component for the standalone dev harness.
      // Consumer apps do NOT import this directly.
      './GlobalScheduler': './src/Components/GlobalScheduler/GlobalScheduler',
      // Panel-only content loaded by insights-chrome (the HCC shell)
      // via ScalprumComponent. No Drawer wrapper — Chrome provides its
      // own page-level drawer, so this avoids nested-drawer issues.
      './SchedulerPanelContent': './src/Components/GlobalScheduler/SchedulerPanelContent',
      // Imported by consumer apps (e.g. Cost Management, Advisor) to open
      // the scheduling wizard modal from their own pages.
      './useSchedulerModal': './src/hooks/useSchedulerModal',
    },
    exclude: ['react-router-dom'],
    shared: [
      {
        'react-router-dom': {
          singleton: true,
          import: false,
          version: '^6.3.0',
        },
      },
    ],
  },
};
