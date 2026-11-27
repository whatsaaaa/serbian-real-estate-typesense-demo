import assert from 'node:assert/strict'
import { test } from 'node:test'
import { splitFilter } from '../shared/search.ts'

test('splitFilter gives each condition of an && chain apart', () => {
  assert.deepEqual(splitFilter('property_type:=`stan` && rooms:=3 && neighbourhood:=`Dorćol`'), [
    'property_type:=`stan`',
    'rooms:=3',
    'neighbourhood:=`Dorćol`',
  ])
})

test('splitFilter keeps an || in parentheses in its condition', () => {
  assert.deepEqual(
    splitFilter('property_type:=`stan` && (neighbourhood:=`Neimar` || neighbourhood:=`Senjak`)'),
    ['property_type:=`stan`', '(neighbourhood:=`Neimar` || neighbourhood:=`Senjak`)'],
  )
})

test('splitFilter keeps a filter with an || outside parentheses whole', () => {
  // Typesense runs it as (stan && Neimar) || Senjak, so it is no && chain of two conditions
  const filter = 'property_type:=`stan` && neighbourhood:=`Neimar` || neighbourhood:=`Senjak`'
  assert.deepEqual(splitFilter(filter), [filter])
})

test('splitFilter reads an && or || in backticks as part of the value', () => {
  assert.deepEqual(splitFilter('title:=`Kuća || vila && bašta` && rooms:=4'), [
    'title:=`Kuća || vila && bašta`',
    'rooms:=4',
  ])
})
