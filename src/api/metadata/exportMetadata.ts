export interface ExportVariant {
  id: string;
  filters: Record<string, string>;
  displayName?: string;
}

export interface ExportResource {
  id: string;
  resource: string;
  format: string[];
  displayName?: string;
  variants?: ExportVariant[];
}

export interface ExportService {
  id: string;
  application: string;
  resources: ExportResource[];
  displayName?: string;
}

let EXPORT_METADATA: ExportService[] = [];

const EXPORTS_URL = '/api/chrome-service/v1/static/exports-generated.json';

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isExportVariant(value: unknown): value is ExportVariant {
  const filters = (value as ExportVariant)?.filters;
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ExportVariant).id === 'string' &&
    typeof filters === 'object' &&
    filters !== null &&
    !Array.isArray(filters) &&
    Object.values(filters).every((v) => typeof v === 'string') &&
    isOptionalString((value as ExportVariant).displayName)
  );
}

function isExportResource(value: unknown): value is ExportResource {
  const variants = (value as ExportResource)?.variants;
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ExportResource).id === 'string' &&
    typeof (value as ExportResource).resource === 'string' &&
    Array.isArray((value as ExportResource).format) &&
    (value as ExportResource).format.every((f: unknown) => typeof f === 'string') &&
    isOptionalString((value as ExportResource).displayName) &&
    (variants === undefined || (Array.isArray(variants) && variants.every(isExportVariant)))
  );
}

function isExportService(value: unknown): value is ExportService {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ExportService).id === 'string' &&
    typeof (value as ExportService).application === 'string' &&
    Array.isArray((value as ExportService).resources) &&
    (value as ExportService).resources.every(isExportResource) &&
    isOptionalString((value as ExportService).displayName)
  );
}

export async function fetchExportMetadata(): Promise<void> {
  const response = await fetch(EXPORTS_URL, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isExportService)) {
    throw new Error('Invalid export metadata format');
  }
  EXPORT_METADATA = data;
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

export function getVariants(serviceId: string, taskId: string): ExportVariant[] {
  const service = EXPORT_METADATA.find((s) => s.id === serviceId);
  const resource = service?.resources.find((r) => r.id === taskId);
  return resource?.variants || [];
}

export function getVariantDisplayName(serviceId: string, taskId: string, variantId: string): string {
  const variant = getVariants(serviceId, taskId).find((v) => v.id === variantId);
  return variant?.displayName || variantId;
}

export function getVariantFilters(
  serviceId: string,
  taskId: string,
  variantId: string
): Record<string, string> | undefined {
  const variant = getVariants(serviceId, taskId).find((v) => v.id === variantId);
  return variant?.filters;
}

export function findVariantIdFromFilters(
  serviceId: string,
  taskId: string,
  filters: Record<string, string>
): string {
  const keys = Object.keys(filters);
  const variant = getVariants(serviceId, taskId).find((v) => {
    const vKeys = Object.keys(v.filters);
    return (
      vKeys.length === keys.length &&
      vKeys.every((k) => v.filters[k] === filters[k])
    );
  });
  return variant?.id || '';
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
