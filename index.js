/**
 * Generic background Cloud Function to be triggered by Cloud Storage.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} callback The callback function.
 */

'use strict';

// [START import]
const functions = require('firebase-functions');
const gcs = require('@google-cloud/storage')();
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');
// [END import]

exports.subscribe = (event, callback) => {
  const file = event.data;

  if (file.resourceState === 'not_exists') {
    console.log('File ' + file.name + ' not_exists.');
    callback();
    return;
  } else {
    if (file.metageneration === '1') {
      const bucket = gcs.bucket(file.bucket);
      const bucketFile = bucket.file(file.name);
      console.log(`bucket: ${bucket}`);
      console.log(`file: ${bucketFile}`);
      //test
      console.log(bucketFile.download());

    } else {
      console.log('File + ' + file.name + ' metadata updated.');
      callback();
      return
    }
  }
}
