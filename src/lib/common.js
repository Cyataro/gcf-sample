/**
 * lib 
 */

'use strict';

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
 * [[a,c],[b,d]] => [[a,b],[c,d]]
 * @param {Array} a
 * @return {Array}
 */
const nestedArrayTranspose = (a) => a[0].map((_, c) => a.map(r => r[c]));

exports.toLowerCamelCase     = toLowerCamelCase;
exports.formatDateTime       = formatDateTime;
exports.isContentsExist      = isContentsExist;
exports.nestedArrayTranspose = nestedArrayTranspose;
