import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduleReportWizard from './ScheduleReportWizard';
import * as exportMetadata from '../../api/metadata/exportMetadata';

jest.mock('../../api/metadata/exportMetadata');

const mockGetServices = exportMetadata.getServices as jest.MockedFunction<typeof exportMetadata.getServices>;
const mockGetTasks = exportMetadata.getTasks as jest.MockedFunction<typeof exportMetadata.getTasks>;
const mockGetFormats = exportMetadata.getFormats as jest.MockedFunction<typeof exportMetadata.getFormats>;
const mockGetServiceDisplayName = exportMetadata.getServiceDisplayName as jest.MockedFunction<typeof exportMetadata.getServiceDisplayName>;
const mockGetTaskDisplayName = exportMetadata.getTaskDisplayName as jest.MockedFunction<typeof exportMetadata.getTaskDisplayName>;

beforeEach(() => {
  mockGetServices.mockReturnValue(['service-a', 'service-b']);
  mockGetTasks.mockImplementation((serviceId) => {
    if (serviceId === 'service-a') return ['task-1', 'task-2'];
    if (serviceId === 'service-b') return ['task-3'];
    return [];
  });
  mockGetFormats.mockImplementation((serviceId, taskId) => {
    if (serviceId === 'service-a' && taskId === 'task-1') return ['csv', 'json'];
    if (serviceId === 'service-a' && taskId === 'task-2') return ['csv'];
    if (serviceId === 'service-b' && taskId === 'task-3') return ['json'];
    return [];
  });
  mockGetServiceDisplayName.mockImplementation((id) => {
    if (id === 'service-a') return 'Service A';
    if (id === 'service-b') return 'Service B';
    return id;
  });
  mockGetTaskDisplayName.mockImplementation((serviceId, taskId) => {
    if (taskId === 'task-1') return 'Task 1';
    if (taskId === 'task-2') return 'Task 2';
    if (taskId === 'task-3') return 'Task 3';
    return taskId;
  });
});

describe('ScheduleReportWizard', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
  };

  describe('initial job precedence', () => {
    it('uses initialValues.jobs when provided', () => {
      const onSave = jest.fn();
      render(
        <ScheduleReportWizard
          {...defaultProps}
          onSave={onSave}
          initialValues={{
            reportName: 'Test',
            jobs: [
              { service: 'service-a', task: 'task-1' },
              { service: 'service-b', task: 'task-3' },
            ],
            fileType: 'CSV',
            cronExpression: '0 0 * * 0',
          }}
        />
      );

      // Navigate to step 2 - should see 2 jobs
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      // Wait for step 2 content
      expect(screen.getByText(/Job 1/)).toBeInTheDocument();
      expect(screen.getByText(/Job 2/)).toBeInTheDocument();
    });

    it('creates single job from initialValues.service/task when jobs not provided', () => {
      render(
        <ScheduleReportWizard
          {...defaultProps}
          initialValues={{
            reportName: 'Test',
            service: 'service-a',
            task: 'task-1',
            fileType: 'CSV',
            cronExpression: '0 0 * * 0',
          }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(screen.getByText(/Job 1/)).toBeInTheDocument();
      expect(screen.queryByText(/Job 2/)).not.toBeInTheDocument();
    });

    it('creates empty job when no initialValues provided', () => {
      render(<ScheduleReportWizard {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter a report name');
      fireEvent.change(nameInput, { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(screen.getByText(/Job 1/)).toBeInTheDocument();
      expect(screen.queryByText(/Job 2/)).not.toBeInTheDocument();
    });
  });

  describe('service change clears task', () => {
    it('resets task to empty when service changes', async () => {
      render(
        <ScheduleReportWizard
          {...defaultProps}
          initialValues={{
            reportName: 'Test',
            service: 'service-a',
            task: 'task-1',
            fileType: 'CSV',
            cronExpression: '0 0 * * 0',
          }}
        />
      );

      // Navigate to step 2
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      // Verify task is initially populated
      const taskToggleInitial = screen.getByTestId('task-select-1');
      expect(taskToggleInitial).toHaveTextContent('Task 1');

      // Open service dropdown and select service-b
      const serviceToggle = screen.getByTestId('service-select-1');
      fireEvent.click(serviceToggle);

      // PF6 Select renders options accessible via text content in JSDOM
      const serviceBOption = screen.getByText('Service B');
      fireEvent.click(serviceBOption);

      // Task should be cleared
      await waitFor(() => {
        const taskToggle = screen.getByTestId('task-select-1');
        expect(taskToggle).toHaveTextContent('Select a task');
      });
    });
  });

  describe('availableFormats intersection', () => {
    it('intersects formats across multiple jobs', () => {
      render(
        <ScheduleReportWizard
          {...defaultProps}
          initialValues={{
            reportName: 'Test',
            jobs: [
              { service: 'service-a', task: 'task-1' }, // csv, json
              { service: 'service-a', task: 'task-2' }, // csv only
            ],
            fileType: '' as 'CSV',
            cronExpression: '0 0 * * 0',
          }}
        />
      );

      // Navigate to step 3 (file type)
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      // Open file type dropdown
      const fileTypeToggle = screen.getByTestId('file-type-select');
      fireEvent.click(fileTypeToggle);

      // Should only show CSV (intersection of csv,json and csv)
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.queryByText('JSON')).not.toBeInTheDocument();
    });
  });

  describe('hasFormatConflict detection', () => {
    it('shows conflict alert when jobs have no common format', () => {
      render(
        <ScheduleReportWizard
          {...defaultProps}
          initialValues={{
            reportName: 'Test',
            jobs: [
              { service: 'service-a', task: 'task-2' }, // csv only
              { service: 'service-b', task: 'task-3' }, // json only
            ],
            fileType: '' as 'CSV',
            cronExpression: '0 0 * * 0',
          }}
        />
      );

      // Navigate to step 3
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(screen.getByText('Format conflict')).toBeInTheDocument();
      expect(screen.getByText(/Selected jobs do not support a common file format/)).toBeInTheDocument();
    });

    it('does not show conflict when formats intersect', () => {
      render(
        <ScheduleReportWizard
          {...defaultProps}
          initialValues={{
            reportName: 'Test',
            jobs: [
              { service: 'service-a', task: 'task-1' }, // csv, json
            ],
            fileType: '' as 'CSV',
            cronExpression: '0 0 * * 0',
          }}
        />
      );

      // Navigate to step 3
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(screen.queryByText('Format conflict')).not.toBeInTheDocument();
    });

    it('disables Next on file-type step when jobs have no common format and fileType was previously set', () => {
      render(
        <ScheduleReportWizard
          {...defaultProps}
          initialValues={{
            reportName: 'Test',
            jobs: [
              { service: 'service-a', task: 'task-2' }, // csv only
              { service: 'service-b', task: 'task-3' }, // json only
            ],
            fileType: 'CSV',
            cronExpression: '0 0 * * 0',
          }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Next' })); // past Name
      fireEvent.click(screen.getByRole('button', { name: 'Next' })); // past Job(s)

      expect(screen.getByText('Format conflict')).toBeInTheDocument();

      const nextButton = screen.getByRole('button', { name: 'Next' });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('fileType auto-clear when formats change', () => {
    it('clears fileType when availableFormats no longer includes it', async () => {
      const { rerender } = render(
        <ScheduleReportWizard
          {...defaultProps}
          initialValues={{
            reportName: 'Test',
            jobs: [{ service: 'service-a', task: 'task-1' }], // csv, json
            fileType: 'JSON',
            cronExpression: '0 0 * * 0',
          }}
        />
      );

      // Navigate to step 3 - JSON should be selected
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByText('JSON')).toBeInTheDocument();

      // Change to initialValues with only CSV support
      rerender(
        <ScheduleReportWizard
          {...defaultProps}
          isOpen={true}
          initialValues={{
            reportName: 'Test',
            jobs: [{ service: 'service-a', task: 'task-2' }], // csv only
            fileType: 'JSON',
            cronExpression: '0 0 * * 0',
          }}
        />
      );

      // fileType should clear because JSON not in availableFormats
      await waitFor(() => {
        const toggle = screen.getAllByRole('button').find(btn => btn.textContent?.includes('Select a type'));
        expect(toggle).toBeInTheDocument();
      });
    });
  });

  describe('onSave receives correct job shape', () => {
    it('calls onSave with jobs array mapped to {service, task}', () => {
      const onSave = jest.fn();
      render(
        <ScheduleReportWizard
          {...defaultProps}
          onSave={onSave}
          initialValues={{
            reportName: 'Test Report',
            jobs: [
              { service: 'service-a', task: 'task-1' },
            ],
            fileType: 'CSV',
            cronExpression: '0 9 * * 1',
          }}
        />
      );

      // Navigate through all steps
      fireEvent.click(screen.getByRole('button', { name: 'Next' })); // Step 1
      fireEvent.click(screen.getByRole('button', { name: 'Next' })); // Step 2 (jobs already filled)
      fireEvent.click(screen.getByRole('button', { name: 'Next' })); // Step 3 (fileType already filled)
      fireEvent.click(screen.getByRole('button', { name: 'Next' })); // Step 4 (cron already filled)

      // Step 5: Submit
      const addButton = screen.getByRole('button', { name: 'Add report' });
      fireEvent.click(addButton);

      expect(onSave).toHaveBeenCalledWith({
        reportName: 'Test Report',
        fileType: 'CSV',
        jobs: [
          { service: 'service-a', task: 'task-1' },
        ],
        cronExpression: '0 9 * * 1',
      });
    });
  });
});
