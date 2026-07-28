import {
  getServiceDisplayName,
  getTaskDisplayName,
  findServiceIdFromApplicationURN,
  findTaskIdFromResourceURN,
} from './exportMetadata';

describe('getServiceDisplayName', () => {
  it.each([
    ['inventory', 'Inventory'],
    ['subscriptions', 'Subscriptions'],
  ])('maps "%s" to "%s"', (id, expected) => {
    expect(getServiceDisplayName(id)).toBe(expected);
  });

  it('falls back to raw ID for unknown service', () => {
    expect(getServiceDisplayName('unknown-svc')).toBe('unknown-svc');
  });
});

describe('getTaskDisplayName', () => {
  it.each([
    ['export-systems', 'Export Systems'],
    ['subscriptions', 'Subscriptions'],
    ['instances', 'Instances'],
  ])('maps "%s" to "%s"', (id, expected) => {
    expect(getTaskDisplayName(id)).toBe(expected);
  });

  it('falls back to raw ID for unknown task', () => {
    expect(getTaskDisplayName('unknown-task')).toBe('unknown-task');
  });
});

describe('findServiceIdFromApplicationURN', () => {
  it('resolves inventory URN', () => {
    expect(findServiceIdFromApplicationURN('urn:redhat:application:inventory')).toBe('inventory');
  });

  it('resolves subscriptions URN', () => {
    expect(findServiceIdFromApplicationURN('subscriptions')).toBe('subscriptions');
  });

  it('returns empty string for unknown URN', () => {
    expect(findServiceIdFromApplicationURN('urn:redhat:application:unknown')).toBe('');
  });
});

describe('findTaskIdFromResourceURN', () => {
  it('resolves inventory export-systems URN', () => {
    expect(findTaskIdFromResourceURN('urn:redhat:application:inventory:export:systems')).toBe('export-systems');
  });

  it('resolves subscriptions URN', () => {
    expect(findTaskIdFromResourceURN('subscriptions')).toBe('subscriptions');
  });

  it('resolves instances URN', () => {
    expect(findTaskIdFromResourceURN('instances')).toBe('instances');
  });

  it('returns empty string for unknown URN', () => {
    expect(findTaskIdFromResourceURN('urn:unknown:resource')).toBe('');
  });
});
