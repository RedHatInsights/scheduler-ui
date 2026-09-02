import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ModalVariant,
  Wizard,
  WizardHeader,
  WizardStep,
  TextInput,
  FormGroup,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Button,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Divider,
  Title,
  Tooltip,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon, OutlinedQuestionCircleIcon, InfoIcon } from '@patternfly/react-icons';
import cronstrue from 'cronstrue';
import type { SchedulerModalParams, SchedulerJobInput } from '../../hooks/useSchedulerModal';
import {
  getServices,
  getTasks,
  getFormats,
  getServiceDisplayName,
  getTaskDisplayName,
  getVariants,
  getVariantDisplayName,
} from '../../api/metadata/exportMetadata';
import FrequencyStep, { isValidCron } from './FrequencyStep';
import { getUserTimezone } from '../../utils/timezone';
import './ScheduleReportWizard.css';


interface ScheduleReportWizardProps {
  isOpen: boolean;
  isEditing?: boolean;
  onClose: () => void;
  onSave: (data: ScheduleReportData) => void | Promise<void>;
  /** Optional pre-fill values supplied by useSchedulerModal */
  initialValues?: SchedulerModalParams;
}

interface JobEntry {
  id: number;
  service: string;
  task: string;
  variant: string;
}

let nextJobId = 0;
function createJob(service = '', task = '', variant = ''): JobEntry {
  return { id: nextJobId++, service, task, variant };
}

export interface ScheduleReportData {
  reportName: string;
  fileType: string;
  jobs: SchedulerJobInput[];
  cronExpression: string;
  timezone?: string;
}

const ScheduleReportWizard: React.FC<ScheduleReportWizardProps> = ({
  isOpen,
  isEditing = false,
  onClose,
  onSave,
  initialValues,
}) => {
  const buildInitialJobs = (vals?: SchedulerModalParams): JobEntry[] => {
    if (vals?.jobs && vals.jobs.length > 0) return vals.jobs.map(j => createJob(j.service, j.task, j.variant ?? ''));
    if (vals?.service || vals?.task) return [createJob(vals.service ?? '', vals.task ?? '')];
    return [createJob()];
  };

  const [reportName, setReportName] = useState(initialValues?.reportName ?? '');
  const [fileType, setFileType] = useState(initialValues?.fileType ?? '');
  const [isFileTypeOpen, setIsFileTypeOpen] = useState(false);
  const [jobs, setJobs] = useState<JobEntry[]>(buildInitialJobs(initialValues));
  const [isServiceOpen, setIsServiceOpen] = useState<Record<number, boolean>>({});
  const [isTaskOpen, setIsTaskOpen] = useState<Record<number, boolean>>({});
  const [isVariantOpen, setIsVariantOpen] = useState<Record<number, boolean>>({});
  const [cronExpression, setCronExpression] = useState(initialValues?.cronExpression ?? '0 0 * * 0');
  const [timezone, setTimezone] = useState(initialValues?.timezone ?? getUserTimezone());
  const [isCronMode, setIsCronMode] = useState(false);
  const isInitialSync = useRef(false);

  // Available options from metadata
  const services = getServices();

  // Compute available formats by intersecting formats across all selected jobs
  const availableFormats = React.useMemo(() => {
    const completedJobs = jobs.filter(j => j.service && j.task);
    if (completedJobs.length === 0) return [];

    const formatSets = completedJobs.map(j => getFormats(j.service, j.task));
    if (formatSets.length === 0) return [];

    // Intersect all format arrays
    let intersection = formatSets[0];
    for (let i = 1; i < formatSets.length; i++) {
      intersection = intersection.filter(f => formatSets[i].includes(f));
    }

    return intersection;
  }, [jobs]);

  const hasFormatConflict = React.useMemo(() => {
    const completedJobs = jobs.filter(j => j.service && j.task);
    if (completedJobs.length === 0) return false;
    const formatSets = completedJobs.map(j => getFormats(j.service, j.task));
    let intersection = formatSets[0];
    for (let i = 1; i < formatSets.length; i++) {
      intersection = intersection.filter(f => formatSets[i].includes(f));
    }
    return intersection.length === 0;
  }, [jobs]);

  useEffect(() => {
    if (fileType && (availableFormats.length === 0 || !availableFormats.map(f => f.toUpperCase()).includes(fileType))) {
      setFileType('');
    }
  }, [availableFormats, fileType]);

  // Re-apply initialValues whenever the wizard is opened (e.g. consumer app
  // calls open() with different params on a subsequent click).
  useEffect(() => {
    if (isOpen) {
      isInitialSync.current = true;
      setReportName(initialValues?.reportName ?? '');
      setFileType(initialValues?.fileType ?? '');
      setJobs(buildInitialJobs(initialValues));
      setIsServiceOpen({});
      setIsTaskOpen({});
      setIsVariantOpen({});
      setCronExpression(initialValues?.cronExpression ?? '0 0 * * 0');
      setTimezone(initialValues?.timezone ?? getUserTimezone());
      setIsCronMode(false);
    }
  }, [isOpen, initialValues]);

  const handleClose = () => {
    setReportName('');
    setFileType('');
    setJobs([createJob()]);
    setIsServiceOpen({});
    setIsTaskOpen({});
    setIsVariantOpen({});
    setCronExpression('0 0 * * 0');
    setTimezone(getUserTimezone());
    setIsCronMode(false);
    onClose();
  };

  // Step validation predicates
  const isStep1Valid = () => reportName.trim() !== '';
  const isStep2Valid = () =>
    jobs.every(j => j.service && j.task && (getVariants(j.service, j.task).length === 0 || j.variant));
  const isStep3Valid = () => fileType !== '' && !hasFormatConflict;
  const isStep4Valid = () => cronExpression.trim() !== '' && isValidCron(cronExpression);

  const handleSave = async () => {
    // Name validation
    if (!reportName.trim()) {
      throw new Error('Report name is required');
    }

    // Cron validation
    if (!cronExpression.trim() || !isValidCron(cronExpression)) {
      throw new Error('Valid frequency is required');
    }

    // File type validation
    if (!fileType || hasFormatConflict) {
      throw new Error('Cannot save: file type is required and jobs must support a common format');
    }

    // Jobs completeness
    const completedJobs = jobs.filter(j => j.service && j.task);
    if (completedJobs.length === 0) {
      throw new Error('At least one complete job is required');
    }

    // Check for duplicate service+task+variant combinations
    const jobKeys = completedJobs.map(j => `${j.service}:${j.task}:${j.variant}`);
    const uniqueKeys = new Set(jobKeys);
    if (jobKeys.length !== uniqueKeys.size) {
      throw new Error('Cannot save: duplicate service and task combinations detected');
    }

    await onSave({
      reportName,
      fileType,
      jobs: completedJobs.map(({ service, task, variant }) => ({ service, task, variant })),
      cronExpression,
      timezone,
    });
  };

  const updateJob = (index: number, field: 'service' | 'task' | 'variant', value: string) => {
    setJobs(prev => {
      const updated = [...prev];
      if (field === 'service') {
        // Changing the service invalidates the task and variant.
        updated[index] = { id: updated[index].id, service: value, task: '', variant: '' };
      } else if (field === 'task') {
        // Changing the task invalidates the variant.
        updated[index] = { ...updated[index], task: value, variant: '' };
      } else {
        updated[index] = { ...updated[index], variant: value };
      }
      return updated;
    });
  };

  const addJob = () => {
    setJobs(prev => [...prev, createJob()]);
  };

  const removeJob = (id: number) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    setIsServiceOpen(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    setIsTaskOpen(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    setIsVariantOpen(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const getCronDescription = (expr: string): string => {
    try {
      return cronstrue.toString(expr);
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onEscapePress={handleClose}
      className="schedule-report-wizard-modal"
      width="1160px"
      data-testid="schedule-report-wizard-modal"
      aria-labelledby="schedule-wizard-title"
    >
      <Wizard
        className="schedule-report-wizard"
        height={600}
        header={
          <WizardHeader
            title={isEditing ? 'Edit recurring report' : 'Schedule recurring report'}
            titleId="schedule-wizard-title"
            closeButtonAriaLabel="Close wizard"
            onClose={handleClose}
          />
        }
      >
        {/* Step 1: Name */}
        <WizardStep
          name="Name"
          id="step-1"
          footer={{
            nextButtonText: 'Next',
            isNextDisabled: !reportName.trim(),
            onClose: handleClose,
          }}
        >
            <Title headingLevel="h3" size="lg" className="pf-v6-u-mb-lg">Name</Title>
            <FormGroup label="Report name" fieldId="report-name">
              <TextInput
                isRequired
                type="text"
                id="report-name"
                name="report-name"
                placeholder="Enter a report name"
                value={reportName}
                onChange={(_event, value) => setReportName(value)}
              />
            </FormGroup>
        </WizardStep>

        {/* Step 2: Job(s) */}
        <WizardStep
          name="Job(s)"
          id="step-2"
          isDisabled={!isStep1Valid()}
          footer={{
            nextButtonText: 'Next',
            isNextDisabled: !isStep2Valid(),
            onClose: handleClose,
          }}
        >
            <Title headingLevel="h3" size="lg" className="pf-v6-u-mb-lg">Job(s)</Title>
            <HelperText className="pf-v6-u-mb-md">
              <HelperTextItem icon={<InfoIcon />}>
                Each service and task combination can only be selected once. Already-selected options are hidden from the dropdowns.
              </HelperTextItem>
            </HelperText>
            {(() => {
              // A service:task pair is "fully used" by a set of jobs when there is
              // no remaining way to add it: a task with no variants is consumed by
              // a single job, while a task with variants stays available until every
              // variant has been selected.
              const isTaskFullyUsed = (serviceId: string, taskId: string, selectedJobs: JobEntry[]) => {
                const taskVariants = getVariants(serviceId, taskId);
                if (taskVariants.length === 0) {
                  return selectedJobs.some(j => j.service === serviceId && j.task === taskId);
                }
                return taskVariants.every(v =>
                  selectedJobs.some(
                    j => j.service === serviceId && j.task === taskId && j.variant === v.id
                  )
                );
              };

              const completedJobs = jobs.filter(j => j.service && j.task);

              // A selected service:task that has variants but no variant chosen
              // yet leaves the remaining combinations ambiguous — an unselected
              // variant is not counted as consumed, so combination availability
              // can't be trusted until the user finishes the current selection.
              const hasUnresolvedVariant = completedJobs.some(
                j => getVariants(j.service, j.task).length > 0 && !j.variant
              );

              // Whether any service+task+variant combination remains for a new job.
              const hasAvailableCombinations = services.some(serviceId =>
                getTasks(serviceId).some(taskId => !isTaskFullyUsed(serviceId, taskId, completedJobs))
              );

              const canAddInstance = hasAvailableCombinations && !hasUnresolvedVariant;

              return (
                <>
                  {jobs.map((job, index) => {
              // Combinations already consumed by OTHER jobs.
              const otherJobs = jobs.filter(j => j.id !== job.id && j.service && j.task);

              // Only show services that still have an available task for this job.
              const availableServices = services.filter(serviceId =>
                getTasks(serviceId).some(taskId => !isTaskFullyUsed(serviceId, taskId, otherJobs))
              );

              const tasks = job.service ? getTasks(job.service) : [];
              // Filter out tasks fully used by OTHER jobs with the same service.
              const availableTasks = tasks.filter(
                taskId => !isTaskFullyUsed(job.service, taskId, otherJobs)
              );

              // Variants (if any) for the selected task — the user must pick one.
              const variants = job.service && job.task ? getVariants(job.service, job.task) : [];
              // Exclude variants already chosen by other jobs for this service:task,
              // while keeping this job's own current selection.
              const otherVariantKeys = new Set(
                otherJobs
                  .filter(j => j.variant)
                  .map(j => `${j.service}:${j.task}:${j.variant}`)
              );
              const availableVariants = variants.filter(
                v => v.id === job.variant || !otherVariantKeys.has(`${job.service}:${job.task}:${v.id}`)
              );
              return (
                <div key={job.id} className={`job-entry${index > 0 ? ' pf-v6-u-mt-lg' : ''}`}>
                  <div className="job-entry-header">
                    <strong className="pf-v6-u-mr-sm" data-testid={`job-${index + 1}-label`}>Job {index + 1}</strong>
                    {index > 0 && (
                      <Button
                        variant="link"
                        icon={<MinusCircleIcon />}
                        onClick={() => removeJob(job.id)}
                        aria-label={`Remove job ${index + 1}`}
                        data-testid={`remove-job-${index + 1}-button`}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <FormGroup label="Service" fieldId={`service-select-${index + 1}`}>
                    <Select
                      id={`service-select-${index + 1}`}
                      isOpen={isServiceOpen[job.id] || false}
                      selected={job.service}
                      onSelect={(_event, selection) => {
                        updateJob(index, 'service', selection as string);
                        setIsServiceOpen(prev => ({ ...prev, [job.id]: false }));
                      }}
                      onOpenChange={(open) => setIsServiceOpen(prev => ({ ...prev, [job.id]: open }))}
                      toggle={(toggleRef) => (
                        <MenuToggle
                          ref={toggleRef}
                          onClick={() => setIsServiceOpen(prev => ({ ...prev, [job.id]: !prev[job.id] }))}
                          isExpanded={isServiceOpen[job.id] || false}
                          data-testid={`service-select-${index + 1}`}
                        >
                          {job.service ? getServiceDisplayName(job.service) : 'Select a service'}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        {availableServices.map((serviceId) => (
                          <SelectOption key={serviceId} value={serviceId}>
                            {getServiceDisplayName(serviceId)}
                          </SelectOption>
                        ))}
                      </SelectList>
                    </Select>
                  </FormGroup>
                  <FormGroup label="Task" fieldId={`task-select-${index + 1}`} className="pf-v6-u-mt-md">
                    <Select
                      id={`task-select-${index + 1}`}
                      isOpen={isTaskOpen[job.id] || false}
                      selected={job.task}
                      onSelect={(_event, selection) => {
                        updateJob(index, 'task', selection as string);
                        setIsTaskOpen(prev => ({ ...prev, [job.id]: false }));
                      }}
                      onOpenChange={(open) => setIsTaskOpen(prev => ({ ...prev, [job.id]: open }))}
                      toggle={(toggleRef) => (
                        <MenuToggle
                          ref={toggleRef}
                          onClick={() => setIsTaskOpen(prev => ({ ...prev, [job.id]: !prev[job.id] }))}
                          isExpanded={isTaskOpen[job.id] || false}
                          isDisabled={!job.service}
                          data-testid={`task-select-${index + 1}`}
                        >
                          {job.task ? getTaskDisplayName(job.service, job.task) : 'Select a task'}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        {availableTasks.map((taskId) => (
                          <SelectOption key={taskId} value={taskId}>
                            {getTaskDisplayName(job.service, taskId)}
                          </SelectOption>
                        ))}
                      </SelectList>
                    </Select>
                  </FormGroup>
                  {variants.length > 0 && (
                    <FormGroup label="Variant" fieldId={`variant-select-${index + 1}`} isRequired className="pf-v6-u-mt-md">
                      <Select
                        id={`variant-select-${index + 1}`}
                        isOpen={isVariantOpen[job.id] || false}
                        selected={job.variant}
                        onSelect={(_event, selection) => {
                          updateJob(index, 'variant', selection as string);
                          setIsVariantOpen(prev => ({ ...prev, [job.id]: false }));
                        }}
                        onOpenChange={(open) => setIsVariantOpen(prev => ({ ...prev, [job.id]: open }))}
                        toggle={(toggleRef) => (
                          <MenuToggle
                            ref={toggleRef}
                            onClick={() => setIsVariantOpen(prev => ({ ...prev, [job.id]: !prev[job.id] }))}
                            isExpanded={isVariantOpen[job.id] || false}
                            data-testid={`variant-select-${index + 1}`}
                          >
                            {job.variant ? getVariantDisplayName(job.service, job.task, job.variant) : 'Select a variant'}
                          </MenuToggle>
                        )}
                      >
                        <SelectList>
                          {availableVariants.map((variant) => (
                            <SelectOption key={variant.id} value={variant.id}>
                              {getVariantDisplayName(job.service, job.task, variant.id)}
                            </SelectOption>
                          ))}
                        </SelectList>
                      </Select>
                    </FormGroup>
                  )}
                </div>
              );
            })}
                  <Button
                    variant="link"
                    icon={<PlusCircleIcon />}
                    onClick={addJob}
                    isDisabled={!canAddInstance}
                    className="pf-v6-u-mt-md"
                    data-testid="add-instance-button"
                  >
                    Add an instance
                  </Button>
                </>
              );
            })()}
        </WizardStep>

        {/* Step 3: File type */}
        <WizardStep
          name="File type"
          id="step-3"
          isDisabled={!isStep1Valid() || !isStep2Valid()}
          footer={{
            nextButtonText: 'Next',
            isNextDisabled: !isStep3Valid(),
            onClose: handleClose,
          }}
        >
            <Title headingLevel="h3" size="lg" className="pf-v6-u-mb-lg">File type</Title>
            {hasFormatConflict && (
              <Alert variant="warning" isInline title="Format conflict" className="pf-v6-u-mb-md" data-testid="format-conflict-alert">
                Selected jobs do not support a common file format. Go back and adjust job selection.
              </Alert>
            )}
            <FormGroup
              label="File type"
              fieldId="file-type-select"
              labelHelp={
                <Tooltip content="Available file types are based on the jobs you selected in the previous step.">
                  <button
                    type="button"
                    aria-label="File type help"
                    onClick={(e) => e.preventDefault()}
                    className="pf-v6-c-form__label-help"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <OutlinedQuestionCircleIcon />
                  </button>
                </Tooltip>
              }
            >
              <Select
                id="file-type-select"
                isOpen={isFileTypeOpen}
                selected={fileType}
                onSelect={(_event, selection) => {
                  setFileType(selection as string);
                  setIsFileTypeOpen(false);
                }}
                onOpenChange={(isOpen) => setIsFileTypeOpen(isOpen)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsFileTypeOpen(!isFileTypeOpen)}
                    isExpanded={isFileTypeOpen}
                    data-testid="file-type-select"
                  >
                    {fileType || 'Select a type'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {availableFormats.map((format) => (
                    <SelectOption key={format} value={format.toUpperCase()}>
                      {format.toUpperCase()}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FormGroup>
        </WizardStep>

        {/* Step 4: Frequency */}
        <WizardStep
          name="Frequency"
          id="step-4"
          isDisabled={!isStep1Valid() || !isStep2Valid() || !isStep3Valid()}
          footer={{
            nextButtonText: 'Next',
            isNextDisabled: !isStep4Valid(),
            onClose: handleClose,
          }}
        >
          <FrequencyStep
            cronExpression={cronExpression}
            setCronExpression={setCronExpression}
            timezone={timezone}
            setTimezone={setTimezone}
            isCronMode={isCronMode}
            setIsCronMode={setIsCronMode}
          />
        </WizardStep>

        {/* Step 5: Review */}
        <WizardStep
          name="Review"
          id="step-5"
          isDisabled={!isStep1Valid() || !isStep2Valid() || !isStep3Valid() || !isStep4Valid()}
          footer={{
            nextButtonText: isEditing ? 'Update report' : 'Add report',
            onNext: handleSave,
            onClose: handleClose,
          }}
        >
          <Title headingLevel="h3" size="lg" className="pf-v6-u-mb-lg">Review</Title>

          <div className="review-section">
            <Title headingLevel="h4" size="md" className="pf-v6-u-mb-sm">Report name and type:</Title>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>Name</DescriptionListTerm>
                <DescriptionListDescription data-testid="review-name">{reportName || '(not set)'}</DescriptionListDescription>
                <DescriptionListTerm>Type</DescriptionListTerm>
                <DescriptionListDescription data-testid="review-file-type">{fileType || '(not set)'}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </div>

          <Divider className="pf-v6-u-my-md" />

          {jobs.map((job, index) => (
            <div key={job.id} className={`review-section${index > 0 ? ' pf-v6-u-mt-md' : ''}`}>
              <Title headingLevel="h4" size="md" className="pf-v6-u-mb-sm">Job {index + 1}:</Title>
              <DescriptionList isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>Service</DescriptionListTerm>
                  <DescriptionListDescription data-testid={`review-job-${index}-service`}>
                    {job.service ? getServiceDisplayName(job.service) : '(not set)'}
                  </DescriptionListDescription>
                  <DescriptionListTerm>Task name</DescriptionListTerm>
                  <DescriptionListDescription data-testid={`review-job-${index}-task`}>
                    {job.task ? getTaskDisplayName(job.service, job.task) : '(not set)'}
                  </DescriptionListDescription>
                  {job.variant && (
                    <>
                      <DescriptionListTerm>Variant</DescriptionListTerm>
                      <DescriptionListDescription data-testid={`review-job-${index}-variant`}>
                        {getVariantDisplayName(job.service, job.task, job.variant)}
                      </DescriptionListDescription>
                    </>
                  )}
                </DescriptionListGroup>
              </DescriptionList>
            </div>
          ))}

          <Divider className="pf-v6-u-my-md" />

          <div className="review-section">
            <Title headingLevel="h4" size="md" className="pf-v6-u-mb-sm">Frequency:</Title>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>Recurrence setting</DescriptionListTerm>
                <DescriptionListDescription data-testid="review-cron">
                  {cronExpression
                    ? (() => {
                        const desc = getCronDescription(cronExpression);
                        return desc ? `${cronExpression} (${desc})` : cronExpression;
                      })()
                    : '(not set)'}
                </DescriptionListDescription>
                <DescriptionListTerm>Time zone</DescriptionListTerm>
                <DescriptionListDescription data-testid="review-timezone">
                  {timezone || getUserTimezone()}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </div>
        </WizardStep>
      </Wizard>
    </Modal>
  );
};

export default ScheduleReportWizard;
