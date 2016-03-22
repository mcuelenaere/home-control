'use strict';

const rest = require('restler');

class Api {
  constructor(host) {
    this._host = host;
  }

  _doGet(path) {
    return new Promise((resolve, reject) => {
      rest.get('http://' + this._host + '/api/' + path).on('complete', (res) => {
        if (res instanceof Error) {
          reject(res);
        } else {
          resolve(res);
        }
      });
    });
  }

  _doPost(path, json) {
    return new Promise((resolve, reject) => {
      rest.postJson('http://' + this._host + '/api/' + path, json).on('complete', (res) => {
        if (res instanceof Error) {
          reject(res);
        } else {
          resolve(res);
        }
      });
    });
  }

  enableLamps(prefix) {
    prefix = prefix || '';
    return this._doGet('devices').then((res) => {
      var deviceIds = res.devices
        .filter((d) => { return !d.enabled && d.deviceName.indexOf(prefix) === 0; })
        .map((d) => { return d.deviceId; });

      return Promise.all(deviceIds.map((id) => {
        return this._doPost('devices/' + id + '/enable');
      }));
    });
  }

  disableLamps(prefix) {
    prefix = prefix || '';
    return this._doGet('devices').then((res) => {
      var deviceIds = res.devices
        .filter((d) => { return d.enabled && d.deviceName.indexOf(prefix) === 0; })
        .map((d) => { return d.deviceId; });

      return Promise.all(deviceIds.map((id) => {
        return this._doPost('devices/' + id + '/disable');
      }));
    });
  }

  changeBrightness(prefix, brightness) {
    prefix = prefix || '';
    return this._doGet('devices').then((res) => {
      var deviceIds = res.devices
        .filter((d) => { return d.enabled && d.deviceName.indexOf(prefix) === 0 && d.color.red == 1 && d.color.green == 1 && d.color.blue == 1; })
        .map((d) => { return d.deviceId; });

      return Promise.all(deviceIds.map((id) => {
        return this._doPost('devices/' + id + '/color', {
          color: {
            red: 1,
            green: 1,
            blue: 1,
            opacity: brightness,
          }
        });
      }));
    });
  }
}

module.exports = Api;
