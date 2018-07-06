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

exports.sampleStorageDownload = functions.storage.object().onFinalize((object) => {
    // [START eventAttributes]
    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const filePath = object.name; // File path in the bucket.
    const contentType = object.contentType; // File content type.
    // [END eventAttributes]

    const bucket = gcs.bucket(object.bucket);
    const file = bucket.file(filePath);

    console.log(`object: ${object}`);
    console.log(`fileBucket: ${fileBucket}`);
    console.log(`filePath: ${filePath}`);
    console.log(`contentType: ${contentType}`);
    console.log(`bucket: ${bucket}`);
    console.log(`file: ${file}`);

  });
