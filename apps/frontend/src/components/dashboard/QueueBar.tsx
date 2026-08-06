'use client'

import { useState, useEffect, useRef } from 'react'

type QueueStats = {
  waiting: number
  todayTotal: number
  dailyAverage: number
  dailyRecord: number
}

export default function QueueBar() {
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [justBrokeRecord, setJustBrokeRecord] = useState(false)
  const [popWaiting, setPopWaiting] = useState(false)
  const [popToday, setPopToday] = useState(false)

  // Refs pour éviter le bug de closure stale dans le useEffect([])
  const initialRecordRef = useRef(0)
  const hasLoadedRef = useRef(false)
  const prevWaitingRef = useRef(0)
  const prevTodayRef = useRef(0)
  const recordTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/queue-stats')
        if (!res.ok) return
        const data: QueueStats = await res.json()

        if (!hasLoadedRef.current) {
          initialRecordRef.current = data.dailyRecord
          hasLoadedRef.current = true
        }

        if (initialRecordRef.current > 0 && data.todayTotal > initialRecordRef.current) {
          setJustBrokeRecord(true)
          if (recordTimer.current) clearTimeout(recordTimer.current)
          recordTimer.current = setTimeout(() => setJustBrokeRecord(false), 3000)
        }

        if (data.waiting !== prevWaitingRef.current) setPopWaiting(true)
        if (data.todayTotal !== prevTodayRef.current) setPopToday(true)

        prevWaitingRef.current = data.waiting
        prevTodayRef.current = data.todayTotal
        setStats(data)
      } catch { /* silencieux */ }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  // Reset pop animation after 300ms
  useEffect(() => { if (popWaiting) { const t = setTimeout(() => setPopWaiting(false), 300); return () => clearTimeout(t) } }, [popWaiting])
  useEffect(() => { if (popToday) { const t = setTimeout(() => setPopToday(false), 300); return () => clearTimeout(t) } }, [popToday])

  if (!stats || stats.dailyRecord === 0) return null

  const todayMax = Math.max(stats.dailyRecord, stats.todayTotal, 1)
  const todayPct = Math.min((stats.todayTotal / todayMax) * 100, 100)
  const avgPct = (stats.dailyAverage / todayMax) * 100
  const recPct = (stats.dailyRecord / todayMax) * 100
  const isTense = stats.waiting > stats.dailyAverage * 0.3
  const isAboveAverage = stats.dailyAverage > 0 && stats.todayTotal > stats.dailyAverage

  return (
    <div className="mx-[10px] mt-3 rounded-lg border border-stone-100 bg-white px-3 py-2.5 shadow-sm">
      {/* Chiffres */}
      <div className="flex items-baseline justify-between">
        <div>
          <span className={`inline-block text-lg font-bold tabular-nums transition-all duration-300 ${
            popWaiting ? 'scale-110' : 'scale-100'
          } ${isTense ? 'text-cta-600' : 'text-stone-800'}`}>
            {stats.waiting}
          </span>
          <p className="text-[9px] text-stone-400 leading-none mt-0.5">en attente</p>
        </div>
        <div className="text-end">
          <span className={`inline-block text-lg font-bold tabular-nums transition-all duration-300 ${
            popToday ? 'scale-110' : 'scale-100'
          } ${isAboveAverage ? 'text-success-500' : 'text-stone-800'} ${justBrokeRecord ? 'ring-1 ring-cta-200 rounded' : ''}`}>
            {stats.todayTotal}
          </span>
          <p className="text-[10px] text-stone-600 leading-none mt-0.5">aujourd&apos;hui</p>
        </div>
      </div>

      {/* Ligne de progression */}
      <div className="relative mt-2.5 h-[3px] rounded-full bg-stone-200">
        <div
          className={`absolute inset-y-0 start-0 rounded-full transition-all duration-700 ease-out ${
            isAboveAverage ? 'bg-success-500' : 'bg-primary-500'
          }`}
          style={{ width: `${todayPct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-[5px] rounded-full bg-stone-400"
          style={{ left: `${avgPct}%` }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-[6px] rounded-[1px] rotate-45 transition-colors duration-500 ${
            justBrokeRecord ? 'bg-cta-500' : 'bg-stone-500'
          }`}
          style={{ left: `${recPct}%` }}
        />
      </div>

      {/* Labels sous les marqueurs */}
      <div className="relative h-3.5 mt-0.5">
        <span
          className="absolute -translate-x-1/2 text-[10px] font-medium text-stone-600"
          style={{ left: `${avgPct}%` }}
        >
          {stats.dailyAverage}
        </span>
        <span
          className="absolute -translate-x-1/2 text-[10px] font-medium text-stone-600"
          style={{ left: `${recPct}%` }}
        >
          {stats.dailyRecord}
        </span>
      </div>
    </div>
  )
}
