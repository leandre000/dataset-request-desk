export interface User {
  id: number;
  name: string;
  email: string;
  role: 'client' | 'operator' | 'admin';
  organisation: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryItem {
  id: number;
  previous_status: string | null;
  new_status: string;
  changed_by: number;
  changed_by_name: string | null;
  changed_at: string;
}

export interface AssignmentItem {
  id: number;
  request_id: number;
  episode_id: number;
  episode_code: string | null;
  assigned_by: number;
  assigned_by_name: string | null;
  assigned_at: string;
}

export interface DatasetRequest {
  id: number;
  client_id: number;
  client_name: string | null;
  client_organisation: string | null;
  task_name: string;
  episodes_requested: number;
  episodes_assigned: number;
  deadline: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  status_history?: StatusHistoryItem[];
  assignments?: AssignmentItem[];
}

export interface Episode {
  id: number;
  episode_id: string;
  robot_id: string;
  task_name: string;
  recorded_at: string;
  duration_seconds: number;
  operator_name: string;
  quality: string;
  created_at: string;
  assigned_to_request_id: number | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ImportError {
  row: number;
  episode_id: string | null;
  reason: string;
}

export interface ImportReport {
  imported: number;
  skipped: number;
  errors: ImportError[];
}

export interface AnalyticsData {
  episodes_per_day_robot: { date: string; robot_id: string; count: number }[];
  requests_by_status: { status: string; count: number }[];
  median_delivery_hours: number | null;
  top_tasks: { task_name: string; count: number }[];
}
