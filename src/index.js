/**
 * Generic background Cloud Function to be triggered by Cloud Storage.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} callback The callback function.
 */

'use strict';

const cloudStorage    = require('@google-cloud/storage');
const kintoneClient   = require('./kintone/client');
const kintonePackager = require('./kintone/packager');
const notification    = require('./notification');
const libCommon       = require('./lib/common');


/**
 * download storage file
 * @param {string} bucket
 * @param {string} file
 * @return {Object}
 */
const storageFile = (bucket, file) => {
  const storage = new cloudStorage({keyfile: 'gcloud-service-key.json'});

  return storage.bucket(bucket).file(file);
}

/**
 * download storage file
 * @param {string} from
 * @param {string} to
 * @param {string} fileName
 * @return {Object}
 */
const copyFile = (from, to, fileName) => {
  return storageFile(from, fileName).copy(storageFile(to, fileName));
}

/**
 * bucket file lists
 * @param {string} bucket
 * @return {Object}
 */
const bucketFiles = (bucket) => {
  const storage = new cloudStorage({keyfile: 'gcloud-service-key.json'});

  return storage.bucket(bucket).getFiles();
}

/**
 * storage finalize
 * @param {string} event
 * @param {string} callback
 * @return {Object}
 */
exports.afterStoredConversion = (event, callback) => {
  const file = event.data;

  var arr1;
  var arr2;

  bucketFiles(file.bucket)
  .then(results => {
    const files = results[0];

    console.log("bucket1 files results");
    console.log(results);
    console.log(files);
    arr1 = files;
    return bucketFiles(global.process.env.GCS_BUCKET_COMP);
  })
  .then((comp) => {
    const files = comp[0];

    console.log("bucket2 files results");
    console.log(comp);
    console.log(files);
    arr2 = files;

    console.log("===sub buckets===");
    console.log(libCommon.subArray(arr1, arr2));

    return true;
  })
  .catch((err) => {
    console.error(err);
  });

  if (file.resourceState === 'not_exists') {
    console.log('File ' + file.name + ' not_exists.');
    return callback;
  } else {
    if (file.metageneration === '1') {

      console.log(`bucket: ${file.bucket}`);
      console.log(`file: ${file.name}`);

      storageFile(file.bucket, file.name).download()
      .then(file => {
        const contents = JSON.parse(file)

        return kintoneClient.recordClient().addRecord(global.process.env.KINTONE_APP_ID, kintonePackager.toPackage(contents));
      })
      .then(rsp => {
        notification.success(`Kintone registration is complete. record:${rsp.id}`);

        return copyFile(file.bucket, global.process.env.GCS_BUCKET_COMP, file.name);
      })
      .then(res => {
        return console.log(res);
      })
      .catch(err => {
        if (kintoneClient.isException(err)) {
          const kintoneErr = err.get();
          if (kintoneClient.isRecordDuplicate(kintoneErr.errors)) {
            return copyFile(file.bucket, global.process.env.GCS_BUCKET_COMP, file.name);
          } else {
            console.error('KintoneAPIException:', kintoneErr);
            return false;
          }
        } else {
          notification.error(`Kintone forward error :${err}`);
          return console.error('ERROR:', err);
        }
      });
      return true;
    } else {
      console.log('File ' + file.name + ' metadata updated.');
      return callback;
    }
  }
}
