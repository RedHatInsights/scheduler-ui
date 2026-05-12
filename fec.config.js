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
      // Exposes the useSchedulerModal hook so other HCC micro-frontends
      './frontendModules/useSchedulerModal': './src/hooks/useSchedulerModal',
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
