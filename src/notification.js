/**
 * notification
 */

'use strict';

const request = require('request');

/**
 * notification to google chat
 * @param {String} message
 */
const success = (message) => {
  request.post({
    url: global.process.env.GOOGLE_CHAT_WEBHOOK_URL,
    body: JSON.stringify({text: message})
    }, (error, response, body) => {
    console.log(error);
  });
}

/**
 * notification to slack
 * @param {String} message
 */
const error = (message) => {
  request.post({
    url: global.process.env.SLACK_WEBHOOK_URL,
    headers: { 'Content-Type': 'application/json' },
    json: {
      username: 'ienavi-conversion-store',
      icon_emoji: ':ghost:',
      text: message
    }}, (error, response, body) => {
    if (error) {console.log(error);}
  });
}

exports.success = success;
exports.error = error;

