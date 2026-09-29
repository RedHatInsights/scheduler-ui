import { test, expect, type Locator, type Page } from '@playwright/test';
import { Scheduler } from '../e2e/pages/scheduler';

for (const failureAt of ['filter', 'delete']) {
  test(`cleanup continues after a ${failureAt} failure and retains only unresolved names`, async () => {
    // Model a closed drawer; cleanup must reload before its first attempt.
    // No browser or authenticated account is needed for this failure-path test.
    const hidden = { isVisible: async () => false };
    const page = { locator: () => hidden, getByRole: () => hidden } as unknown as Page;
    const scheduler = new Scheduler(page);
    const calls: string[] = [];
    scheduler.reload = async () => { calls.push('reload'); };
    scheduler.filter = async name => {
      calls.push(`filter:${name}`);
      if (name === 'original' && failureAt === 'filter') throw new Error('Filter failed');
    };
    scheduler.report = () => ({ count: async () => 1 } as unknown as Locator);
    scheduler.delete = async name => {
      calls.push(`delete:${name}`);
      if (name === 'original' && failureAt === 'delete') throw new Error('Delete failed');
    };
    scheduler.ownedNames.add('original');
    scheduler.ownedNames.add('renamed');

    await expect(scheduler.cleanup()).rejects.toThrow(/Scheduler cleanup failed: original:/);
    expect(calls).toEqual([
      'reload', 'filter:original', ...(failureAt === 'delete' ? ['delete:original'] : []),
      'reload', 'filter:renamed', 'delete:renamed',
    ]);
    expect([...scheduler.ownedNames]).toEqual(['original']);
  });
}
