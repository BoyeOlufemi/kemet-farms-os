export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
  lastLoginAt: string;
  role?: 'admin' | 'user';
  uploadedFilesCount?: number;
}

export interface MediaItem {
  id: string;
  field_id: string;
  crop_log_id?: string;
  category: 'plant_health' | 'receipt' | 'task_screenshot' | 'general';
  title: string;
  url: string; // Firebase Storage URL
  storage_path?: string;
  uploaded_by: string; // staff_id, email, or name
  userId?: string; // Firebase User UID
  userEmail?: string; // Firebase User Email
  amount_spent?: number; // For receipts
  notes?: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  manager_id: string; // staff_id
  manager_name: string;
  type: 'disbursement' | 'expense';
  category: 'Seed Fund' | 'Chemicals/Fertilizer' | 'Equipment' | 'Labor/Operations' | 'Other';
  amount: number;
  description: string;
  field_id?: string;
  receipt_url?: string; // Firebase Storage URL
  created_at: string;
  verified: boolean;
}

export interface DispatchFeedback {
  id: string;
  target_staff_id: string;
  field_id?: string;
  media_id?: string;
  type: 'instruction' | 'feedback' | 'status_ping';
  body: string;
  response_note?: string;
  status: 'sent' | 'read' | 'resolved';
  created_at: string;
}

export interface MaintenanceItem {
  id: string;
  field_id: string;
  crop_type: 'PALM' | 'SOYBEAN';
  title: string;
  category: 'Fertilization' | 'Weed Control' | 'Pruning' | 'Irrigation' | 'Pest Control';
  frequency: 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly';
  due_date: string; // YYYY-MM-DD
  status: 'due_today' | 'upcoming' | 'overdue' | 'completed';
  assigned_staff_id: string;
  last_completed_at?: string;
  completion_notes?: string;
  evidence_url?: string;
}
