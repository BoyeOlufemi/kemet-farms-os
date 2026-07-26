import { CropLog, WhatsAppMessage, WeatherTrigger, Field, StaffMember, MediaItem, LedgerEntry, DispatchFeedback, MaintenanceItem } from '../types';

const LOCAL_STORAGE_KEY_PREFIX = 'kemet_farms_os_v10_';

// Initial state - initialized empty and populated strictly from Firestore / user operations
const initialFields: Field[] = [];
const initialStaff: StaffMember[] = [];
const initialCropLogs: CropLog[] = [];
const initialMessages: WhatsAppMessage[] = [];
const initialWeatherTriggers: WeatherTrigger[] = [];
const initialMediaItems: MediaItem[] = [];
const initialLedgerEntries: LedgerEntry[] = [];
const initialDispatchFeedbacks: DispatchFeedback[] = [];
const initialMaintenanceItems: MaintenanceItem[] = [];

// Helper to load or initialize from localStorage with in-memory fallback
const inMemoryCache = new Map<string, any>();

export function getStoredData<T>(key: string, fallback: T): T {
  const fullKey = LOCAL_STORAGE_KEY_PREFIX + key;
  if (inMemoryCache.has(fullKey)) {
    return inMemoryCache.get(fullKey) as T;
  }
  try {
    const data = localStorage.getItem(fullKey);
    if (data) {
      const parsed = JSON.parse(data);
      inMemoryCache.set(fullKey, parsed);
      return parsed;
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
}

export function setStoredData<T>(key: string, value: T): void {
  const fullKey = LOCAL_STORAGE_KEY_PREFIX + key;
  inMemoryCache.set(fullKey, value);

  try {
    let serializableValue: any = value;
    if (Array.isArray(value) && value.length > 80) {
      serializableValue = value.slice(0, 80);
    }
    localStorage.setItem(fullKey, JSON.stringify(serializableValue));
  } catch (e) {
    // Quota exceeded or restricted environment fallback
    try {
      if (Array.isArray(value)) {
        const trimmed = value.slice(0, 20);
        localStorage.setItem(fullKey, JSON.stringify(trimmed));
        return;
      }
    } catch {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(LOCAL_STORAGE_KEY_PREFIX) && k !== fullKey) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        localStorage.setItem(fullKey, JSON.stringify(value));
      } catch {
        // Retained safely in inMemoryCache
      }
    }
  }
}

export interface KemetDB {
  fields: Field[];
  staff: StaffMember[];
  cropLogs: CropLog[];
  messages: WhatsAppMessage[];
  weatherTriggers: WeatherTrigger[];
  mediaItems: MediaItem[];
  ledgerEntries: LedgerEntry[];
  dispatchFeedbacks: DispatchFeedback[];
  maintenanceItems: MaintenanceItem[];
}

export function loadDatabase(): KemetDB {
  return {
    fields: getStoredData<Field[]>('fields', initialFields),
    staff: getStoredData<StaffMember[]>('staff', initialStaff),
    cropLogs: getStoredData<CropLog[]>('croplogs', initialCropLogs),
    messages: getStoredData<WhatsAppMessage[]>('messages', initialMessages),
    weatherTriggers: getStoredData<WeatherTrigger[]>('weathertriggers', initialWeatherTriggers),
    mediaItems: getStoredData<MediaItem[]>('mediaitems', initialMediaItems),
    ledgerEntries: getStoredData<LedgerEntry[]>('ledgerentries', initialLedgerEntries),
    dispatchFeedbacks: getStoredData<DispatchFeedback[]>('dispatchfeedbacks', initialDispatchFeedbacks),
    maintenanceItems: getStoredData<MaintenanceItem[]>('maintenanceitems', initialMaintenanceItems)
  };
}

export function saveDatabase(db: KemetDB): void {
  setStoredData('fields', db.fields);
  setStoredData('staff', db.staff);
  setStoredData('croplogs', db.cropLogs);
  setStoredData('messages', db.messages);
  setStoredData('weathertriggers', db.weatherTriggers);
  setStoredData('mediaitems', db.mediaItems);
  setStoredData('ledgerentries', db.ledgerEntries);
  setStoredData('dispatchfeedbacks', db.dispatchFeedbacks);
  setStoredData('maintenanceitems', db.maintenanceItems);
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
