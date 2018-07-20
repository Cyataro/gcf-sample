/**
 * Generic background Cloud Function to be triggered by Cloud Storage.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} callback The callback function.
 */

'use strict';

const categories = {
  RequestsOfCatalog: "資料請求メール",
  EventReserve:      "イベント予約",
  ModelHouseReserve: "モデルハウス予約"
}

const monitors = (monitor) => {
  switch (monitor) {
    case "読者モニターになる":
      return "可";
    case "読者モニターにならない":
      return "不可";
    default:
      return "無回答";
  }
}

/**
 * @param {String} str
 * @return {String}
 */
const toLowerCamelCase = (str) => str.replace(/(_)(.)/g, (s) => s.charAt(1).toUpperCase());
/**
 * 20xx-xx-xxT00:00:00
 * @param {String} date
 * @param {String} time
 * @return {String}
 */
const formatDateTime   = (date,time) => [date, time].filter(function(v){ return v !== ""}).join('T');
/**
 * @param {Object} contents
 * @return {Object} or undefined
 */
const isContentsExist  = (contents) => typeof contents !== 'undefined' ? contents : undefined;
/**
 * [[a],[b]] => [a=>b]
 * @param {Array} a
 * @return {Array}
 */
const transpose = (a) => a[0].map((_, c) => a.map(r => r[c]));
/**
 * @return {Array}
 */
const prefCodes = Array.from(new Array(47)).map((v,i)=> ('00' + (i + 1)).slice(-2))
/**
 * @return {Array}
 */
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
const toCategoryName = (category) => categories[category];

/**
 * @param {String} prefCode
 * @return {String}
 */
const toPrefName = (prefCode) => {
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
const companyTable = (companies) => {
  let c = [];
  for (const company of companies) {
    c.push({ value: {
      company_code: { value: company.code },
      company_name: { value: company.name }
    }});
  }
  return c; 
}

const conversionContents = {
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getConversionId: (c) => {return isContentsExist(c.tag.conversion_id);},
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
    return toCategoryName(c.tag.category);
  },
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getConfirmId: (c) => { return isContentsExist(c.tag.confirm_id);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getUserName: (c) => { return isContentsExist(c.contents.name);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getUserKana: (c) => { return isContentsExist(c.contents.kana || c.contents.yomigana);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getUserZipCode: (c) => { return isContentsExist(c.contents.zip);},
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
  getUserTel: (c) => {return isContentsExist(c.contents.tel);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getUserEmail: (c) => {return isContentsExist(c.contents.email);},
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
  getQuestionPlan: (c) => {return isContentsExist(c.contents.plan);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getQuestionPrefForBuild: (c) => {return isContentsExist(c.contents.pref_for_build);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getQuestionSchedule: (c) => {return isContentsExist(c.contents.schedule);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getQuestionBudget: (c) => {return isContentsExist(c.contents.budget);},
  /**
   * @param {Object} c
   * @return {String} or undefined
   */
  getQuestionStatus: (c) => {
    if (typeof c.contents.status === 'undefined' || c.contents.status === '') {
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

/**
 * kintone field code list
 */
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
 * toPackageForKintone
 * @param {Json} conversion
 * @return {Hash}
 */
const toPackage = (conversion) => {
  let repack = {};

  for (const field of kintoneFields) {
    const contents = conversionContents[toLowerCamelCase('get_' + field)](conversion);
    if (typeof contents !== 'undefined'){
      repack[field] = {value: contents};
    }
  }

  return repack;
}

exports.toPackage = toPackage;
