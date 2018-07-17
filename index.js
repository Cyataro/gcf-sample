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

  return  storage
            .bucket(bucketName)
            .file(srcFilename)
            .download()
            .then((contents) => {
              return ship(contents);
            })
            .catch(err => {
              console.error('ERROR:', err);
            });
}

/**
 * ship to other
 * @param {Json} contents
 * @return {Object}
 */
function rePackage(contents) {
  let rePackage = contents;
  if(typeof contents.companies !== 'undefined') {
    for (i in contents.companies) {
      console.log(contents.companies[i]);
    }
  }
  return rePackage;
}

/**
 * ship to other
 * @param {Json} contents
 * @return {Object}
 */
function ship(contents) {
  let packageK = rePackage(contents)

  console.log(packageK)
}

/**
 * @param {String} message
 */
function error_notification(message) {
  console.log(text)
}

exports.subscribe = (event, callback) => {
  const file = event.data;

  if (file.resourceState === 'not_exists') {
    error_notification('File ' + file.name + ' not_exists.');
    return callback;
  } else {
    if (file.metageneration === '1') {
      const destFile = `/temp/${file.name}`;

      console.log(`bucket: ${file.bucket}`);
      console.log(`file: ${file.name}`);
      //test
      downloadFile(file.bucket, file.name, destFile);

    } else {
      error_notification('File ' + file.name + ' metadata updated.');
      return callback;
    }
  }
}
