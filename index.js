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

/**
 * download storage to dest
 * @param {string} bucketName
 * @param {string} srcFilename
 * @param {string} destFilename
 * @return {Object}
 */
function downloadFile(bucketName, srcFilename, destFilename) {
  const Storage = require('@google-cloud/storage');
  const storage = new Storage({keyfile: 'gcloud-service-key.json'});

  const options = {
    destination: destFilename,
  };

  return  storage
            .bucket(bucketName)
            .file(srcFilename)
            .download(options)
            .then(() => {
              console.log(
                `gs://${bucketName}/${srcFilename} downloaded to ${destFilename}.`
              );
              return destFilename;
            })
            .catch(err => {
              console.error('ERROR:', err);
            });
}


exports.subscribe = (event, callback) => {
  const file = event.data;

  if (file.resourceState === 'not_exists') {
    console.log('File ' + file.name + ' not_exists.');
    callback();
    return;
  } else {
    if (file.metageneration === '1') {
      const destFile = `/temp/${file.name}`;

      console.log(`bucket: ${file.bucket}`);
      console.log(`file: ${file.name}`);
      //test
      console.log(downloadFile(file.bucket, file.name, destFile));

    } else {
      console.log('File + ' + file.name + ' metadata updated.');
      callback();
      return
    }
  }
}
