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
 * @param {String} msg
 * @param {Object} e
 */
const log_error = (msg, e) => {
  //notification.error(`${msg} ${JSON.stringify(e)}`);
  console.error(msg, e);
}

/**
 * @param {String} bucket
 * @return {Object}
 */
const bucketFiles = (bucket) => {
  const storage = new cloudStorage({keyfile: 'gcloud-service-key.json'});
  return storage.bucket(bucket).getFiles();
}

/**
 * @param {String} bucket
 * @param {String} file
 * @param {Obuject} callback
 */
const upload = (bucket, file, callback) => {
  storageFile(bucket, file).download()
  .then(file => {
    const contents = JSON.parse(file)

    return kintoneClient.recordClient().addRecord(global.process.env.KINTONE_APP_ID, kintonePackager.toPackage(contents));
  })
  .then(rsp => {
    return copyFile(bucket, global.process.env.GCS_BUCKET_DEST, file);
  })
  .then(res => {
    console.log(res)
    return callback();
  })
  .catch(err => {
    if (kintoneClient.isException(err)) {
      const kintoneErr = err.get();
      if (kintoneClient.isRecordDuplicate(kintoneErr.errors)) {
        log_error(`conversion_id duplicate!!! : ${file} :`, kintoneErr);
        return copyFile(bucket, global.process.env.GCS_BUCKET_DEST, file);
      } else {
        log_error('KintoneAPIException :', kintoneErr);
        return callback();
      }
    } else {
      log_error('ERROR :', err);
      return callback();
    }
  });
}

const uploads = (bucket, files) => {
  var count = 0;

  return new Promise((resolve) => {
    var recursiveUpload = (file) => {
      new Promise((resolve) => {
        console.log(`process file : ${files[count]}`);
        storageFile(bucket, file).download()
        .then(file => {
          const contents = JSON.parse(file)
      
          return kintoneClient.recordClient().addRecord(global.process.env.KINTONE_APP_ID, kintonePackager.toPackage(contents));
        })
        .then(rsp => {
          return copyFile(bucket, global.process.env.GCS_BUCKET_DEST, file);
        })
        .then(() => {
          console.log(`process complete!!`);
          count++;
          if (count >= files.length) { 
            return resolve(true);
          } else {
            return recursiveUpload(files[count]);
          }
        })
        .catch(err => {
          if (kintoneClient.isException(err)) {
            const kintoneErr = err.get();
            if (kintoneClient.isRecordDuplicate(kintoneErr.errors)) {
              log_error(`conversion_id duplicate!!! : ${file} :`, kintoneErr);
              return copyFile(bucket, global.process.env.GCS_BUCKET_DEST, file);
            } else {
              log_error('KintoneAPIException :', kintoneErr);
            }
          } else {
            log_error('ERROR :', err);
          }
        });
      });
    }
    recursiveUpload(files[count]);
  });
}

/**
 * trigger pub / sub
 * @param {string} event
 * @param {string} callback
 * @return {Object}
 */
exports.missingConversions = (event, callback) => {
  const pubsubMessage = Buffer.from(event.data.data, 'base64').toString();

  console.log(`PubSub message: ${pubsubMessage}`)

  if (typeof global.process.env.KINTONE_IS_DOWN !== 'undefined') {
    console.log(`kintone breaker is down!!!`);
    return callback();
  } else if (pubsubMessage !== 'dailyRetry') {
    return callback();
  } else {
    var srcBucketFiles;
    var dstBucketFiles;

    console.log(`start resend conversions not registered in kintone`);

    bucketFiles(global.process.env.GCS_BUCKET_SRC)
    .then(files => {
      srcBucketFiles = files[0].map((f)=> f.name);
      console.log(`src get files: ${JSON.stringify(files[0])}`);
      console.log(`src files: ${srcBucketFiles}`);

      return bucketFiles(global.process.env.GCS_BUCKET_DEST)
    })
    .then(files => {
      dstBucketFiles = files[0].map((f)=> f.name);
      console.log(`dest get files: ${JSON.stringify(files[0])}`);
      console.log(`dest files: ${dstBucketFiles}`);
      return uploads(global.process.env.GCS_BUCKET_SRC, libCommon.subArray(srcBucketFiles, dstBucketFiles));
    })
    .then(rsp =>{
      return console.log(`process end : ${rsp}`);
    })
    .catch(e => {
      log_error('ERROR :', e);
    })
    return callback();
  }
}

/**
 * storage finalize
 * @param {string} event
 * @param {string} callback
 * @return {Object}
 */
exports.storedConversion = (event, callback) => {
  const file = event.data;

  if (typeof global.process.env.KINTONE_IS_DOWN !== 'undefined') {
    console.log(`kintone breaker is down!!!`);
    return callback();
  } else if (file.resourceState === 'not_exists') {
    console.log('File ' + file.name + ' not_exists.');
    return callback();
  } else {
    if (file.metageneration === '1') {

      console.log(`bucket: ${file.bucket}`);
      console.log(`file: ${file.name}`);

      upload(file.bucket, file.name, callback);

      return callback();
    } else {
      return callback();
    }
  }
}
