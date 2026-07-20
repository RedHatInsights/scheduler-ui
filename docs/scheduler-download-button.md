# SchedulerDownloadButton

A drop-in replacement for the platform `DownloadButton` that appends a **"Schedule export"** option at the bottom of the dropdown. When clicked, it fires `onScheduleExport` so the consumer can open the scheduling wizard modal (via `useSchedulerModal`).

## Overview

Consumer apps in HCC load federated modules at runtime through [Scalprum](https://github.com/scalprum/scaffolding). The `SchedulerDownloadButton` is exposed as a federated module from `scheduler-ui`, so any HCC app can import it without adding a direct dependency.

### What it renders

The component extends the platform `DownloadButton` — it keeps all existing download options (CSV, JSON, PDF) and appends a divider + **"Schedule export"** item with a calendar icon at the bottom. Clicking it fires `onScheduleExport`, which the consumer wires to `wizard.open()` to launch the scheduling wizard.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onScheduleExport` | `() => void` | Yes | Called when user clicks "Schedule export" |
| `scheduleExportLabel` | `string` | No | Custom label (default: `"Schedule export"`) |
| `...DownloadButtonProps` | — | — | All standard `DownloadButton` props pass through |

## Usage via Module Federation + Scalprum

Consumer apps load federated **components** via `<ScalprumComponent />` and federated **hooks** via `useRemoteHook`, both from `@scalprum/react-core`.

### 1. Load the hook

`useRemoteHook` loads and calls the remote hook in one step — `hookResult` is the hook's return value (not the hook function itself), so you don't need a sub-component wrapper.

```tsx
import { useRemoteHook } from '@scalprum/react-core';

function SchedulerExportSection() {
  // Load and call the useSchedulerModal hook from scheduler-ui
  const { hookResult: schedulerModal, loading: hookLoading } = useRemoteHook({
    scope: 'schedulerUi',
    module: './useSchedulerModal',
    importName: 'default',
  });

  const handleScheduleExport = useCallback(() => {
    schedulerModal?.open({
      service: 'Cost Management',
      reportName: 'Monthly spend',
    });
  }, [schedulerModal]);

  if (hookLoading) {
    return <Skeleton width="120px" />;
  }

  // Render the component (see next section)
  return (
    <SchedulerButton
      onScheduleExport={handleScheduleExport}
      onSelect={handleDownload}
    />
  );
}
```

### 2. Load the component

Use `<ScalprumComponent />` to render a federated component. Extra props are passed through to the loaded component.

```tsx
import { ScalprumComponent } from '@scalprum/react-core';
import { Skeleton } from '@patternfly/react-core';

function SchedulerButton({
  onScheduleExport,
  onSelect,
}: {
  onScheduleExport: () => void;
  onSelect: (e: React.MouseEvent, format: string) => void;
}) {
  return (
    <ScalprumComponent
      scope="schedulerUi"
      module="./SchedulerDownloadButton"
      fallback={<Skeleton width="120px" />}
      onScheduleExport={onScheduleExport}
      onSelect={onSelect}
      scheduleExportLabel="Schedule export" // optional, this is the default
    />
  );
}
```

### Full example

```tsx
import React, { useCallback } from 'react';
import { ScalprumComponent, useRemoteHook } from '@scalprum/react-core';
import { Skeleton } from '@patternfly/react-core';

function SchedulerExportToolbar() {
  const { hookResult: schedulerModal, loading } = useRemoteHook({
    scope: 'schedulerUi',
    module: './useSchedulerModal',
    importName: 'default',
  });

  const handleScheduleExport = useCallback(() => {
    schedulerModal?.open({
      service: 'Cost Management',
      reportName: 'Monthly spend',
    });
  }, [schedulerModal]);

  const handleDownload = useCallback(
    (_e: React.MouseEvent, format: string) => {
      // your download logic here
    },
    []
  );

  if (loading) {
    return <Skeleton width="120px" />;
  }

  return (
    <ScalprumComponent
      scope="schedulerUi"
      module="./SchedulerDownloadButton"
      fallback={<Skeleton width="120px" />}
      onScheduleExport={handleScheduleExport}
      onSelect={handleDownload}
    />
  );
}
```

> **Fallback when scheduler-ui is not deployed**: If the federated module is unavailable (e.g. in FedRAMP), `ScalprumComponent` renders its `fallback` and `useRemoteHook` returns `hookResult` as `undefined`. Guard with optional chaining (`schedulerModal?.open(...)`) and consider rendering a plain `DownloadButton` when the module is absent.

## `useSchedulerModal` hook

The `useSchedulerModal` hook controls the open/close state of the scheduling wizard and carries optional pre-fill parameters.

### Return value

| Property | Type | Description |
|----------|------|-------------|
| `isOpen` | `boolean` | Whether the wizard is currently open |
| `open` | `(params?) => void` | Open the wizard, optionally pre-filling fields |
| `close` | `() => void` | Close the wizard and clear pre-fill params |
| `params` | `SchedulerModalParams \| undefined` | Params passed to the last `open()` call |

### `SchedulerModalParams`

| Field | Type | Description |
|-------|------|-------------|
| `reportName` | `string` | Pre-fill the report name input (wizard step 1) |
| `fileType` | `'PDF' \| 'CSV' \| 'JSON'` | Pre-select the file type (wizard step 1) |
| `service` | `string` | Pre-select the service (wizard step 2) |
| `task` | `string` | Pre-select the task (wizard step 2) |

## Exposed modules

All federated modules exposed by `scheduler-ui` (from `fec.config.js`):

| Module path | Description |
|-------------|-------------|
| `./SchedulerDownloadButton` | Drop-in `DownloadButton` replacement with a "Schedule export" option |
| `./useSchedulerModal` | Hook to control the scheduling wizard modal |
| `./SchedulerPanelContent` | Panel content loaded by insights-chrome (no Drawer wrapper) |
| `./GlobalScheduler` | Full-drawer component for the standalone dev harness |
| `./RootApp` | Full app entry point (standalone route) |
