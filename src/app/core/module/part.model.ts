export interface Part {
  id: string;
  part_number: string;
  pcb_ref: string;
  description?: string;
  footprint?: string;
  fit: string;
  manufacturer: string;
  type: string;
  project_name: string;
  value: string;
}

export interface PartResponse {
  list: Part[];
  count: number;
}
