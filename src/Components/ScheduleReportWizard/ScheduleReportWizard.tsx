import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  Wizard,
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
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import cronstrue from 'cronstrue';
import type { SchedulerModalParams } from '../../hooks/useSchedulerModal';
import {
  getServices,
  getTasks,
  getFormats,
  getServiceDisplayName,
  getTaskDisplayName,
} from '../../api/metadata/exportMetadata';

const FIELD_RANGES: [number, number][] = [
  [0, 59],  // minute
  [0, 23],  // hour
  [1, 31],  // day of month
  [1, 12],  // month
  [0, 7],   // day of week (0 and 7 both = Sunday)
];

function isValidCronField(field: string, [min, max]: [number, number]): boolean {
  return field.split(',').every((part) => {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    const base = stepMatch ? stepMatch[1] : part;
    const step = stepMatch ? Number(stepMatch[2]) : null;

    if (step !== null && (step < 1 || step > max)) return false;

    if (base === '*') return true;

    const rangeMatch = base.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const [lo, hi] = [Number(rangeMatch[1]), Number(rangeMatch[2])];
      return lo >= min && hi <= max && lo <= hi;
    }

    const num = Number(base);
    return Number.isInteger(num) && num >= min && num <= max;
  });
}

function isValidCron(expr: string): boolean {
  const fields = expr.trim().split(/\s+/);
  return fields.length === 5 && fields.every((f, i) => isValidCronField(f, FIELD_RANGES[i]));
}

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
}

let nextJobId = 0;
function createJob(service = '', task = ''): JobEntry {
  return { id: nextJobId++, service, task };
}

interface ScheduleReportData {
  reportName: string;
  fileType: string;
  jobs: Array<{ service: string; task: string }>;
  cronExpression: string;
}

const ScheduleReportWizard: React.FC<ScheduleReportWizardProps> = ({
  isOpen,
  isEditing = false,
  onClose,
  onSave,
  initialValues,
}) => {
  const buildInitialJobs = (vals?: SchedulerModalParams): JobEntry[] => {
    if (vals?.jobs && vals.jobs.length > 0) return vals.jobs.map(j => createJob(j.service, j.task));
    if (vals?.service || vals?.task) return [createJob(vals.service ?? '', vals.task ?? '')];
    return [createJob()];
  };

  const [reportName, setReportName] = useState(initialValues?.reportName ?? '');
  const [fileType, setFileType] = useState(initialValues?.fileType ?? '');
  const [isFileTypeOpen, setIsFileTypeOpen] = useState(false);
  const [jobs, setJobs] = useState<JobEntry[]>(buildInitialJobs(initialValues));
  const [isServiceOpen, setIsServiceOpen] = useState<Record<number, boolean>>({});
  const [isTaskOpen, setIsTaskOpen] = useState<Record<number, boolean>>({});
  const [cronExpression, setCronExpression] = useState(initialValues?.cronExpression ?? '0 0 * * 0');
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

    return intersection.length > 0 ? intersection : ['csv', 'json'];
  }, [jobs]);

  useEffect(() => {
    if (fileType && availableFormats.length > 0 && !availableFormats.map(f => f.toUpperCase()).includes(fileType)) {
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
      setCronExpression(initialValues?.cronExpression ?? '0 0 * * 0');
    }
  }, [isOpen, initialValues]);

  const handleClose = () => {
    setReportName('');
    setFileType('');
    setJobs([createJob()]);
    setIsServiceOpen({});
    setIsTaskOpen({});
    setCronExpression('0 0 * * 0');
    onClose();
  };

  const handleSave = async () => {
    await onSave({ reportName, fileType, jobs: jobs.map(({ service, task }) => ({ service, task })), cronExpression });
  };

  const updateJob = (index: number, field: 'service' | 'task', value: string) => {
    setJobs(prev => {
      const updated = [...prev];
      if (field === 'service') {
        updated[index] = { id: updated[index].id, service: value, task: '' };
      } else {
        updated[index] = { ...updated[index], task: value };
      }
      return updated;
    });
  };

  const addJob = () => {
    setJobs(prev => [...prev, createJob()]);
  };

  const removeJob = (index: number) => {
    const removedId = jobs[index].id;
    setJobs(prev => prev.filter((_, i) => i !== index));
    setIsServiceOpen(prev => {
      const updated = { ...prev };
      delete updated[removedId];
      return updated;
    });
    setIsTaskOpen(prev => {
      const updated = { ...prev };
      delete updated[removedId];
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
      variant="large"
      isOpen={isOpen}
      onClose={handleClose}
      className="schedule-report-wizard-modal"
      width="1160px"
    >
      <ModalHeader title={isEditing ? 'Edit recurring report' : 'Schedule recurring report'} />
      <ModalBody>
        <Wizard className="schedule-report-wizard" height={600} onClose={handleClose}>
        {/* Step 1: Name */}
        <WizardStep
          name="Name"
          id="step-1"
          footer={{
            nextButtonText: 'Next',
            isNextDisabled: !reportName.trim(),
          }}
        >
            <Title headingLevel="h3" size="lg" className="pf-v6-u-mb-lg">Name</Title>
            <FormGroup label="Report name" isRequired fieldId="report-name">
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
          footer={{
            nextButtonText: 'Next',
            isNextDisabled: jobs.some(j => !j.service || !j.task),
          }}
        >
            <Title headingLevel="h3" size="lg" className="pf-v6-u-mb-lg">Job(s)</Title>
            {jobs.map((job, index) => {
              const tasks = job.service ? getTasks(job.service) : [];
              return (
                <div key={job.id} className={`job-entry${index > 0 ? ' pf-v6-u-mt-lg' : ''}`}>
                  <div className="job-entry-header">
                    <strong className="pf-v6-u-mr-sm">Job {index + 1}</strong>
                    {index > 0 && (
                      <Button
                        variant="link"
                        icon={<MinusCircleIcon />}
                        onClick={() => removeJob(index)}
                        aria-label={`Remove job ${index + 1}`}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <FormGroup label="Service" isRequired fieldId={`service-${job.id}`}>
                    <Select
                      id={`service-select-${job.id}`}
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
                          style={{ width: '100%' }}
                        >
                          {job.service ? getServiceDisplayName(job.service) : 'Select a service'}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        {services.map((serviceId) => (
                          <SelectOption key={serviceId} value={serviceId}>
                            {getServiceDisplayName(serviceId)}
                          </SelectOption>
                        ))}
                      </SelectList>
                    </Select>
                  </FormGroup>
                  <FormGroup label="Task" isRequired fieldId={`task-${job.id}`} className="pf-v6-u-mt-md">
                    <Select
                      id={`task-select-${job.id}`}
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
                          style={{ width: '100%' }}
                        >
                          {job.task ? getTaskDisplayName(job.service, job.task) : 'Select a task'}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        {tasks.map((taskId) => (
                          <SelectOption key={taskId} value={taskId}>
                            {getTaskDisplayName(job.service, taskId)}
                          </SelectOption>
                        ))}
                      </SelectList>
                    </Select>
                  </FormGroup>
                </div>
              );
            })}
            <Button variant="link" icon={<PlusCircleIcon />} onClick={addJob} className="pf-v6-u-mt-md">
              Add an instance
            </Button>
        </WizardStep>

        {/* Step 3: File type */}
        <WizardStep
          name="File type"
          id="step-3"
          footer={{
            nextButtonText: 'Next',
            isNextDisabled: !fileType,
          }}
        >
            <Title headingLevel="h3" size="lg" className="pf-v6-u-mb-lg">File type</Title>
            <FormGroup
              label="File type"
              isRequired
              fieldId="file-type"
              labelHelp={
                <Tooltip content="Available file types are based on the jobs you selected in previous step.">
                  <OutlinedQuestionCircleIcon aria-label="File type help" />
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
                    style={{ width: '100%' }}
                  >
                    {fileType || 'Select a type'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {availableFormats.length > 0 ? (
                    availableFormats.map((format) => (
                      <SelectOption key={format} value={format.toUpperCase()}>
                        {format.toUpperCase()}
                      </SelectOption>
                    ))
                  ) : (
                    <>
                      <SelectOption value="CSV">CSV</SelectOption>
                      <SelectOption value="JSON">JSON</SelectOption>
                    </>
                  )}
                </SelectList>
              </Select>
            </FormGroup>
        </WizardStep>

        {/* Step 4: Frequency */}
        <WizardStep
          name="Frequency"
          id="step-4"
          footer={{
            nextButtonText: 'Next',
            isNextDisabled: !cronExpression.trim() || !isValidCron(cronExpression),
          }}
        >
          <Title headingLevel="h3" size="lg" className="pf-v6-u-mb-lg">Frequency</Title>
          <FormGroup
            label="Cron expression"
            isRequired
            fieldId="cron-expression"
          >
            <TextInput
              isRequired
              type="text"
              id="cron-expression"
              name="cron-expression"
              placeholder="0 0 * * 0"
              value={cronExpression}
              onChange={(_event, value) => setCronExpression(value)}
              aria-describedby="cron-helper"
              validated={!cronExpression.trim() || isValidCron(cronExpression) ? 'default' : 'error'}
            />
            <div id="cron-helper" className="pf-v6-c-form__helper-text">
              {cronExpression.trim() && !isValidCron(cronExpression)
                ? 'Invalid cron expression. Use 5 space-separated fields (e.g., 0 0 * * 0).'
                : "Enter a cron expression (e.g., '0 0 * * 0' for weekly on Sunday at midnight)"}
            </div>
          </FormGroup>
        </WizardStep>

        {/* Step 5: Review */}
        <WizardStep
          name="Review"
          id="step-5"
          footer={{
            nextButtonText: isEditing ? 'Save report' : 'Add report',
            onNext: handleSave,
          }}
        >
          <Title headingLevel="h3" size="lg" className="pf-v6-u-mb-lg">Review</Title>

          <div className="review-section">
            <Title headingLevel="h4" size="md" className="pf-v6-u-mb-sm">Report name and type:</Title>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>Name</DescriptionListTerm>
                <DescriptionListDescription>{reportName || '(not set)'}</DescriptionListDescription>
                <DescriptionListTerm>Type</DescriptionListTerm>
                <DescriptionListDescription>{fileType || '(not set)'}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </div>

          <Divider className="pf-v6-u-my-md" />

          {jobs.map((job, index) => (
            <div key={index} className={`review-section${index > 0 ? ' pf-v6-u-mt-md' : ''}`}>
              <Title headingLevel="h4" size="md" className="pf-v6-u-mb-sm">Job {index + 1}:</Title>
              <DescriptionList isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>Service</DescriptionListTerm>
                  <DescriptionListDescription>
                    {job.service ? getServiceDisplayName(job.service) : '(not set)'}
                  </DescriptionListDescription>
                  <DescriptionListTerm>Task name</DescriptionListTerm>
                  <DescriptionListDescription>
                    {job.task ? getTaskDisplayName(job.service, job.task) : '(not set)'}
                  </DescriptionListDescription>
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
                <DescriptionListDescription>
                  {cronExpression
                    ? `${cronExpression} (${getCronDescription(cronExpression)})`
                    : '(not set)'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </div>
        </WizardStep>
      </Wizard>
      </ModalBody>
    </Modal>
  );
};

export default ScheduleReportWizard;
