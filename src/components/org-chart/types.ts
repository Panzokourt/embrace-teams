export interface OrgPosition {
  id: string;
  company_id: string;
  user_id: string | null;
  parent_position_id: string | null;
  position_title: string;
  department: string | null;
  level: number;
  sort_order: number;
  color: string;
  user?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    job_title?: string | null;
    phone?: string | null;
    department?: string | null;
  };
  children?: OrgPosition[];
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  job_title?: string | null;
  department?: string | null;
  phone?: string | null;
}
