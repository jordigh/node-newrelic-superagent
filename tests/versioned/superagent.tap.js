/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const utils = require('@newrelic/test-utilities')

utils(tap)

const EXTERNAL_NAME = /External\/newrelic.com(:443)*\//

tap.test('SuperAgent instrumentation', (t) => {
  t.autoend()

  let helper = null
  let request = null
  t.beforeEach(() => {
    helper = utils.TestAgent.makeInstrumented()
    helper.registerInstrumentation({
      moduleName: 'superagent',
      type: 'generic',
      onRequire: require('../../lib/instrumentation'),
      onError: t.bailout
    })
    request = require('superagent')
  })
  t.afterEach(() => {
    helper.unload()
  })

  t.test('should maintain transaction context with callbacks', (t) => {
    helper.runInTransaction((tx) => {
      request.get('https://newrelic.com', function testCallback() {
        t.transaction(tx)
        t.segments(tx.trace.root, [
          {
            name: EXTERNAL_NAME,
            children: [{ name: 'Callback: testCallback' }]
          }
        ])
        t.end()
      })
    })
  })

  t.test('should maintain transaction context with promises', (t) => {
    helper.runInTransaction((tx) => {
      request.get('https://newrelic.com').then(function testThen() {
        t.transaction(tx)
        t.segments(tx.trace.root, [
          {
            name: EXTERNAL_NAME,
            children: [{ name: 'Callback: <anonymous>' }] // CB created by superagent
          }
        ])
        t.end()
      })
    })
  })
})
