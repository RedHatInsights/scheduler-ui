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

### 1. Load the component and hook

```tsx
import React from 'react';
import { useLoadModule } from '@scalprum/react-core';

function MyExportToolbar() {
  // Load the SchedulerDownloadButton component
  const [buttonModule, buttonError, buttonLoading] = useLoadModule(
    { scope: 'schedulerUi', module: './SchedulerDownloadButton' },
    {}
  );

  // Load the useSchedulerModal hook
  const [modalModule, modalError, modalLoading] = useLoadModule(
    { scope: 'schedulerUi', module: './useSchedulerModal' },
    {}
  );

  if (buttonLoading || modalLoading) {
    return <DownloadButton isDisabled />;  // fallback while loading
  }

  if (buttonError || modalError) {
    // scheduler-ui not deployed — fall back to regular DownloadButton
    return (
      <DownloadButton onSelect={(e, format) => handleDownload(format)} />
    );
  }

  const SchedulerDownloadButton = buttonModule.default;
  const useSchedulerModal = modalModule.default;

  return <SchedulerDownloadButton onSelect={handleDownload} />;
}
```

### 2. Inner component (hooks require stable mount)

Because `useSchedulerModal` is a React hook, it must be called inside a component that stays mounted (cannot be called conditionally). Extract to a sub-component:

```tsx
import React from 'react';
import { useLoadModule } from '@scalprum/react-core';
import { Skeleton } from '@patternfly/react-core';

/** Wrapper that handles Scalprum loading */
function SchedulerExportSection() {
  const [btnMod, btnErr, btnLoading] = useLoadModule(
    { scope: 'schedulerUi', module: './SchedulerDownloadButton' },
    {}
  );
  const [hookMod, hookErr, hookLoading] = useLoadModule(
    { scope: 'schedulerUi', module: './useSchedulerModal' },
    {}
  );

  if (btnLoading || hookLoading) return <Skeleton width="120px" />;
  if (btnErr || hookErr) return <FallbackDownloadButton />;

  const SchedulerDownloadButton = btnMod.default;
  const useSchedulerModal = hookMod.default;

  return (
    <SchedulerExportButtonInner
      SchedulerDownloadButton={SchedulerDownloadButton}
      useSchedulerModal={useSchedulerModal}
    />
  );
}

/** Inner component — safe to call the hook here */
function SchedulerExportButtonInner({
  SchedulerDownloadButton,
  useSchedulerModal,
}: {
  SchedulerDownloadButton: React.ComponentType<any>;
  useSchedulerModal: () => {
    isOpen: boolean;
    open: (params?: {
      reportName?: string;
      fileType?: string;
      service?: string;
      task?: string;
    }) => void;
    close: () => void;
    params: Record<string, string> | undefined;
  };
}) {
  const wizard = useSchedulerModal();

  return (
    <SchedulerDownloadButton
      onSelect={(_e: React.MouseEvent, format: string) =>
        handleDownload(format)
      }
      onScheduleExport={() =>
        wizard.open({
          service: 'Cost Management',
          reportName: 'Monthly spend',
        })
      }
      scheduleExportLabel="Schedule export" // optional, this is the default
    />
  );
}
```

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
