export interface CropLog {
  id: string;
  field_id: string;
  crop_type: 'PALM' | 'SOYBEAN';
  action_type: string;
  action_status: 'todo' | 'done' | 'conflict';
  staff_id: string;
  weather_trigger_id?: string;
  notes?: string;
  recorded_at: string;
  verified_at?: string;
}

export interface WhatsAppMessage {
  id: string;
  from_number: string;
  to_number: string;
  direction: 'inbound' | 'outbound';
  body: string;
  crop_log_id?: string;
  created_at: string;
}

export interface WeatherTrigger {
  id: string;
  field_id: string;
  trigger_type: 'RAIN' | 'HEAT' | 'NORMAL';
  payload: {
    temp_c?: number;
    rain_mm?: number;
    hold_hours?: number;
    description: string;
  };
  consumed: boolean;
  created_at: string;
}

export interface Field {
  id: string;
  name: string;
  sizeHectares: number;
  crop_type: 'PALM' | 'SOYBEAN';
  seedlingCount?: number;
  soilMoisture: number; // calculated balance or status
  currentTask?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive';
}
