import { CropLog, WhatsAppMessage, WeatherTrigger, Field, StaffMember } from '../types';

const LOCAL_STORAGE_KEY_PREFIX = 'kemet_farms_os_';

// Seed Data
const initialFields: Field[] = [
  { id: 'field-1', name: 'Field A (North Palm)', sizeHectares: 1.5, crop_type: 'PALM', seedlingCount: 160, soilMoisture: 45, currentTask: 'Weed ring clearance' },
  { id: 'field-2', name: 'Field B (Intercropped Soy)', sizeHectares: 2.0, crop_type: 'SOYBEAN', soilMoisture: 60, currentTask: 'Soil hydration mapping' },
  { id: 'field-3', name: 'Field C (South Palm)', sizeHectares: 1.0, crop_type: 'PALM', seedlingCount: 100, soilMoisture: 40, currentTask: 'Fertilizer application' }
];

const initialStaff: StaffMember[] = [
  { id: 'staff-1', name: 'Ade Balogun', phone: '+2348011111111', role: 'Field Operator (Palm Specialist)', status: 'active' },
  { id: 'staff-2', name: 'Bisi Adebayo', phone: '+2348022222222', role: 'Irrigation Operator (Soybean)', status: 'active' },
  { id: 'staff-3', name: 'Chidi Okafor', phone: '+2348033333333', role: 'Field Assistant', status: 'active' }
];

const initialCropLogs: CropLog[] = [
  {
    id: 'log-1',
    field_id: 'field-1',
    crop_type: 'PALM',
    action_type: 'Weed ring clearance',
    action_status: 'todo',
    staff_id: 'staff-1',
    recorded_at: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'log-2',
    field_id: 'field-2',
    crop_type: 'SOYBEAN',
    action_type: 'Soil hydration mapping',
    action_status: 'todo',
    staff_id: 'staff-2',
    recorded_at: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
  },
  {
    id: 'log-3',
    field_id: 'field-3',
    crop_type: 'PALM',
    action_type: 'Fertilizer application',
    action_status: 'done',
    staff_id: 'staff-3',
    recorded_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    verified_at: new Date(Date.now() - 86400000 + 1800000).toISOString()
  }
];

const initialMessages: WhatsAppMessage[] = [
  {
    id: 'msg-1',
    from_number: '+14155238886',
    to_number: '+2348011111111',
    direction: 'outbound',
    body: '🌹 Kemet daily task: Weed ring clearance on PALM at Field A (North Palm). Reply done when complete, or conflict if blocked.',
    created_at: new Date(Date.now() - 3600000 * 2.1).toISOString()
  },
  {
    id: 'msg-2',
    from_number: '+14155238886',
    to_number: '+2348022222222',
    direction: 'outbound',
    body: '🌹 Kemet daily task: Soil hydration mapping on SOYBEAN at Field B (Intercropped Soy). Reply done when complete, or conflict if blocked.',
    created_at: new Date(Date.now() - 3600000 * 4.1).toISOString()
  }
];

const initialWeatherTriggers: WeatherTrigger[] = [
  {
    id: 'trig-1',
    field_id: 'field-1',
    trigger_type: 'NORMAL',
    payload: {
      temp_c: 28,
      rain_mm: 0,
      description: 'Sunny conditions with stable relative humidity.'
    },
    consumed: true,
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

// Helper to load or initialize from localStorage
export function getStoredData<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.error('Error reading localStorage', e);
    return fallback;
  }
}

export function setStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Error writing localStorage', e);
  }
}

export interface KemetDB {
  fields: Field[];
  staff: StaffMember[];
  cropLogs: CropLog[];
  messages: WhatsAppMessage[];
  weatherTriggers: WeatherTrigger[];
}

export function loadDatabase(): KemetDB {
  return {
    fields: getStoredData<Field[]>('fields', initialFields),
    staff: getStoredData<StaffMember[]>('staff', initialStaff),
    cropLogs: getStoredData<CropLog[]>('croplogs', initialCropLogs),
    messages: getStoredData<WhatsAppMessage[]>('messages', initialMessages),
    weatherTriggers: getStoredData<WeatherTrigger[]>('weathertriggers', initialWeatherTriggers)
  };
}

export function saveDatabase(db: KemetDB): void {
  setStoredData('fields', db.fields);
  setStoredData('staff', db.staff);
  setStoredData('croplogs', db.cropLogs);
  setStoredData('messages', db.messages);
  setStoredData('weathertriggers', db.weatherTriggers);
}

// BOT RESPONSES AND LOGIC ENGINE
export function handleInboundWhatsApp(
  db: KemetDB,
  fromPhone: string,
  messageBody: string
): { updatedDb: KemetDB; twilioPayload: any; responseMessage: string | null } {
  const normalizedBody = messageBody.trim().toLowerCase();
  const nowStr = new Date().toISOString();
  
  // Find Staff
  const senderStaff = db.staff.find(s => s.phone.replace(/\s+/g, '') === fromPhone.replace(/\s+/g, ''));
  
  // Create message log
  const incomingMsg: WhatsAppMessage = {
    id: crypto.randomUUID(),
    from_number: fromPhone,
    to_number: '+14155238886',
    direction: 'inbound',
    body: messageBody,
    created_at: nowStr
  };
  
  const updatedDb = { ...db };
  updatedDb.messages = [...db.messages, incomingMsg];

  // If staff is not registered
  if (!senderStaff) {
    const outboundBody = 'Kemet Bot: Your number is not registered on this Farm OS. Contact the farm office to activate your profile.';
    const outboundMsg: WhatsAppMessage = {
      id: crypto.randomUUID(),
      from_number: '+14155238886',
      to_number: fromPhone,
      direction: 'outbound',
      body: outboundBody,
      created_at: new Date(Date.now() + 500).toISOString()
    };
    updatedDb.messages = [...updatedDb.messages, outboundMsg];
    return {
      updatedDb,
      twilioPayload: {
        From: '+14155238886',
        To: fromPhone,
        Body: outboundBody,
        Status: 'sent'
      },
      responseMessage: outboundBody
    };
  }

  // If staff is inactive (unsubscribed)
  if (senderStaff.status === 'inactive' && normalizedBody !== 'join' && normalizedBody !== 'start') {
    const outboundBody = 'You are currently unsubscribed from Kemet alert systems. Reply "start" or contact the office to reactivate.';
    const outboundMsg: WhatsAppMessage = {
      id: crypto.randomUUID(),
      from_number: '+14155238886',
      to_number: fromPhone,
      direction: 'outbound',
      body: outboundBody,
      created_at: new Date(Date.now() + 500).toISOString()
    };
    updatedDb.messages = [...updatedDb.messages, outboundMsg];
    return {
      updatedDb,
      twilioPayload: { From: '+14155238886', To: fromPhone, Body: outboundBody },
      responseMessage: outboundBody
    };
  }

  let replyText = '';
  let associatedLogId: string | undefined = undefined;

  // Handle COMMANDS
  if (normalizedBody === 'stop' || normalizedBody === 'unsubscribe') {
    // Unsubscribe staff
    updatedDb.staff = db.staff.map(s => s.id === senderStaff.id ? { ...s, status: 'inactive' } : s);
    replyText = 'You have been removed from WhatsApp alerts. Contact the farm office to reactivate.';
  } 
  else if (normalizedBody === 'start' || normalizedBody === 'join') {
    // Re-subscribe staff
    updatedDb.staff = db.staff.map(s => s.id === senderStaff.id ? { ...s, status: 'active' } : s);
    replyText = 'Welcome back! You have been reactivated on Kemet Farms alerts. You will now receive daily tasks and weather warnings.';
  }
  else if (normalizedBody === 'status') {
    // Get recent logs for this staff member or general logs
    const recentLogs = db.cropLogs
      .filter(l => l.staff_id === senderStaff.id)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    
    if (recentLogs.length > 0) {
      const lastLog = recentLogs[0];
      const dateStr = new Date(lastLog.recorded_at).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      const field = db.fields.find(f => f.id === lastLog.field_id);
      const fieldName = field ? field.name : lastLog.field_id;
      replyText = `Last action for ${lastLog.crop_type} at ${fieldName} was "${lastLog.action_type}" (${lastLog.action_status.toUpperCase()}) on ${dateStr}.`;
    } else {
      replyText = 'No recent crop activity logs found for your profile. Contact your supervisor for task assignments.';
    }
  } 
  else if (normalizedBody === 'done' || normalizedBody === 'complete') {
    // Find latest active 'todo' task assigned to this operator
    const activeLogIdx = db.cropLogs.findIndex(l => l.staff_id === senderStaff.id && l.action_status === 'todo');
    
    if (activeLogIdx !== -1) {
      const activeLog = db.cropLogs[activeLogIdx];
      associatedLogId = activeLog.id;
      
      // Update action status in database
      const updatedLogs = [...db.cropLogs];
      updatedLogs[activeLogIdx] = {
        ...activeLog,
        action_status: 'done',
        recorded_at: nowStr
      };
      updatedDb.cropLogs = updatedLogs;
      
      const field = db.fields.find(f => f.id === activeLog.field_id);
      const fieldName = field ? field.name : activeLog.field_id;
      
      const nextAction = activeLog.crop_type === 'PALM' 
        ? 'monthly weed ring check' 
        : 'soil hydration mapping';
        
      replyText = `✅ ${activeLog.crop_type === 'PALM' ? 'Palm' : 'Soybean'} action confirmed for ${fieldName}. Next: ${nextAction}.`;
      
      // Clear currentTask on Field
      updatedDb.fields = db.fields.map(f => f.id === activeLog.field_id ? { ...f, currentTask: undefined } : f);
    } else {
      replyText = 'Kemet Bot: You do not have any pending daily tasks registered in the active schedule.';
    }
  } 
  else if (normalizedBody === 'conflict' || normalizedBody === 'blocked') {
    // Log a conflict for their active task
    const activeLogIdx = db.cropLogs.findIndex(l => l.staff_id === senderStaff.id && l.action_status === 'todo');
    
    if (activeLogIdx !== -1) {
      const activeLog = db.cropLogs[activeLogIdx];
      associatedLogId = activeLog.id;
      
      const updatedLogs = [...db.cropLogs];
      updatedLogs[activeLogIdx] = {
        ...activeLog,
        action_status: 'conflict',
        recorded_at: nowStr,
        notes: activeLog.notes ? `${activeLog.notes} | Blocked by operator` : 'Blocked by operator'
      };
      updatedDb.cropLogs = updatedLogs;
      
      const field = db.fields.find(f => f.id === activeLog.field_id);
      const fieldName = field ? field.name : activeLog.field_id;
      
      replyText = `⚠️ Conflict logged for ${fieldName} (${activeLog.crop_type === 'PALM' ? 'Palm' : 'Soybean'}). A supervisor will review. Reply status for an update.`;
      
      // Mark field with conflict label
      updatedDb.fields = db.fields.map(f => f.id === activeLog.field_id ? { ...f, currentTask: '⚠️ BLOCKED - ' + activeLog.action_type } : f);
    } else {
      replyText = 'Kemet Bot: You have no active task to mark as conflict. Reply status to view details.';
    }
  } 
  else {
    // Unknown command
    replyText = `Kemet Bot: Command unrecognized. Reply "done" if you completed your task, "conflict" if blocked, or "status" for recent logs.`;
  }

  // Create outbound reply log
  const outboundMsg: WhatsAppMessage = {
    id: crypto.randomUUID(),
    from_number: '+14155238886',
    to_number: fromPhone,
    direction: 'outbound',
    body: replyText,
    crop_log_id: associatedLogId,
    created_at: new Date(Date.now() + 500).toISOString()
  };
  
  updatedDb.messages = [...updatedDb.messages, outboundMsg];
  saveDatabase(updatedDb);

  // Twilio simulation mock payload
  const twilioPayload = {
    MessageSid: `SM${crypto.randomUUID().replace(/-/g, '').substring(0, 32)}`,
    From: `whatsapp:${fromPhone}`,
    To: 'whatsapp:+14155238886',
    Body: messageBody,
    SmsStatus: 'received',
    AccountSid: 'ACohxjkbpkonfbaalldqqw',
    BotReply: replyText,
    LogUpdated: associatedLogId || 'None'
  };

  return {
    updatedDb,
    twilioPayload,
    responseMessage: replyText
  };
}

// Supervior triggers: Generate outbound tasks
export function assignDailyTask(
  db: KemetDB,
  fieldId: string,
  actionType: string,
  staffId: string
): KemetDB {
  const field = db.fields.find(f => f.id === fieldId);
  const staff = db.staff.find(s => s.id === staffId);
  if (!field || !staff) return db;

  const nowStr = new Date().toISOString();
  
  // Create crop log
  const newLog: CropLog = {
    id: crypto.randomUUID(),
    field_id: fieldId,
    crop_type: field.crop_type,
    action_type: actionType,
    action_status: 'todo',
    staff_id: staffId,
    recorded_at: nowStr
  };

  // Create outbound WhatsApp message
  const outboundBody = `🌹 Kemet daily task: ${actionType} on ${field.crop_type} at ${field.name}. Reply done when complete, or conflict if blocked.`;
  const newMsg: WhatsAppMessage = {
    id: crypto.randomUUID(),
    from_number: '+14155238886',
    to_number: staff.phone,
    direction: 'outbound',
    body: outboundBody,
    crop_log_id: newLog.id,
    created_at: nowStr
  };

  const updatedDb = {
    ...db,
    cropLogs: [...db.cropLogs, newLog],
    messages: [...db.messages, newMsg],
    fields: db.fields.map(f => f.id === fieldId ? { ...f, currentTask: actionType } : f)
  };

  saveDatabase(updatedDb);
  return updatedDb;
}

// Trigger Weather alerts
export function triggerWeatherAlert(
  db: KemetDB,
  fieldId: string,
  triggerType: 'RAIN' | 'HEAT',
  metricVal: number
): KemetDB {
  const field = db.fields.find(f => f.id === fieldId);
  if (!field) return db;

  const nowStr = new Date().toISOString();
  let triggerMsgBody = '';
  let payload: any = {};

  if (triggerType === 'RAIN') {
    const holdHours = Math.ceil(metricVal / 6) + 1; // Rain mm dependent
    triggerMsgBody = `🌧️ Rain alert for ${field.name}: ${metricVal}mm expected in the next hour. Hold fertilizer and irrigation for ${holdHours} hours.`;
    payload = { rain_mm: metricVal, hold_hours: holdHours, description: 'High probability of precipitous rain.' };
  } else {
    triggerMsgBody = `🌡️ Heat alert for ${field.name}: temp above ${metricVal}°C. Increase hydration checks for ${field.crop_type} rows.`;
    payload = { temp_c: metricVal, description: 'Extreme solar heat index warning.' };
  }

  // Create weather trigger log
  const newTrigger: WeatherTrigger = {
    id: crypto.randomUUID(),
    field_id: fieldId,
    trigger_type: triggerType,
    payload,
    consumed: false,
    created_at: nowStr
  };

  // Send WhatsApp messages to ALL active staff working in this crop category
  const activeStaff = db.staff.filter(s => s.status === 'active');
  const outboundMessages: WhatsAppMessage[] = activeStaff.map(staff => ({
    id: crypto.randomUUID(),
    from_number: '+14155238886',
    to_number: staff.phone,
    direction: 'outbound',
    body: triggerMsgBody,
    created_at: new Date(Date.now() + 100).toISOString()
  }));

  // Create automatic logs for task hold/alert
  const automaticLogs: CropLog[] = [];
  if (triggerType === 'RAIN') {
    automaticLogs.push({
      id: crypto.randomUUID(),
      field_id: fieldId,
      crop_type: field.crop_type,
      action_type: 'Hold fertilizer and irrigation (Rain warning)',
      action_status: 'todo',
      staff_id: activeStaff[0]?.id || 'staff-1',
      weather_trigger_id: newTrigger.id,
      recorded_at: nowStr,
      notes: `Triggered automatically by ${metricVal}mm rain forecast`
    });
  } else {
    automaticLogs.push({
      id: crypto.randomUUID(),
      field_id: fieldId,
      crop_type: field.crop_type,
      action_type: 'Increase hydration checks (Heat alert)',
      action_status: 'todo',
      staff_id: activeStaff[1]?.id || 'staff-2',
      weather_trigger_id: newTrigger.id,
      recorded_at: nowStr,
      notes: `Triggered automatically by ${metricVal}°C heat spike`
    });
  }

  const updatedDb = {
    ...db,
    weatherTriggers: [...db.weatherTriggers, newTrigger],
    messages: [...db.messages, ...outboundMessages],
    cropLogs: [...db.cropLogs, ...automaticLogs],
    fields: db.fields.map(f => {
      if (f.id === fieldId) {
        // Adjust soil moisture and currentTask
        const adjustment = triggerType === 'RAIN' ? metricVal : -5;
        return {
          ...f,
          soilMoisture: Math.max(0, Math.min(100, f.soilMoisture + adjustment)),
          currentTask: triggerType === 'RAIN' ? '🌧️ Fertilization On Hold' : '🌡️ Extreme Hydration Mode'
        };
      }
      return f;
    })
  };

  saveDatabase(updatedDb);
  return updatedDb;
}
