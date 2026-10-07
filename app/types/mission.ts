// Capa de la Misión (Barómetro de MIP4Adapt + EEA), generada por scripts/build_data.py

export type MissionProjectType = "RIA" | "IA" | "CSA" | "Cascade";

export interface MissionProject {
  cordis_id: string;
  mission_name: string;
  project_type: MissionProjectType;
  funding_scheme: string;
  framework: "H2020" | "HORIZON";
  type_note: string | null;
  call_year: number | null;
  master_call: string;
  topic_code: string;
  topic_title: string;
  lifecycle: "ongoing" | "ended" | "not started";
  in_annex5: boolean;
  n_authorities: number;
  n_demonstrators: number;
  n_replicators: number;
  n_signatory_authorities: number;
  n_countries_territories: number;
  n_territory_codes: number;
}

export interface MissionTerritory {
  id: string;
  name: string;
  country: string | null;
  codes: string[];
  is_signatory: boolean;
  n_projects: number;
  roles: string[];
  lat: number | null;
  lon: number | null;
}

export interface ProjectTerritory {
  /** cordis_id del proyecto, o "MIP4Adapt" para la asistencia técnica de la Misión */
  project_id: string;
  territory_id: string;
  code: string | null;
  code_system: "NUTS 2024" | "NUTS 2021 (UK)" | "SR 2024" | "none";
  level: number | null;
  role: "Demonstrator" | "Replicator" | null;
  is_signatory: boolean;
  cleaning: string;
}

export interface EeaSignatory {
  nuts: string;
  name: string;
  country: string;
  level: string;
}

export interface DataMeta {
  generated: string;
  sources: { key: string; label: string; date: string; url?: string }[];
  counts: Record<string, number>;
}
