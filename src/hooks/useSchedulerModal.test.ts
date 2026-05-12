import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useSchedulerModal } from './useSchedulerModal';

describe('useSchedulerModal', () => {
  it('starts closed with no params', () => {
    const { result } = renderHook(() => useSchedulerModal());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.params).toBeUndefined();
  });

  it('open() sets isOpen to true', async () => {
    const { result } = renderHook(() => useSchedulerModal());
    await act(async () => result.current.open());
    expect(result.current.isOpen).toBe(true);
  });

  it('open() without params leaves params undefined', async () => {
    const { result } = renderHook(() => useSchedulerModal());
    await act(async () => result.current.open());
    expect(result.current.params).toBeUndefined();
  });

  it('open(params) stores the provided params', async () => {
    const { result } = renderHook(() => useSchedulerModal());
    await act(async () =>
      result.current.open({
        service: 'Cost Management',
        reportName: 'Monthly spend',
        fileType: 'PDF',
        task: 'Task 1',
      })
    );
    expect(result.current.params).toEqual({
      service: 'Cost Management',
      reportName: 'Monthly spend',
      fileType: 'PDF',
      task: 'Task 1',
    });
  });

  it('close() sets isOpen to false', async () => {
    const { result } = renderHook(() => useSchedulerModal());
    await act(async () => result.current.open());
    await act(async () => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('close() clears params', async () => {
    const { result } = renderHook(() => useSchedulerModal());
    await act(async () => result.current.open({ service: 'Cost Management' }));
    await act(async () => result.current.close());
    expect(result.current.params).toBeUndefined();
  });

  it('calling open() twice with different params updates params', async () => {
    const { result } = renderHook(() => useSchedulerModal());
    await act(async () => result.current.open({ service: 'Advisor' }));
    await act(async () => result.current.open({ service: 'Cost Management', fileType: 'CSV' }));
    expect(result.current.params).toEqual({ service: 'Cost Management', fileType: 'CSV' });
    expect(result.current.isOpen).toBe(true);
  });

  it('partial params are stored as-is (other fields remain undefined)', async () => {
    const { result } = renderHook(() => useSchedulerModal());
    await act(async () => result.current.open({ reportName: 'My Report' }));
    expect(result.current.params?.reportName).toBe('My Report');
    expect(result.current.params?.service).toBeUndefined();
  });
});
