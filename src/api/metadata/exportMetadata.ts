export interface ExportResource {
  id: string;
  resource: string;
  format: string[];
  displayName?: string;
}

export interface ExportService {
  id: string;
  application: string;
  resources: ExportResource[];
  displayName?: string;
}

let EXPORT_METADATA: ExportService[] = [];

const EXPORTS_URL = '/api/chrome-service/v1/static/exports-generated.json';

export async function fetchExportMetadata(): Promise<void> {
  const response = await fetch(EXPORTS_URL);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  EXPORT_METADATA = await response.json();
}

export function getServices(): string[] {
  return EXPORT_METADATA.map((s) => s.id);
}

export function getServiceDisplayName(serviceId: string): string {
  const service = EXPORT_METADATA.find((s) => s.id === serviceId);
  return service?.displayName || serviceId;
}

export function getTaskDisplayName(serviceId: string, taskId: string): string {
  const service = EXPORT_METADATA.find((s) => s.id === serviceId);
  const resource = service?.resources.find((r) => r.id === taskId);
  return resource?.displayName || taskId;
}

export function getTasks(serviceId: string): string[] {
  const service = EXPORT_METADATA.find((s) => s.id === serviceId);
  return service?.resources.map((r) => r.id) || [];
}

export function getFormats(serviceId: string, taskId: string): string[] {
  const service = EXPORT_METADATA.find((s) => s.id === serviceId);
  const resource = service?.resources.find((r) => r.id === taskId);
  return resource?.format || [];
}

export function getApplicationURN(serviceId: string): string {
  const service = EXPORT_METADATA.find((s) => s.id === serviceId);
  return service?.application || '';
}

export function getResourceURN(serviceId: string, taskId: string): string {
  const service = EXPORT_METADATA.find((s) => s.id === serviceId);
  const resource = service?.resources.find((r) => r.id === taskId);
  return resource?.resource || '';
}

export function findTaskIdFromResourceURN(resourceURN: string): string {
  for (const service of EXPORT_METADATA) {
    const resource = service.resources.find((r) => r.resource === resourceURN);
    if (resource) return resource.id;
  }
  return '';
}

export function findServiceIdFromApplicationURN(applicationURN: string): string {
  const service = EXPORT_METADATA.find((s) => s.application === applicationURN);
  return service?.id || '';
}
