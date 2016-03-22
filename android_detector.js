'use strict';

const pcap = require('pcap'),
      DHCP = require('./dhcp'),
      events = require('events'),
      util = require('util');

class AndroidDetector {
    constructor(intface) {
        this._session = pcap.createSession(intface, 'udp and port 67');
        this._session.on('packet', (raw_packet) => {
            var packet = pcap.decode.packet(raw_packet);
            var dhcp_packet = new DHCP().decode(packet.payload.payload.payload.data, 0);

            var isAndroid = false;
            if ('hostname' in dhcp_packet.options && dhcp_packet.options.hostname.indexOf('android-') === 0) {
                isAndroid = true;
            } else if ('vendor-class' in dhcp_packet.options && dhcp_packet.options['vendor-class'].indexOf('android-dhcp') === 0) {
                isAndroid = true;
            }

            if (isAndroid) {
                this.emit('discover', {
                    hostname: dhcp_packet.options.hostname
                });
            }
        });
    }

    dispose() {
        this._session.removeAllListeners('packet');
        this._session.close();
        this._session = null;
    }
}
util.inherits(AndroidDetector, events.EventEmitter);

module.exports = AndroidDetector;
