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

const categories = {
  RequestsOfCatalog: "資料請求",
  EventReserve:      "イベント予約",
  ModelHouseReserve: "モデルハウス予約"
}

const transpose = a => a[0].map((_, c) => a.map(r => r[c]));
const prefCodes = Array.from(new Array(47)).map((v,i)=> ('00' + (i + 1)).slice(-2))
const prefNames = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県"
]

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
            .then(conversion => {
              return ship(JSON.parse(conversion));
            })
            .catch(err => {
              console.error('ERROR:', err);
            });
}

/**
 * @param {String} category
 * @return {String}
 */
function toCategoryName(category) {
  return categories[category];
}

/**
 * @param {String} prefCode
 * @return {String}
 */
function toPrefName(prefCode) {
  let prefs = {};
  for(const pref of transpose([prefCodes, prefNames])){
    prefs[pref[0]] = pref[1];
  }

  return prefs[prefCode]; 
}

/**
 * repackage
 * @param {Json} conversion
 * @return {Hash}
 */
function rePackage(conversion) {
  let repack = {
    conversion_id: { value: conversion.tag.conversion_id },
    request_date:  { value: conversion.tag.request_date.split('T')[0] },
    request_type:  { value: toCategoryName(conversion.tag.category) },
    confirm_id:    { value: conversion.tag.confirm_id },
    user_name:     { value: conversion.contents.name },
    user_zip_code: { value: conversion.contents.zip },
    user_address:  { value: `${toPrefName(conversion.contents.pref)}${conversion.contents.addr}` },
    user_tel:      { value: conversion.contents.tel },
    user_email:    { value: conversion.contents.email }
  };

  //reserve date
  if (conversion.contents.prefered_date !== 'undefiend') {
    repack.reserved_date_01 = { value: [conversion.contents.prefered_date, conversion.contents.prefered_time].filter(funciton( v => v !== "")).join('T')}
  }
  if (conversion.contents.prefered_date1 !== 'undefiend') {
    repack.reserved_date_01 = { value: [conversion.contents.prefered_date1, conversion.contents.prefered_time1].filter(funciton( v => v !== "")).join('T')}
  }
  if (conversion.contents.prefered_date2 !== 'undefiend') {
    repack.reserved_date_02 = { value: [conversion.contents.prefered_date2, conversion.contents.prefered_time2].filter(funciton( v => v !== "")).join('T')}
  }

  //reserve company
  repack.company = {value: []};
  if(typeof conversion.contents.companies !== 'undefined') {
    for (const company of conversion.contents.companies) {
      repack.company.value.push({ value: {
        company_code: { value: company.code },
        company_name: { value: company.name }
      }});
    }
  } else if (typeof conversion.contents.company !== 'undefined') {
    const company = conversion.contents.company
    repack.company.value.push({ value: {
      company_code: { value: company.code },
      company_name: { value: company.name }
    }});
  }

  //event 
  if(typeof conversion.contents.event !== 'undefined') {
    const event = conversion.contents.event;
    repack.event_address      = { value: event.addr };
    repack.event_company_name = { value: conversion.contents.company.name };
    repack.event_name         = { value: event.prmword };
  }

  //model house
  if(typeof conversion.contents.model_house !== 'undefined') {
    const model_house = conversion.contents.model_house;
    repack.event_address      = { value: model_house.addr };
    repack.event_company_name = { value: conversion.contents.company.name };
    repack.event_name         = { value: model_house.name };
  }

  //request of catalog
  if(typeof conversion.contents.catalog_enquete !== 'undefined') {
    const catalog_enquete = conversion.contents.catalog_enquete;
    repack.question_plan           = { value: catalog_enquete.plan };
    repack.question_pref_for_build = { value: catalog_enquete.pref_for_build };
    repack.question_schedule       = { value: catalog_enquete.schedule };
    repack.question_budget         = { value: catalog_enquete.badget };
    repack.question_status         = { value: catalog_enquete.status };
    repack.question_questions      = { value: catalog_enquete.questions };
  }

  //common enquete
  if(typeof conversion.contents.enq_coop !== 'undefined') {
    repack.question_monitor = { value: conversion.contents.enq_coop };
  }

  return repack;
}

/**
 * ship to other
 * @param {Json} contents
 * @return {Object}
 */
function ship(conversion) {
  console.log('=== kitayo ====')
  const packedConversion = rePackage(conversion)

  console.log(packedConversion)
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
