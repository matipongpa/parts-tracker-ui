export interface Part {
  id: string;
  part_number: string;
  pcb_ref: string;
  description: string;
  footprint: string;
  fit: string;
  manufacturer: string;
  type: string;
  project_name: string;
  value: string;
}

export interface PartsResult {
  list: Part[];
  count: number;
}

export interface PartFilters {
  pcbRef: string;
  partNumber: string;
  value: string;
  description: string;
  type: string;
}

export interface PartsQuery extends PartFilters {
  /** Zero-based, matching the backend. */
  page: number;
  pageSize: number;
}
