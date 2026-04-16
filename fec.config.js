module.exports = {
  appUrl: '/apps/scheduler-ui',
  appEntry: './src/AppEntry.js',
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
