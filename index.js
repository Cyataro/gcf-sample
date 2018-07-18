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
  RequestsOfCatalog: "資料請求メール",
  EventReserve:      "イベント予約",
  ModelHouseReserve: "モデルハウス予約"
}

const monitors = monitor => {
  switch (monitor) {
    case "読者モニターになる":
      return "可";
    case "読者モニターにならない":
      return "不可";
    default:
      return "無回答";
  }
}

const toLowerCamalCase = (str) => str.replace(/(_)(.)/g, (s) => s.charAt(1).toUpperCase());
const formatDateTime   = (date,time) => [date, time].filter(function(v){ return v !== ""}).join('T');
const existy           = (data) => typeof data !== 'undefined' ? data : undefined;
const transpose = (a) => a[0].map((_, c) => a.map(r => r[c]));
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
 * @param {Array} companies
 * @return {Array}
 */
function companyTable(companies) {
  let c = [];
  for (const company of companies) {
    c.push({ value: {
      company_code: { value: company.code },
      company_name: { value: company.name }
    }});
  }
  return c; 
}

const getConversionContents = {
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getConversionId: (c) => { existy(c.tag.conversion_id);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getRequestDate: (c) => {
    if (typeof c.tag.request_date === 'undefined') {
      return undefined;
    }
    return c.tag.request_date.split('T')[0];
  },
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getRequestType: (c) => {
    if (typeof c.tag.category === 'undefined') {
      return undefined;
    }
    return toCategoryName(conversion.tag.category);
  },
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getConfirmId: (c) => { return existy(c.tag.confirm_id);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getUserName: (c) => { return existy(c.contents.name);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getUserKana: (c) => { return existy(c.contents.kana || c.contents.yomigana);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getUserZipCode: (c) => { return existy(c.contents.zip);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getUserAddress: (c) => {
    if (typeof c.contents.pref === 'undefined' && typeof c.contents.addr === 'undefined') {
      return undefined;
    }
    return `${toPrefName(c.contents.pref)}${c.contents.addr}`;
  },
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getUserTel: (c) => {return existy(c.contents.tel);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getUserEmail: (c) => {return existy(c.contents.email);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getReservedDate01: (c) => {
    if (typeof c.contents.prefered_date === 'undefined' && typeof c.contents.prefered_date1 === 'undefined') {
      return undefined;
    }
    return formatDateTime((c.contents.prefered_date || c.contents.prefered_date1), (c.contents.prefered_time || c.contents.prefered_time1));
  },
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getReservedDate02: (c) => {
    if (typeof c.contents.prefered_date2 === 'undefined') {
      return undefined;
    }
    return formatDateTime(c.contents.prefered_date2, c.contents.prefered_time2);
  },
  /**
   * @param {Object} c
   * @return {Array} or undefined
   */
  getCompany: (c) => {
    if (typeof c.contents.company === 'undefined' && typeof c.contents.companies === 'undefined') {
      return undefined;
    } else if (typeof c.contents.companies !== 'undefined') {
      return companyTable(c.contents.companies);
    } else {
      return companyTable([c.contents.company]);
    }
  },
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getEventAddress: (c) => {
    if (typeof c.contents.event === 'undefined' && typeof c.contents.model_house === 'undefined') {
      return undefined;
    }
    const e = c.contents.event || c.contents.model_house;
    return e.addr;
  },
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getEventCompanyName: (c) => {
    if (typeof c.contents.company === 'undefined') {
      return undefined;
    }
    return c.contents.company.name;
  },
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getEventName: (c) => {
    if (typeof c.contents.event === 'undefined' && typeof c.contents.model_house === 'undefined') {
      return undefined;
    } else if (typeof c.contents.model_house !== 'undefined') {
      return c.contents.model_house.name;
    } else {
      return c.contents.event.prmword;
    }
  },
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getQuestionPlan: (c) => {return existy(c.contents.plan);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getQuestionPrefForBuild: (c) => {return existy(c.contents.pref_for_build);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getQuestionSchedule: (c) => {return existy(c.contents.schedule);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getQuestionBudget: (c) => {return existy(c.contents.budget);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getQuestionStatus: (c) => {
    if (typeof c.contents.status === 'undefined') {
      return undefined;
    }
    return [c.contents.status];
  },
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getQuestionQuestions: (c) => {
    if (typeof c.contents.questions === 'undefined') {
      return undefined;
    }
    return c.contents.questions.split(',');
  },
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getQuestionMonitor: (c) => {
    if (typeof c.contents.enq_coop === 'undefined') {
      return undefined;
    }
    return monitors(c.contents.enq_coop);
  }
}

//[field code, type]
const kintoneFields = [
  "conversion_id",
  "request_date",
  "request_type",
  "confirm_id",
  "user_name",
  "user_kana",
  "user_zip_code",
  "user_address",
  "user_tel",
  "user_email",
  "reserved_date_01",
  "reserved_date_02",
  "company",
  "event_address",
  "event_company_name",
  "event_name",
  "question_plan",
  "question_pref_for_build",
  "question_schedule",
  "question_budget",
  "question_status",
  "question_questions",
  "question_monitor"
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
              return kintoneUploader(JSON.parse(conversion));
            })
            .catch(err => {
              console.error('ERROR:', err);
            });
}

/**
 * repackage
 * @param {Json} conversion
 * @return {Hash}
 */
function rePackage(conversion) {
  let repack = {};
  console.log("===sottijanaiyo===")

  for (const f of kintoneFields) {
    const func = toLowerCamalCase('get_' + f);
    console.log(func)
    const contents = getConversionContents[func](conversion);
    if (typeof contents !== 'undefined'){
      repack[f] = {value: contents};
    }
  }

  return repack;
}

/**
 * ship to other
 * @param {Json} conversion
 * @return {Object}
 */
function kintoneUploader(conversion) {
  const kintone = require('kintone-nodejs-sdk');
  console.log("===kokodayo===")

  const packedConversion = rePackage(conversion)

  console.log("===repack conversions===")
  console.log(packedConversion)

  let kintoneAuth = new kintone.Auth();
  kintoneAuth.setApiToken(global.process.env.KINTONE_API_KEY);

  let kintoneConnection = new kintone.Connection(global.process.env.KINTONE_DOMAIN, kintoneAuth);
  let kintoneRecord = new kintone.Record(kintoneConnection);
  kintoneRecord.addRecord(global.process.env.KINTONE_APP_ID, packedConversion)
    .then((rsp) => {
        console.log(rsp);
        return error_notification(rsp);
    })
    .catch((err) => {
        // This SDK return err with KintoneAPIExeption
        console.log(err.get());
    });
}

/**
 * @param {String} message
 */
function error_notification(message) {
  console.log(message);
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
