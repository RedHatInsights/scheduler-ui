import React, { useEffect, useState } from 'react';
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

interface ScheduleReportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ScheduleReportData) => void;
  /** Optional pre-fill values supplied by useSchedulerModal */
  initialValues?: SchedulerModalParams;
}

interface ScheduleReportData {
  reportName: string;
  fileType: string;
  service: string;
  task: string;
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

  // Re-apply initialValues whenever the wizard is opened (e.g. consumer app
  // calls open() with different params on a subsequent click).
  useEffect(() => {
    if (isOpen) {
      setReportName(initialValues?.reportName ?? '');
      setFileType(initialValues?.fileType ?? '');
      setService(initialValues?.service ?? '');
      setTask(initialValues?.task ?? '');
    }
  }, [isOpen, initialValues]);

  const handleClose = () => {
    setReportName('');
    setFileType('');
    setService('');
    setTask('');
    onClose();
  };

  const handleSave = () => {
    onSave({ reportName, fileType, service, task });
    handleClose();
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
                  <SelectOption value="PDF">PDF</SelectOption>
                  <SelectOption value="CSV">CSV</SelectOption>
                  <SelectOption value="JSON">JSON</SelectOption>
                </SelectList>
              </Select>
            </FormGroup>
        </WizardStep>

        <WizardStep name="Report instance 1: Service and task" id="step-2">
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
                    {service || 'Select a service'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="Cost Management">Cost Management</SelectOption>
                  <SelectOption value="Advisor">Advisor</SelectOption>
                  <SelectOption value="Vulnerability">Vulnerability</SelectOption>
                  <SelectOption value="Compliance">Compliance</SelectOption>
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
                    style={{ width: '100%' }}
                  >
                    {task || 'Select a task'}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="Task 1">Task 1</SelectOption>
                  <SelectOption value="Task 2">Task 2</SelectOption>
                  <SelectOption value="Task 3">Task 3</SelectOption>
                </SelectList>
              </Select>
            </FormGroup>
        </WizardStep>

        <WizardStep name="Cron setting" id="step-3">
          <p>Configure the schedule for this report.</p>
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
            <p><strong>Service:</strong> {service || '(not set)'}</p>
            <p><strong>Task:</strong> {task || '(not set)'}</p>
          </div>
        </WizardStep>
      </Wizard>
      </ModalBody>
    </Modal>
  );
};

export default ScheduleReportWizard;
