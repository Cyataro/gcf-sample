/**
 * Generic background Cloud Function to be triggered by Cloud Storage.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} callback The callback function.
 */
exports.subscribe = (event, callback) => {
  const file = event.data;

  if (file.resourceState === 'not_exists') {
      console.log('File ' + file.name + ' not_exists.');
      callback();
      return
  } else {
      if (file.metageneration === '1') {
          var data = {
              'file_name': file.name,
              'bucket_name': file.bucket
          };
          console.log(event);
          console.log(file);
      } else {
          console.log('File + ' + file.name + ' metadata updated.');
          callback();
          return
      }
  }
};
