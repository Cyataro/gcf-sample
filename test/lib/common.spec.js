
const assert = require('assert');
const libCommon = require('../../src/lib/common');

describe('common', () => {
  describe('toLowerCamelCase', () => {
    it('string snack case to lower camel case', () => {
      assert.deepEqual(libCommon.toLowerCamelCase('foo_bar'), 'fooBar');
    });
    it('first is _', () => {
      assert.deepEqual(libCommon.toLowerCamelCase('_foo_bar'), 'FooBar');
    });
    it('last is _', () => {
      assert.deepEqual(libCommon.toLowerCamelCase('foo_bar_'), 'fooBar_');
    });
  });
  describe('timeZone', () => {
    it('time is undefined', () => {
      assert.deepEqual(libCommon.timeZone(undefined), '');
    });
    it('time is empty', () => {
      assert.deepEqual(libCommon.timeZone(''), '');
    });
    it('time is exist', () => {
      assert.deepEqual(libCommon.timeZone('10:00:00'), '10:00:00+09:00');
    });
  });
  describe('formatDateTime', () => {
    it('strign date + T + time', () => {
      assert.deepEqual(libCommon.formatDateTime('2018-07-01','10:00:00'), '2018-07-01T10:00:00+09:00');
    });
    it('time is none', () => {
      assert.deepEqual(libCommon.formatDateTime('2018-07-01',''), '2018-07-01');
    });
    it('date is none', () => {
      assert.deepEqual(libCommon.formatDateTime('','10:00:00'), '10:00:00+09:00');
    });
    it('date and time is none', () => {
      assert.deepEqual(libCommon.formatDateTime('',''), '');
    });
  });
  describe('isContentsExist', () => {
    it('content exist', () => {
      assert.deepEqual(libCommon.isContentsExist('foo'), 'foo');
    });
    it('content undefined', () => {
      assert.deepEqual(libCommon.isContentsExist(undefined), undefined);
    });
  });
  describe('nestedArrayTranspose', () => {
    it('array remapping', () => {
      assert.deepEqual(libCommon.nestedArrayTranspose([['foo','hoge'],['bar','moga']]), [['foo', 'bar'],['hoge', 'moga']]);
    });
    it('single array', () => {
      assert.throws(() => {
          throw libCommon.nestedArrayTranspose(['foo','hoge'])
        },
        (err) => {
          assert(err.name = 'TypeError');
          return true;
        }
      )
    });
  });
  describe('subArray', () => {
    it('has a and b', () => {
      assert.deepEqual(libCommon.subArray(['1','2','3'], ['2']), ['1','3']);
    });
    it('b is empty', () => {
      assert.deepEqual(libCommon.subArray(['1','2','3'], []), ['1','2','3']);
    });
    it('a is empty', () => {
      assert.deepEqual(libCommon.subArray([], ['1','2','3']), []);
    });
  });
});
