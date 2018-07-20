/**
 * Generic background Cloud Function to be triggered by Cloud Storage.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} callback The callback function.
 */

'use strict';

const kintoneClient = require('./kintone/client');
const kintonePackager = require('./kintone/packager');

/**
 * download storage file
 * @param {string} bucket
 * @param {string} file
 * @return {Object}
 */
const storageFile = (bucket, file) => {
  const Storage = require('@google-cloud/storage');
  const storage = new Storage({keyfile: 'gcloud-service-key.json'});

  return storage.bucket(bucket).file(file);
}

/**
 * download storage file
 * @param {string} bucket
 * @param {string} file
 * @return {Object}
 */
const updateStatus = (file, contents, status) => {
  let c = contents;
  c.tag.status = status;
  console.log(c);
  //return file.save(JSON.stringify(c));
  return true;
}

/**
 * notification to google chat
 * @param {String} message
 */
const successNotification = (message) => {
  const request = require('request');

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
const errorNotification = (message) => {
  const request = require('request');

  request.post({
    url: global.process.env.SLACK_WEBHOOK_URL,
    headers: { 'Content-Type': 'application/json' },
    json: {
      username: 'sample',
      icon_emoji: ':ghost:',
      text: message
    }}, (error, response, body) => {
    if (error) {console.log(error);}
  });
}



exports.afterStoredConversion = (event, callback) => {
  console.log(event);
  console.log(event.data);
  console.log(callback);
  const file = event.data;

  if (file.resourceState === 'not_exists') {
    console.log('File ' + file.name + ' not_exists.');
    return callback;
  } else {
    if (file.metageneration === '1') {

      console.log(`bucket: ${file.bucket}`);
      console.log(`bucket: ${file.bucket}`);
      console.log(`file: ${file.name}`);
      const sf = storageFile(file.bucket, file.name);
      var contents;
      sf.download()
      .then(file => {
        contents = JSON.parse(file)
        if (contents.tag.status === 'create') {

          const kintonePackage = kintonePackager.toPackage(contents);
          console.log("===kintone package===")
          console.log(kintonePackage)

          return kintoneClient.recordClient().addRecord(global.process.env.KINTONE_APP_ID, kintonePackager.toPackage(contents));
        }
        return true;
      })
      .then(rsp => {
        successNotification(`Kintone registration is complete. record:${rsp.id}`);

        return updateStatus(sf, contents, 'complete');
      })
      .then(res => {
        return console.log(res);
      })
      .catch(err => {
        if (kintoneClient.isException(err)) {
          const kintoneErr = err.get();
          if (kintoneClient.isRecordDuplicate(kintoneErr.errors)) {
            return updateStatus(sf, contents, 'complete');
          } else {
            console.error('KintoneAPIException:', kintoneErr);
            return false;
          }
        } else {
          console.error('ERROR:', err);
        }
      });

    } else {
      console.log('File ' + file.name + ' metadata updated.');
      return callback;
    }
  }
}
