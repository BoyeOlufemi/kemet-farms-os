import React, { useState, useEffect } from 'react';
import { Field } from '../types';
import { CloudRain, Sun, Cloud, AlertCircle, Thermometer, Droplets, Info, Play, RefreshCw, BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface WeatherTriggerPanelProps {
  fields: Field[];
  onTriggerAlert: (fieldId: string, alertType: 'RAIN' | 'HEAT', metricVal: number) => void;
  onClearWeatherAlerts: () => void;
}

export default function WeatherTriggerPanel({
  fields,
  onTriggerAlert,
  onClearWeatherAlerts
}: WeatherTriggerPanelProps) {
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<any[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  // Weather inputs state
  const [selectedField, setSelectedField] = useState(fields[0]?.id || '');
  const [rainAmount, setRainAmount] = useState(12);
  const [heatTemp, setHeatTemp] = useState(37);

  // Fetch actual Open-Meteo data
  useEffect(() => {
    async function fetchWeather() {
      try {
        setLoading(true);
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=7.6244&longitude=4.7410&daily=temperature_2m_max,temperature_2m_min,rain_sum,et0_fao_evapotranspiration,shortwave_radiation_sum&timezone=Africa%2FLagos';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch from Open-Meteo');
        const data = await res.json();
        
        // Parse daily data
        const daily = data.daily;
        const formatted = daily.time.map((time: string, idx: number) => {
          const rain = daily.rain_sum[idx] || 0;
          const et0 = daily.et0_fao_evapotranspiration[idx] || 0;
          const balance = rain - et0;
          return {
            date: new Date(time).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric' }),
            tempMax: daily.temperature_2m_max[idx],
            tempMin: daily.temperature_2m_min[idx],
            rainSum: rain,
            et0Evap: et0,
            waterBalance: parseFloat(balance.toFixed(2)),
            radiation: daily.shortwave_radiation_sum[idx]
          };
        });
        setForecast(formatted);
        setApiError(null);
      } catch (err: any) {
        console.warn('Open-Meteo fetch failed, using fallback simulated telemetry', err);
        setApiError('API Rate Limit/Offline — displaying fallback Nigeria forecast model.');
        
        // Highly realistic simulated fallback data matching Ilesha climatology
        const mockDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const formatted = mockDays.map((day, idx) => {
          const rain = idx === 2 ? 15 : idx === 5 ? 8 : 0; // rain on Wed and Sat
          const et0 = 3.8 + Math.random() * 1.5;
          const balance = rain - et0;
          return {
            date: `${day}, ${18 + idx} Jul`,
            tempMax: 30 + Math.floor(Math.random() * 7),
            tempMin: 22 + Math.floor(Math.random() * 3),
            rainSum: rain,
            et0Evap: parseFloat(et0.toFixed(2)),
            waterBalance: parseFloat(balance.toFixed(2)),
            radiation: 18 + Math.random() * 6
          };
        });
        setForecast(formatted);
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
  }, []);

  const handleRainTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    onTriggerAlert(selectedField, 'RAIN', rainAmount);
    alert(`🌧️ n8n Prediction: Expecting ${rainAmount}mm rain. Outbound WhatsApp alerts dispatched to staff!`);
  };

  const handleHeatTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    onTriggerAlert(selectedField, 'HEAT', heatTemp);
    alert(`🌡️ n8n Prediction: Solar temperature spike of ${heatTemp}°C. Outbound WhatsApp alerts dispatched to staff!`);
  };

  // Find active weather logs or alerts
  const todayForecast = forecast[0] || { tempMax: 33, rainSum: 0, waterBalance: -4.5 };

  return (
    <div className="space-y-6" id="weather_trigger_panel">
      {/* Real-time Weather Telemetry */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <span className="text-3xs uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">Live Open-Meteo Integration</span>
            <h3 className="text-lg font-semibold font-display text-slate-800 mt-1.5">Ilesha Region Meteorological Forecast</h3>
            <p className="text-xs text-gray-500 mt-0.5">Coordinates: <span className="font-mono">7.6244° N, 4.7410° E</span> (Lagos Timezone)</p>
          </div>
          
          <div className="flex items-center space-x-2">
            {apiError && (
              <span className="text-3xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 font-medium">
                {apiError}
              </span>
            )}
            <button
              onClick={() => window.location.reload()}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-gray-600 rounded-lg transition-colors border border-gray-100 cursor-pointer"
              title="Refresh meteorological feeds"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center space-x-2 text-gray-400">
            <RefreshCw className="animate-spin text-emerald-500" size={20} />
            <span className="text-xs font-medium">Fetching real-time climatology charts...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Today Summary */}
            <div className="lg:col-span-4 bg-slate-50 rounded-2xl p-5 border border-gray-100 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-2xs font-semibold text-gray-400 block uppercase">TODAY'S CLIMATOLOGY</span>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-3xl font-bold font-display text-slate-800">{todayForecast.tempMax}°C</h4>
                    <p className="text-2xs text-gray-400 mt-0.5">Min: {todayForecast.tempMin}°C • Overcast</p>
                  </div>
                  {todayForecast.rainSum > 0 ? (
                    <CloudRain className="text-blue-500 animate-bounce" size={44} />
                  ) : todayForecast.tempMax > 34 ? (
                    <Sun className="text-amber-500 animate-pulse" size={44} />
                  ) : (
                    <Cloud className="text-gray-400" size={44} />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-200/60 pt-4">
                  <div className="space-y-1">
                    <span className="text-3xs font-semibold text-gray-400 block">RAIN EXPECTED</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Droplets size={12} className="text-blue-500" />
                      <span>{todayForecast.rainSum} mm</span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-3xs font-semibold text-gray-400 block">EVAPOTRANSPIRATION</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Sun size={12} className="text-amber-500" />
                      <span>{todayForecast.et0Evap} mm</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-950 text-emerald-200 p-3.5 rounded-xl border border-emerald-900 mt-6 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-400">calculated water balance</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold font-mono text-white">{todayForecast.waterBalance} mm</span>
                  <span className="text-3xs text-emerald-300">Rain Sum - ET0</span>
                </div>
                <p className="text-[9px] text-emerald-300/80 leading-relaxed mt-1">
                  {todayForecast.waterBalance < -2 
                    ? '⚠️ Deficit (Dry soil trend): Irrigation mapping check required.' 
                    : '✅ Balanced hydration: Ideal fertilizer absorption matrix.'}
                </p>
              </div>
            </div>

            {/* Recharts Evapotranspiration Balance Graph */}
            <div className="lg:col-span-8 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-1">Water Hydration Balance Trend (7-Day Forecast)</h4>
                <p className="text-3xs text-gray-400">Positive balance represents net water storage. Negative values show soil moisture evaporation loss.</p>
              </div>

              <div className="h-40 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecast} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: '9px', fill: '#9ca3af' }} />
                    <YAxis style={{ fontSize: '9px', fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Area type="monotone" dataKey="waterBalance" name="Water Balance (mm)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#balanceGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* 7-day strip */}
              <div className="grid grid-cols-7 gap-1.5 text-center pt-2 border-t border-gray-100">
                {forecast.map((day, idx) => (
                  <div key={idx} className="bg-gray-50/70 py-1.5 rounded-lg border border-gray-100">
                    <span className="text-[9px] text-gray-400 block font-medium">{day.date.split(',')[0]}</span>
                    <span className="text-2xs font-bold text-gray-700 block mt-0.5">{day.tempMax}°C</span>
                    <span className="text-[9px] text-blue-500 font-semibold block">{day.rainSum > 0 ? `${day.rainSum}mm` : '0'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weather Automation Alert Simulator Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rain Alert Box */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <CloudRain size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-800">Trigger n8n Rain Alert Loop</h4>
              <p className="text-3xs text-gray-400">Simulate rain warnings to clear fertilizers</p>
            </div>
          </div>

          <form onSubmit={handleRainTrigger} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 flex justify-between">
                <span>Estimated Rain Volume</span>
                <span className="font-mono text-blue-600">{rainAmount} mm</span>
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={rainAmount}
                onChange={(e) => setRainAmount(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Select Field to Affect</label>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              >
                {fields.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.crop_type})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Play size={12} />
                <span>Inject Rain Trigger</span>
              </button>
              
              <button
                type="button"
                onClick={onClearWeatherAlerts}
                className="px-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl border border-gray-200 text-xs font-medium transition-colors cursor-pointer"
                title="Reset to stable weather conditions"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Heat Alert Box */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
              <Thermometer size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-800">Trigger n8n Heat Alert Loop</h4>
              <p className="text-3xs text-gray-400">Simulate heat spikes to trigger hydration checks</p>
            </div>
          </div>

          <form onSubmit={handleHeatTrigger} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 flex justify-between">
                <span>Estimated Solar Temperature</span>
                <span className="font-mono text-orange-600">{heatTemp}°C</span>
              </label>
              <input
                type="range"
                min="35"
                max="45"
                value={heatTemp}
                onChange={(e) => setHeatTemp(parseInt(e.target.value))}
                className="w-full accent-orange-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Select Field to Affect</label>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
              >
                {fields.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.crop_type})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Play size={12} />
                <span>Inject Heat Trigger</span>
              </button>

              <button
                type="button"
                onClick={onClearWeatherAlerts}
                className="px-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl border border-gray-200 text-xs font-medium transition-colors cursor-pointer"
                title="Reset to stable weather conditions"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
