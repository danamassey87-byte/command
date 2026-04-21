import { useState, useEffect } from 'react'
import { Badge } from './ui/index.jsx'
import * as DB from '../lib/supabase.js'

// Generate prep flags from weather data
function generatePrepFlags(forecast) {
  const flags = []
  if (!forecast) return flags

  const temp = forecast.temperature ?? forecast.temp
  const humidity = forecast.humidity
  const wind = forecast.windSpeed ?? forecast.wind_speed
  const condition = (forecast.shortForecast ?? forecast.condition ?? '').toLowerCase()

  // Arizona-specific heat warnings
  if (temp && temp >= 110) {
    flags.push({ flag: 'Extreme heat', severity: 'danger', suggestion: 'Consider canceling or rescheduling. Have ice water stations and A/C on max.' })
  } else if (temp && temp >= 100) {
    flags.push({ flag: 'Heat advisory', severity: 'warn', suggestion: 'Bottled water for visitors. Arrive early to cool the house. Remind attendees to stay hydrated.' })
  } else if (temp && temp >= 90) {
    flags.push({ flag: 'Hot day', severity: 'info', suggestion: 'Have cold water available. Close blinds on sun-facing windows before showtime.' })
  }

  if (condition.includes('rain') || condition.includes('storm') || condition.includes('thunder')) {
    flags.push({ flag: 'Rain expected', severity: 'warn', suggestion: 'Put out entry mats. Consider umbrella station at door. Move directional signs to covered areas.' })
  }

  if (condition.includes('dust') || condition.includes('haboob')) {
    flags.push({ flag: 'Dust advisory', severity: 'warn', suggestion: 'Close all windows/doors. Wipe surfaces right before start. Warn attendees via social.' })
  }

  if (wind && wind > 25) {
    flags.push({ flag: 'High wind', severity: 'warn', suggestion: 'Secure directional signs. Weighted sign holders recommended.' })
  }

  if (humidity && humidity < 10) {
    flags.push({ flag: 'Very dry air', severity: 'info', suggestion: 'Static-prone. Consider a small humidifier for staging comfort.' })
  }

  if (flags.length === 0) {
    flags.push({ flag: 'Good conditions', severity: 'ok', suggestion: 'No weather concerns. Great day for an open house!' })
  }

  return flags
}

const severityColors = {
  danger: { bg: 'rgba(192,96,74,.08)', border: '#c0604a', text: '#c0604a', dot: '#c0604a' },
  warn:   { bg: 'rgba(201,154,46,.08)', border: '#c99a2e', text: '#c99a2e', dot: '#c99a2e' },
  info:   { bg: 'transparent', border: 'var(--color-border, #C8C3B9)', text: 'var(--brown-warm)', dot: 'var(--brown-mid)' },
  ok:     { bg: 'rgba(139,154,123,.06)', border: 'var(--sage-green, #8B9A7B)', text: '#566b4a', dot: '#8B9A7B' },
}

export default function WeatherPrepFlags({ propertyId, ohDate, latitude, longitude }) {
  const [forecast, setForecast] = useState(null)
  const [prepFlags, setPrepFlags] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!latitude || !longitude || !ohDate) return

    async function fetchWeather() {
      setLoading(true)
      setError(null)
      try {
        // Check DB cache first
        if (propertyId) {
          const cached = await DB.getWeatherForecast(propertyId, ohDate)
          if (cached) {
            setForecast(cached.forecast)
            setPrepFlags(cached.prep_flags?.length ? cached.prep_flags : generatePrepFlags(cached.forecast))
            setLoading(false)
            return
          }
        }

        // Fetch from NWS (free, no API key)
        const pointRes = await fetch(`https://api.weather.gov/points/${latitude},${longitude}`, {
          headers: { 'User-Agent': 'AntigravityRE/1.0 (dana@antigravityre.com)' },
        })
        if (!pointRes.ok) throw new Error('Weather service unavailable')
        const pointData = await pointRes.json()
        const forecastUrl = pointData.properties?.forecast
        if (!forecastUrl) throw new Error('No forecast URL')

        const fcRes = await fetch(forecastUrl, {
          headers: { 'User-Agent': 'AntigravityRE/1.0 (dana@antigravityre.com)' },
        })
        if (!fcRes.ok) throw new Error('Forecast unavailable')
        const fcData = await fcRes.json()

        // Find the period matching OH date
        const ohDateObj = new Date(ohDate + 'T12:00:00')
        const period = (fcData.properties?.periods ?? []).find(p => {
          const pDate = new Date(p.startTime)
          return pDate.toDateString() === ohDateObj.toDateString() && p.isDaytime
        }) || fcData.properties?.periods?.[0]

        if (period) {
          const weatherData = {
            temperature: period.temperature,
            temperatureUnit: period.temperatureUnit,
            humidity: period.relativeHumidity?.value,
            windSpeed: parseInt(period.windSpeed) || 0,
            windDirection: period.windDirection,
            shortForecast: period.shortForecast,
            detailedForecast: period.detailedForecast,
            icon: period.icon,
          }
          const flags = generatePrepFlags(weatherData)
          setForecast(weatherData)
          setPrepFlags(flags)

          // Cache to DB
          if (propertyId) {
            DB.upsertWeatherForecast({
              property_id: propertyId,
              forecast_date: ohDate,
              forecast: weatherData,
              prep_flags: flags,
            }).catch(() => {}) // silent cache failure
          }
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [propertyId, ohDate, latitude, longitude])

  if (!latitude || !longitude) return null

  if (loading) {
    return (
      <div style={{ padding: '10px 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        Loading weather forecast...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '8px 12px', fontSize: '0.78rem', color: '#c0604a', background: 'rgba(192,96,74,.06)', borderRadius: 6 }}>
        Weather: {error}
      </div>
    )
  }

  if (!forecast) return null

  return (
    <div style={{
      background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 8,
      border: '1px solid var(--color-border, #C8C3B9)', overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Weather summary */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: prepFlags.length ? '1px solid var(--color-border)' : 'none',
      }}>
        <div style={{
          fontSize: '2rem', lineHeight: 1,
          fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
          color: 'var(--brown-dark)',
        }}>
          {forecast.temperature}°{forecast.temperatureUnit || 'F'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
            {forecast.shortForecast}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Wind {forecast.windSpeed} mph {forecast.windDirection}
            {forecast.humidity != null ? ` · ${forecast.humidity}% humidity` : ''}
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
          color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.08em',
        }}>
          Prep Flags
        </div>
      </div>

      {/* Prep flags */}
      {prepFlags.length > 0 && (
        <div style={{ padding: '8px 12px' }}>
          {prepFlags.map((flag, i) => {
            const s = severityColors[flag.severity] || severityColors.info
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px',
                background: s.bg, borderRadius: 6, marginBottom: 4,
                borderLeft: `3px solid ${s.border}`,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: s.dot,
                  flexShrink: 0, marginTop: 5,
                }} />
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: s.text }}>{flag.flag}</span>
                  <p style={{ fontSize: '0.72rem', color: 'var(--brown-warm)', margin: '2px 0 0', lineHeight: 1.4 }}>
                    {flag.suggestion}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
