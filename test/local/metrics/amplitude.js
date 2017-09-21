/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

const assert = require('insist')
const amplitudeModule = require('../../../lib/metrics/amplitude')
const mocks = require('../../mocks')

describe('metrics/amplitude', () => {
  it('interface is correct', () => {
    assert.equal(typeof amplitudeModule, 'function')
    assert.equal(amplitudeModule.length, 2)
  })

  it('throws if log argument is missing', () => {
    assert.throws(() => amplitudeModule(null, { oauth: { clientIds: {} } }))
  })

  it('throws if config argument is missing', () => {
    assert.throws(() => amplitudeModule({}, { oauth: { clientIds: null } }))
  })

  describe('instantiate', () => {
    let log, amplitude

    beforeEach(() => {
      log = mocks.spyLog()
      amplitude = amplitudeModule(log, {
        oauth: {
          clientIds: {
            0: 'amo',
            1: 'pocket'
          }
        }
      })
    })

    it('interface is correct', () => {
      assert.equal(typeof amplitude, 'function')
      assert.equal(amplitude.length, 2)
    })

    describe('empty event argument', () => {
      beforeEach(() => {
        return amplitude('', mocks.mockRequest({}))
      })

      it('called log.error correctly', () => {
        assert.equal(log.error.callCount, 1)
        assert.equal(log.error.args[0].length, 1)
        assert.deepEqual(log.error.args[0][0], {
          op: 'amplitudeMetrics',
          err: 'Bad argument',
          event: '',
          hasRequest: true
        })
      })

      it('did not call log.amplitudeEvent', () => {
        assert.equal(log.amplitudeEvent.callCount, 0)
      })
    })

    describe('missing request argument', () => {
      beforeEach(() => {
        return amplitude('foo')
      })

      it('called log.error correctly', () => {
        assert.equal(log.error.callCount, 1)
        assert.equal(log.error.args[0].length, 1)
        assert.deepEqual(log.error.args[0][0], {
          op: 'amplitudeMetrics',
          err: 'Bad argument',
          event: 'foo',
          hasRequest: false
        })
      })

      it('did not call log.amplitudeEvent', () => {
        assert.equal(log.amplitudeEvent.callCount, 0)
      })
    })

    describe('account.confirmed', () => {
      beforeEach(() => {
        return amplitude('account.confirmed', mocks.mockRequest({
          uaBrowser: 'foo',
          uaBrowserVersion: 'bar',
          uaOS: 'baz',
          uaOSVersion: 'qux',
          uaDeviceType: 'qux',
          uaFormFactor: 'qux',
          locale: 'wibble',
          credentials: {
            uid: 'blee'
          },
          devices: [ {}, {}, {} ],
          geo: {
            location: {
              country: 'United Kingdom',
              state: 'England',
            }
          },
          query: {
            service: '0'
          },
          payload: {
            metricsContext: {
              deviceId: 'juff',
              flowId: 'udge',
              flowBeginTime: 'kwop'
            }
          }
        }))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args.length, 1)
        assert.equal(args[0].device_id, 'juff')
        assert.equal(args[0].user_id, 'blee')
        assert.equal(args[0].event_type, 'fxa_login - email_confirmed')
        assert.equal(args[0].session_id, 'kwop')
        assert.equal(args[0].language, 'wibble')
        assert.deepEqual(args[0].event_properties, {
          service: '0'
        })
        assert.deepEqual(args[0].user_properties, {
          flow_id: 'udge',
          sync_device_count: 3,
          ua_browser: 'foo',
          ua_version: 'bar',
          ua_os: 'baz',
          user_country: 'United Kingdom',
          user_locale: 'wibble',
          user_state: 'England',
          '$append': {
            fxa_services_used: 'amo'
          }
        })
        assert.ok(args[0].time > Date.now() - 1000)
        assert.ok(/^[1-9][0-9]+$/.test(args[0].app_version))
      })
    })

    describe('account.created', () => {
      beforeEach(() => {
        return amplitude('account.created', mocks.mockRequest({
          uaBrowser: 'a',
          uaBrowserVersion: 'b',
          uaOS: 'c',
          uaOSVersion: 'd',
          uaDeviceType: 'd',
          uaFormFactor: 'd',
          locale: 'e',
          credentials: {
            uid: 'f'
          },
          devices: [],
          query: {
            service: '0'
          },
          payload: {
            service: '1'
          }
        }))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].device_id, undefined)
        assert.equal(args[0].user_id, 'f')
        assert.equal(args[0].event_type, 'fxa_reg - created')
        assert.equal(args[0].session_id, undefined)
        assert.equal(args[0].language, 'e')
        assert.deepEqual(args[0].event_properties, {
          service: '1'
        })
        assert.deepEqual(args[0].user_properties, {
          flow_id: undefined,
          sync_device_count: 0,
          ua_browser: 'a',
          ua_version: 'b',
          ua_os: 'c',
          user_country: 'United States',
          user_locale: 'e',
          user_state: 'California',
          '$append': {
            fxa_services_used: 'pocket'
          }
        })
      })
    })

    describe('account.login', () => {
      beforeEach(() => {
        return amplitude('account.login', mocks.mockRequest({
          query: {
            service: '2'
          }
        }, {
          devices: {}
        }))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_login - success')
        assert.equal(args[0].user_properties.sync_device_count, undefined)
        assert.equal(args[0].user_properties['$append'], undefined)
      })
    })

    describe('account.login.blocked', () => {
      beforeEach(() => {
        return amplitude('account.login.blocked', mocks.mockRequest({
          payload: {
            service: 'sync'
          }
        }))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_login - blocked')
        assert.deepEqual(args[0].user_properties['$append'], {
          fxa_services_used: 'sync'
        })
      })
    })

    describe('account.login.confirmedUnblockCode', () => {
      beforeEach(() => {
        return amplitude('account.login.confirmedUnblockCode', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_login - unblock_success')
      })
    })

    describe('account.reset', () => {
      beforeEach(() => {
        return amplitude('account.reset', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_login - forgot_complete')
      })
    })

    describe('account.signed', () => {
      beforeEach(() => {
        return amplitude('account.signed', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_activity - cert_signed')
      })
    })

    describe('account.verified', () => {
      beforeEach(() => {
        return amplitude('account.verified', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_reg - email_confirmed')
      })
    })

    describe('flow.complete (sign-up)', () => {
      beforeEach(() => {
        return amplitude('flow.complete', mocks.mockRequest({}), {}, {
          flowType: 'registration'
        })
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_reg - complete')
      })
    })

    describe('flow.complete (sign-in)', () => {
      beforeEach(() => {
        return amplitude('flow.complete', mocks.mockRequest({}), {}, {
          flowType: 'login'
        })
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_login - complete')
      })
    })

    describe('flow.complete (reset)', () => {
      beforeEach(() => {
        return amplitude('flow.complete', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('did not call log.amplitudeEvent', () => {
        assert.equal(log.amplitudeEvent.callCount, 0)
      })
    })

    describe('sms.installFirefox.sent', () => {
      beforeEach(() => {
        return amplitude('sms.installFirefox.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_sms - sent')
      })
    })

    describe('device.created', () => {
      beforeEach(() => {
        return amplitude('device.created', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('did not call log.amplitudeEvent', () => {
        assert.equal(log.amplitudeEvent.callCount, 0)
      })
    })

    describe('email.newDeviceLoginEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.newDeviceLoginEmail.bounced', mocks.mockRequest({}), {
          email_domain: 'gmail'
        })
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'login')
        assert.equal(args[0].event_properties.email_provider, 'gmail')
      })
    })

    describe('email.newDeviceLoginEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.newDeviceLoginEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'login')
        assert.equal(args[0].event_properties.email_provider, undefined)
      })
    })

    describe('email.passwordChangedEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.passwordChangedEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'change_password')
      })
    })

    describe('email.passwordChangedEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.passwordChangedEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'change_password')
      })
    })

    describe('email.passwordResetEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.passwordResetEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'reset_password')
      })
    })

    describe('email.passwordResetEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.passwordResetEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'reset_password')
      })
    })

    describe('email.passwordResetRequiredEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.passwordResetRequiredEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'reset_password')
      })
    })

    describe('email.passwordResetRequiredEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.passwordResetRequiredEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'reset_password')
      })
    })

    describe('email.postRemoveSecondaryEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.postRemoveSecondaryEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'secondary_email')
      })
    })

    describe('email.postRemoveSecondaryEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.postRemoveSecondaryEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'secondary_email')
      })
    })

    describe('email.postVerifyEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.postVerifyEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'registration')
      })
    })

    describe('email.postVerifyEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.postVerifyEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'registration')
      })
    })

    describe('email.postVerifySecondaryEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.postVerifySecondaryEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'secondary_email')
      })
    })

    describe('email.postVerifySecondaryEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.postVerifySecondaryEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'secondary_email')
      })
    })

    describe('email.recoveryEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.recoveryEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'reset_password')
      })
    })

    describe('email.recoveryEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.recoveryEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'reset_password')
      })
    })

    describe('email.unblockCode.bounced', () => {
      beforeEach(() => {
        return amplitude('email.unblockCode.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'unblock')
      })
    })

    describe('email.unblockCode.sent', () => {
      beforeEach(() => {
        return amplitude('email.unblockCode.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'unblock')
      })
    })

    describe('email.verificationReminderFirstEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.verificationReminderFirstEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'registration')
      })
    })

    describe('email.verificationReminderFirstEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.verificationReminderFirstEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'registration')
      })
    })

    describe('email.verificationReminderSecondEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.verificationReminderSecondEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'registration')
      })
    })

    describe('email.verificationReminderSecondEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.verificationReminderSecondEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'registration')
      })
    })

    describe('email.verificationReminderEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.verificationReminderEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'registration')
      })
    })

    describe('email.verificationReminderEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.verificationReminderEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'registration')
      })
    })

    describe('email.verifyEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.verifyEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'registration')
      })
    })

    describe('email.verifyEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.verifyEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'registration')
      })
    })

    describe('email.verifyLoginEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.verifyLoginEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'login')
      })
    })

    describe('email.verifyLoginEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.verifyLoginEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'login')
      })
    })

    describe('email.verifySyncEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.verifySyncEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'registration')
      })
    })

    describe('email.verifySyncEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.verifySyncEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'registration')
      })
    })

    describe('email.verifySecondaryEmail.bounced', () => {
      beforeEach(() => {
        return amplitude('email.verifySecondaryEmail.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - bounced')
        assert.equal(args[0].event_properties.email_type, 'secondary_email')
      })
    })

    describe('email.verifySecondaryEmail.sent', () => {
      beforeEach(() => {
        return amplitude('email.verifySecondaryEmail.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('called log.amplitudeEvent correctly', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].event_type, 'fxa_email - sent')
        assert.equal(args[0].event_properties.email_type, 'secondary_email')
      })
    })

    describe('email.wibble.bounced', () => {
      beforeEach(() => {
        return amplitude('email.wibble.bounced', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('did not call log.amplitudeEvent', () => {
        assert.equal(log.amplitudeEvent.callCount, 0)
      })
    })

    describe('email.wibble.sent', () => {
      beforeEach(() => {
        return amplitude('email.wibble.sent', mocks.mockRequest({}))
      })

      it('did not call log.error', () => {
        assert.equal(log.error.callCount, 0)
      })

      it('did not call log.amplitudeEvent', () => {
        assert.equal(log.amplitudeEvent.callCount, 0)
      })
    })

    describe('with data', () => {
      beforeEach(() => {
        return amplitude('account.signed', mocks.mockRequest({
          credentials: {
            uid: 'foo'
          },
          payload: {
            service: 'bar'
          },
          query: {
            service: 'baz'
          }
        }), {
          service: 'zang',
          uid: 'frip'
        })
      })

      it('data properties were set', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].user_id, 'frip')
        assert.equal(args[0].event_properties.service, 'zang')
      })
    })

    describe('with metricsContext', () => {
      beforeEach(() => {
        return amplitude('sms.installFirefox.sent', mocks.mockRequest({
          payload: {
            metricsContext: {
              deviceId: 'foo',
              flowId: 'bar',
              flowBeginTime: 'baz'
            }
          }
        }), {}, {
          device_id: 'plin',
          flow_id: 'gorb',
          flowBeginTime: 'yerx',
          time: 'wenf'
        })
      })

      it('metricsContext properties were set', () => {
        assert.equal(log.amplitudeEvent.callCount, 1)
        const args = log.amplitudeEvent.args[0]
        assert.equal(args[0].device_id, 'plin')
        assert.equal(args[0].user_properties.flow_id, 'gorb')
        assert.equal(args[0].session_id, 'yerx')
        assert.equal(args[0].time, 'wenf')
      })
    })
  })
})