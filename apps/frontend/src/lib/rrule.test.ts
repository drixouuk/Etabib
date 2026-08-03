import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeRRule, ruleMatchesDate, slotOccursOn, nextOccurrenceDate, toDateKey } from './rrule'

test('describeRRule — règles en langage clair', () => {
  assert.equal(describeRRule('FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=1'), 'Toutes les semaines (lundi, mercredi)')
  assert.equal(describeRRule('FREQ=DAILY'), 'Tous les jours')
  assert.equal(describeRRule('FREQ=WEEKLY;BYDAY=TU;INTERVAL=2'), 'Toutes les 2 semaines (mardi)')
  assert.equal(describeRRule('FREQ=MONTHLY;INTERVAL=3'), 'Tous les 3 mois')
  assert.equal(describeRRule('FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231'), "Toutes les semaines (lundi) · jusqu'au 31/12/2026")
  assert.equal(describeRRule('FREQ=WEEKLY;BYDAY=MO;COUNT=10'), 'Toutes les semaines (lundi) · 10 fois')
  assert.equal(describeRRule(''), '')
  assert.equal(describeRRule(null), '')
  assert.equal(describeRRule('garbage'), '')
})

test('ruleMatchesDate — BYDAY local', () => {
  // 2026-08-10 = lundi
  assert.equal(ruleMatchesDate('FREQ=WEEKLY;BYDAY=MO', new Date('2026-08-10T12:00:00')), true)
  assert.equal(ruleMatchesDate('FREQ=WEEKLY;BYDAY=WE', new Date('2026-08-10T12:00:00')), false)
  assert.equal(ruleMatchesDate('FREQ=DAILY', new Date('2026-08-10T12:00:00')), true)
})

test('slotOccursOn — règle, fin de série, exceptions, legacy', () => {
  const monday = new Date('2026-08-10T12:00:00') // lundi
  const tuesday = new Date('2026-08-11T12:00:00')
  assert.equal(
    slotOccursOn({ dayOfWeek: '1', recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=1' }, monday),
    true,
  )
  assert.equal(
    slotOccursOn({ dayOfWeek: '1', recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=1' }, tuesday),
    false,
  )
  assert.equal(
    slotOccursOn({ dayOfWeek: '1', recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO', recurrenceEnd: '2026-08-09' }, monday),
    false,
  )
  assert.equal(
    slotOccursOn({ dayOfWeek: '1', recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO', exceptions: [{ date: '2026-08-10' }] }, monday),
    false,
  )
  assert.equal(slotOccursOn({ dayOfWeek: '1' }, monday), true)
  assert.equal(slotOccursOn({ dayOfWeek: '2' }, monday), false)
})

test('nextOccurrenceDate — prochaine occurrence', () => {
  const from = new Date('2026-08-06T12:00:00') // jeudi
  assert.equal(nextOccurrenceDate({ dayOfWeek: '1', recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=1' }, from), '2026-08-10')
  assert.equal(nextOccurrenceDate({ dayOfWeek: '6' }, from), '2026-08-08')
})

test('toDateKey — clé locale', () => {
  assert.equal(toDateKey(new Date(2026, 7, 10)), '2026-08-10')
})
