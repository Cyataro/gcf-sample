/**
 * Kintone API Client.
 *
 */

'use strict';


/**
 * ship to other
 * @return {Object}
 */
const recordClient = () => {
  const client = require('kintone-nodejs-sdk');

  let kintoneAuth = new client.Auth();
  kintoneAuth.setApiToken(global.process.env.KINTONE_API_KEY);

  let kintoneConnection = new client.Connection(global.process.env.KINTONE_DOMAIN, kintoneAuth);
  return new client.Record(kintoneConnection);
}

/**
 * ship to other
 * @return {Object}
 */
const isException = (err) => {
  return typeof err.constructor !== 'undefined' && err.constructor.name === 'KintoneAPIException';
}

/**
 * ship to other
 * @return {Object}
 */
const isRecordDuplicate = (err) => {
  return typeof err['record.conversion_id.value'] !== 'undefined' && err['record.conversion_id.value'].message === '値がほかのレコードと重複しています。';
}

exports.isException = isException;
exports.recordClient = recordClient;
exports.isRecordDuplicate = isRecordDuplicate;
