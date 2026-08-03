import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseTimeInput, formatTimeInput, toTimeParts, isTimeInputValid } from './datetime'

test('shorthands flexibles → HH:MM', () => {
  assert.equal(parseTimeInput('0930'), '09:30')
  assert.equal(parseTimeInput('930'), '09:30')
  assert.equal(parseTimeInput('09.30'), '09:30')
  assert.equal(parseTimeInput('9,30'), '09:30')
  assert.equal(parseTimeInput('9h30'), '09:30')
  assert.equal(parseTimeInput('9H30'), '09:30')
  assert.equal(parseTimeInput('17:45'), '17:45')
  assert.equal(parseTimeInput('9'), '09:00')
  assert.equal(parseTimeInput('9 am'), '09:00')
  assert.equal(parseTimeInput('09:45 pm'), '21:45')
  assert.equal(parseTimeInput('12 am'), '00:00')
  assert.equal(parseTimeInput('12 pm'), '12:00')
  assert.equal(parseTimeInput(' 0930 '), '09:30')
})

test('chiffres arabes (٠-٩) et persans (۰-۹) normalisés', () => {
  assert.equal(parseTimeInput('٠٩:٣٠'), '09:30')
  assert.equal(parseTimeInput('٩٣٠'), '09:30')
  assert.equal(parseTimeInput('۹:۳۰'), '09:30')
  assert.equal(parseTimeInput('١٢٣٠'), '12:30')
  assert.equal(parseTimeInput('٩ am'), '09:00')
})

test('entrées invalides → null / vide', () => {
  assert.equal(toTimeParts('abc'), null)
  assert.equal(toTimeParts('25:00'), null)
  assert.equal(toTimeParts('12:60'), null)
  assert.equal(toTimeParts('24'), null)
  assert.equal(toTimeParts('13 am'), null)
  assert.equal(toTimeParts(''), null)
  assert.equal(parseTimeInput('abc'), '')
  assert.equal(parseTimeInput(''), '')
  assert.equal(formatTimeInput('abc'), '')
})

test('validation', () => {
  assert.equal(isTimeInputValid('12:00'), true)
  assert.equal(isTimeInputValid('9h30'), true)
  assert.equal(isTimeInputValid(''), true)
  assert.equal(isTimeInputValid('xyz'), false)
})
