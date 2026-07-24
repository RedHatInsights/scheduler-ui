/**
 * Export metadata for services, resources, and formats.
 * Based on user-provided YAML configuration.
 */

export interface ExportResource {
  id: string;
  resource: string;
  format: string[];
}

export interface ExportService {
  id: string;
  application: string;
  resources: ExportResource[];
}

export const EXPORT_METADATA: ExportService[] = [
  {
    id: 'inventory',
    application: 'urn:redhat:application:inventory',
    resources: [
      {
        id: 'export-systems',
        resource: 'urn:redhat:application:inventory:export:systems',
        format: ['json', 'csv'],
      },
    ],
  },
  {
    id: 'subscriptions',
    application: 'subscriptions',
    resources: [
      {
        id: 'subscriptions',
        resource: 'subscriptions',
        format: ['json', 'csv'],
      },
      {
        id: 'instances',
        resource: 'instances',
        format: ['json', 'csv'],
      },
    ],
  },
];

/**
 * Get all available service IDs.
 */
export function getServices(): string[] {
  return EXPORT_METADATA.map((s) => s.id);
}

/**
 * Get display name for a service ID.
 */
export function getServiceDisplayName(serviceId: string): string {
  const displayNames: Record<string, string> = {
    inventory: 'Inventory',
    subscriptions: 'Subscriptions',
  };

  return displayNames[serviceId] || serviceId;
}

/**
 * Get all tasks (resources) for a given service.
 */
export function getTasks(serviceId: string): string[] {
  const service = EXPORT_METADATA.find((s) => s.id === serviceId);
  return service?.resources.map((r) => r.id) || [];
}

/**
 * Get all formats for a given service + task.
 */
export function getFormats(serviceId: string, taskId: string): string[] {
  const service = EXPORT_METADATA.find((s) => s.id === serviceId);
  const resource = service?.resources.find((r) => r.id === taskId);
  return resource?.format || [];
}

/**
 * Get application URN for a service ID.
 */
export function getApplicationURN(serviceId: string): string {
  const service = EXPORT_METADATA.find((s) => s.id === serviceId);
  return service?.application || '';
}

/**
 * Get resource URN for a service + task.
 */
export function getResourceURN(serviceId: string, taskId: string): string {
  const service = EXPORT_METADATA.find((s) => s.id === serviceId);
  const resource = service?.resources.find((r) => r.id === taskId);
  return resource?.resource || '';
}

/**
 * Find task ID from resource URN.
 */
export function findTaskIdFromResourceURN(resourceURN: string): string {
  for (const service of EXPORT_METADATA) {
    const resource = service.resources.find((r) => r.resource === resourceURN);
    if (resource) return resource.id;
  }
  return '';
}

/**
 * Find service ID from application URN.
 */
export function findServiceIdFromApplicationURN(applicationURN: string): string {
  const service = EXPORT_METADATA.find((s) => s.application === applicationURN);
  return service?.id || '';
}
