'use strict';

const WebSocket = require('ws'),
      events = require('events'),
      util = require('util');

const RECONNECT_TIMEOUT = 5 * 1000;

class Kodi {
  constructor(url) {
    this._init(url);
  }

  _init(url) {
    this.ws = new WebSocket(url);
    this.ws.on('error', (err) => {
      let shouldReportError = true;
      if ((err.errno === 'ENOTFOUND' || err.errno === 'ECONNREFUSED') && err.syscall === 'getaddrinfo') {
        shouldReportError = false;
      }

      if (shouldReportError) {
        this.emit('error', err);
      }

      // try reconnecting soon
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => {
        this._init(url);
      }, RECONNECT_TIMEOUT);
    });
    this.ws.on('close', () => {
      if (this.disposing) {
        return;
      }

      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => {
        this._init(url);
      }, RECONNECT_TIMEOUT);
    });
    this.ws.on('message', (data) => {
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch (err) {
        this.emit('error', err);
        return;
      }
      this.emit(parsed.method, parsed.params);
    });
  }

  dispose() {
    this.disposing = true;
    this.ws.close();
  }
}
util.inherits(Kodi, events.EventEmitter);

module.exports = Kodi;
