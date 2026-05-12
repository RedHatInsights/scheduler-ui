import { useState } from 'react';

/**
 * Parameters that can be passed when opening the GlobalScheduler drawer.
 * All fields are optional — any provided value pre-fills the corresponding
 * wizard field so the consumer app does not have to re-enter it.
 *
 * Fields map 1-to-1 with the wizard steps shown in the Figma mock:
 *   Step 1 — Report name and type  →  reportName, fileType
 *   Step 2 — Service and task      →  service, task
 */
export interface SchedulerModalParams {
  /** Pre-fill the report name input (wizard step 1) */
  reportName?: string;
  /** Pre-select the file type (wizard step 1) */
  fileType?: 'PDF' | 'CSV' | 'JSON';
  /** Pre-select the service (wizard step 2) */
  service?: string;
  /** Pre-select the task (wizard step 2) */
  task?: string;
}

export interface UseSchedulerModalReturn {
  /** Whether the GlobalScheduler drawer is currently open */
  isOpen: boolean;
  /**
   * Open the GlobalScheduler drawer.
   * Pass an optional params object to pre-fill wizard fields.
   *
   * @example
   * // Open blank
   * open()
   *
   * @example
   * // Open with Cost Management pre-selected
   * open({ service: 'Cost Management', reportName: 'Monthly spend' })
   */
  open: (params?: SchedulerModalParams) => void;
  /** Close the GlobalScheduler drawer and clear any pre-fill params */
  close: () => void;
  /** The params that were passed to the last open() call, if any */
  params: SchedulerModalParams | undefined;
}

/**
 * useSchedulerModal
 *
 * Controls the open/close state of the GlobalScheduler drawer and carries
 * optional pre-fill parameters into the wizard.
 *
 * Intended to be consumed by other HCC micro-frontends via module federation:
 *
 *   // In fec.config.js (scheduler-ui):
 *   exposes: {
 *     './frontendModules/useSchedulerModal': './src/hooks/useSchedulerModal',
 *   }
 *
 *   // In a consumer app (e.g. Cost Management):
 *   const { isOpen, open, close, params } = useSchedulerModal();
 *
 *   <Button onClick={() => open({ service: 'Cost Management' })}>
 *     Schedule report
 *   </Button>
 *   <GlobalScheduler isOpen={isOpen} onClose={close} initialParams={params} />
 */
export function useSchedulerModal(): UseSchedulerModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [params, setParams] = useState<SchedulerModalParams | undefined>();

  const open = (newParams?: SchedulerModalParams) => {
    setParams(newParams);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setParams(undefined);
  };

  return { isOpen, open, close, params };
}

export default useSchedulerModal;
