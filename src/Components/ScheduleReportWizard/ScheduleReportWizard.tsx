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
} from '@patternfly/react-core';
import type { SchedulerModalParams } from '../../hooks/useSchedulerModal';
import {
  getServices,
  getTasks,
  getFormats,
  getServiceDisplayName,
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
  onClose: () => void;
  onSave: (data: ScheduleReportData) => void | Promise<void>;
  /** Optional pre-fill values supplied by useSchedulerModal */
  initialValues?: SchedulerModalParams;
}

interface ScheduleReportData {
  reportName: string;
  fileType: string;
  service: string;
  task: string;
  cronExpression: string;
}

const ScheduleReportWizard: React.FC<ScheduleReportWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  initialValues,
}) => {
  const [reportName, setReportName] = useState(initialValues?.reportName ?? '');
  const [fileType, setFileType] = useState(initialValues?.fileType ?? '');
  const [isFileTypeOpen, setIsFileTypeOpen] = useState(false);
  const [service, setService] = useState(initialValues?.service ?? '');
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [task, setTask] = useState(initialValues?.task ?? '');
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [cronExpression, setCronExpression] = useState(initialValues?.cronExpression ?? '0 0 * * 0');
  const isInitialSync = useRef(false);

  // Available options from metadata
  const services = getServices();
  const tasks = service ? getTasks(service) : [];
  const formats = service && task ? getFormats(service, task) : [];

  // Re-apply initialValues whenever the wizard is opened (e.g. consumer app
  // calls open() with different params on a subsequent click).
  useEffect(() => {
    if (isOpen) {
      isInitialSync.current = true;
      setReportName(initialValues?.reportName ?? '');
      setFileType(initialValues?.fileType ?? '');
      setService(initialValues?.service ?? '');
      setTask(initialValues?.task ?? '');
      setCronExpression(initialValues?.cronExpression ?? '0 0 * * 0');
    }
  }, [isOpen, initialValues]);

  // Reset task when service changes (skip during initial sync from initialValues)
  useEffect(() => {
    if (isInitialSync.current) {
      isInitialSync.current = false;
      return;
    }
    setTask('');
  }, [service]);

  const handleClose = () => {
    setReportName('');
    setFileType('');
    setService('');
    setTask('');
    setCronExpression('0 0 * * 0');
    onClose();
  };

  const handleSave = async () => {
    await onSave({ reportName, fileType, service, task, cronExpression });
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
      <ModalHeader title="Schedule recurring report" description="Lorem ipsum dolor sit amet" />
      <ModalBody>
        <Wizard className="schedule-report-wizard" height={600} onClose={handleClose}>
        <WizardStep
          name="Report name and type"
          id="step-1"
          footer={{
            nextButtonText: 'Next',
            isNextDisabled: !reportName.trim() || !fileType,
          }}
        >
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
            <FormGroup label="File type" isRequired fieldId="file-type">
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
                  {formats.length > 0 ? (
                    formats.map((format) => (
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

        <WizardStep
          name="Report instance 1: Service and task"
          id="step-2"
          footer={{
            nextButtonText: 'Next',
            isNextDisabled: !service || !task,
          }}
        >
            <FormGroup label="Service" isRequired fieldId="service">
              <Select
                id="service-select"
                isOpen={isServiceOpen}
                selected={service}
                onSelect={(_event, selection) => {
                  setService(selection as string);
                  setIsServiceOpen(false);
                }}
                onOpenChange={(isOpen) => setIsServiceOpen(isOpen)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsServiceOpen(!isServiceOpen)}
                    isExpanded={isServiceOpen}
                    style={{ width: '250px' }}
                  >
                    {service ? getServiceDisplayName(service) : 'Select a service'}
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
            <FormGroup label="Task" isRequired fieldId="task">
              <Select
                id="task-select"
                isOpen={isTaskOpen}
                selected={task}
                onSelect={(_event, selection) => {
                  setTask(selection as string);
                  setIsTaskOpen(false);
                }}
                onOpenChange={(isOpen) => setIsTaskOpen(isOpen)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsTaskOpen(!isTaskOpen)}
                    isExpanded={isTaskOpen}
                    isDisabled={!service}
                    style={{ width: '100%' }}
                  >
                    {task || 'Select a task'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {tasks.map((taskId) => (
                    <SelectOption key={taskId} value={taskId}>
                      {taskId}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FormGroup>
        </WizardStep>

        <WizardStep
          name="Cron setting"
          id="step-3"
          footer={{
            nextButtonText: 'Next',
            isNextDisabled: !cronExpression.trim() || !isValidCron(cronExpression),
          }}
        >
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

        <WizardStep
          name="Review"
          id="step-4"
          footer={{
            nextButtonText: 'Add report',
            onNext: handleSave,
          }}
        >
          <div>
            <p><strong>Report name:</strong> {reportName || '(not set)'}</p>
            <p><strong>File type:</strong> {fileType || '(not set)'}</p>
            <p><strong>Service:</strong> {service ? getServiceDisplayName(service) : '(not set)'}</p>
            <p><strong>Task:</strong> {task || '(not set)'}</p>
            <p><strong>Schedule:</strong> {cronExpression || '(not set)'}</p>
          </div>
        </WizardStep>
      </Wizard>
      </ModalBody>
    </Modal>
  );
};

export default ScheduleReportWizard;
