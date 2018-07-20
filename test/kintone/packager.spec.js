const assert = require('assert');
const packager = require('../../src/kintone/packager');

describe('packager', () => {
  describe('getMonitorChoice', () => {
    it('string', () => {
      assert.deepEqual(packager.getMonitorChoice('読者モニターになる'), '可');
    });
    it('string is empty', () => {
      assert.deepEqual(packager.getMonitorChoice(''), '無回答');
    });
    it('undefined', () => {
      assert.deepEqual(packager.getMonitorChoice(undefined), '無回答');
    });
  });
  describe('getPrefName', () => {
    it('pref code to name', () => {
      assert.deepEqual(packager.getPrefName('17'), '石川県');
    });
    it('pref code is not exist', () => {
      assert.deepEqual(packager.getPrefName('99'), undefined);
    });
    it('argment is num', () => {
      assert.deepEqual(packager.getPrefName(17), '石川県');
    });
    it('argment is undefined', () => {
      assert.deepEqual(packager.getPrefName(undefined), undefined);
    });
  });
  describe('companyTable', () => {
    describe('has two company', () => {
      beforeEach(() => {
        companies = [{code: 'foo', name: 'bar'},{code: 'hoge', name: 'moga'}]
      })
      it('return length two', () => {
        assert.deepEqual(packager.companyTable(companies).length, 2);
      });
    });
    describe('has not company', () => {
      beforeEach(() => {
        companies = []
      })
      it('return empty array', () => {
        assert.deepEqual(packager.companyTable(companies), []);
      });
    });
  });
});
