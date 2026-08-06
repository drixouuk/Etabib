import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseRRule,
  nextOccurrence,
  nextOccurrenceAfter,
  matchesRRuleByday,
  expandSeries,
} from './recurrence'

test('parseRRule : FREQ/INTERVAL/BYDAY/UNTIL/COUNT + préfixe RRULE:', () => {
  assert.equal(parseRRule('FREQ=WEEKLY;BYDAY=MO,TH;INTERVAL=1;COUNT=10')?.freq, 'WEEKLY')
  assert.equal(parseRRule('FREQ=WEEKLY;BYDAY=MO,TH;INTERVAL=1;COUNT=10')?.byday.join(','), '1,4')
  assert.equal(parseRRule('FREQ=DAILY')?.interval, 1)
  assert.equal(parseRRule('RRULE:FREQ=MONTHLY;UNTIL=20261231')?.until?.toISOString().slice(0, 10), '2026-12-31')
  assert.equal(parseRRule('FREQ=HOURLY'), null)
  assert.equal(parseRRule(''), null)
})

test('clamp mensuel : 31 mars + 1 mois → 30 avril', () => {
  assert.equal(nextOccurrence('2026-03-31', 'FREQ=MONTHLY;INTERVAL=1'), '2026-04-30')
  assert.equal(nextOccurrence('2026-01-31', 'FREQ=MONTHLY;INTERVAL=1'), '2026-02-28')
})

test('29 février → 28 février les années non bissextiles', () => {
  assert.equal(nextOccurrence('2024-02-29', 'FREQ=YEARLY;INTERVAL=1'), '2025-02-28')
  assert.equal(nextOccurrence('2024-02-29', 'FREQ=YEARLY;INTERVAL=1;UNTIL=20260228'), '2025-02-28')
})

test('FREQ=DAILY;BYDAY compte des JOURS (chaque jour ouvré)', () => {
  // 2026-08-03 est un lundi
  assert.equal(nextOccurrence('2026-08-03', 'FREQ=DAILY;BYDAY=MO,WE,FR'), '2026-08-05')
  assert.equal(nextOccurrence('2026-08-05', 'FREQ=DAILY;BYDAY=MO,WE,FR'), '2026-08-07')
  assert.equal(nextOccurrence('2026-08-07', 'FREQ=DAILY;BYDAY=MO,WE,FR'), '2026-08-10')
})

test('FREQ=WEEKLY;BYDAY saute des semaines', () => {
  assert.equal(nextOccurrence('2026-08-03', 'FREQ=WEEKLY;BYDAY=WE,FR;INTERVAL=1'), '2026-08-05')
  assert.equal(nextOccurrence('2026-08-03', 'FREQ=WEEKLY;BYDAY=MO;INTERVAL=2'), '2026-08-17')
})

test('UNTIL met fin à la série', () => {
  assert.equal(nextOccurrence('2026-08-03', 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20260810'), '2026-08-10')
  assert.equal(nextOccurrence('2026-08-10', 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20260810'), null)
})

test('COUNT inclut les dates exclues (RFC 5545)', () => {
  // 3 occurrences générées, 1 exclue → 2 visibles
  const dates = expandSeries(
    { start: '2026-08-03', rule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=3', exceptions: ['2026-08-10'] },
    '2026-08-01',
    '2026-08-31',
  )
  assert.deepEqual(dates, ['2026-08-03', '2026-08-17'])
})

test('exceptions sautées, endDate borne la série', () => {
  const dates = expandSeries(
    { start: '2026-08-03', rule: 'FREQ=WEEKLY;BYDAY=MO', exceptions: ['2026-08-03', '2026-08-17'], endDate: '2026-08-31' },
    '2026-08-01',
    '2026-09-30',
  )
  assert.deepEqual(dates, ['2026-08-10', '2026-08-24', '2026-08-31'])
})

test('nextOccurrenceAfter rattrape les séries en retard (boucle bornée)', () => {
  assert.equal(nextOccurrenceAfter('2026-08-03', 'FREQ=WEEKLY;BYDAY=MO', '2026-08-20'), '2026-08-24')
  assert.equal(nextOccurrenceAfter('2026-08-03', 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20260810', '2026-08-20'), null)
})

test('matchesRRuleByday', () => {
  assert.equal(matchesRRuleByday('2026-08-10', 'FREQ=WEEKLY;BYDAY=MO'), true)
  assert.equal(matchesRRuleByday('2026-08-11', 'FREQ=WEEKLY;BYDAY=MO'), false)
  assert.equal(matchesRRuleByday('2026-08-11', 'FREQ=DAILY'), true)
  assert.equal(matchesRRuleByday('2026-08-11', 'invalid'), true)
})

test('expansion bornée : règle invalide → []', () => {
  assert.deepEqual(expandSeries({ start: '2026-08-03', rule: 'FREQ=HOURLY' }, '2026-08-01', '2026-08-31'), [])
})
