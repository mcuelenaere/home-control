const EthernetAddr = require("pcap/decode/ethernet_addr"),
      IPv4Addr = require("pcap/decode/ipv4_addr");

// DHCP packet parser
// RFC 2131
// DHCP packet format
//     0                   1                   2                   3
//     0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
//     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//     |     op (1)    |   htype (1)   |   hlen (1)    |   hops (1)    |
//     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//     |                            xid (4)                            |
//     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//     |           secs (2)            |           flags (2)           |
//     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//     |                          ciaddr  (4)                          |
//     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//     |                          yiaddr  (4)                          |
//     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//     |                          siaddr  (4)                          |
//     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//     |                          giaddr  (4)                          |
//     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//     |                                                               |
//     |                          chaddr  (16)                         |
//     |                                                               |
//     |                                                               |
//     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//     |                                                               |
//     |                          sname   (64)                         |
//     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//     |                                                               |
//     |                          file    (128)                        |
//     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//     |                                                               |
//     |                          options (variable)                   |
//     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+



function DHCP(emitter) {
    this.emitter = emitter;
    this.op = undefined;
    this.htype = undefined;
    this.hlen = undefined;
    this.hops = undefined;
    this.xid = undefined;
    this.secs = undefined;
    this.flags = undefined;
    this.ciaddr = undefined;
    this.yiaddr = undefined;
    this.siaddr = undefined;
    this.giaddr = undefined;
    this.chaddr = undefined;
    this.sname = undefined;
    this.bootfile = undefined;
    this.options   = undefined;
}

DHCP.prototype.decodeOption = function (code, buffer) {
    switch (code) {
        case 12: this.options['hostname'] = buffer.toString('ascii'); break;
        case 15: this.options['domainname'] = buffer.toString('ascii'); break;
        case 50: this.options['requested-ip'] = new IPv4Addr().decode(buffer, 0); break;
        case 57: this.options['max-dhcp-message-size'] = buffer.readUInt16BE(buffer); break;
        case 60: this.options['vendor-class'] = buffer.toString('ascii'); break;
        case 61: this.options['client-id'] = new EthernetAddr(buffer, 0); break;
        case 255: break;
        default: this.options[code] = buffer; break;
    }
}

DHCP.prototype.decode = function (raw_packet, offset) {
    this.op = raw_packet[offset];
    this.htype = raw_packet[offset + 1];
    this.hlen = raw_packet[offset + 2];
    this.hops = raw_packet[offset + 3];
    offset += 4;

    this.xid = raw_packet.readUInt32BE(offset);
    offset += 4;

    this.secs = raw_packet.readUInt16BE(offset);
    offset += 2;

    this.flags = raw_packet.readUInt16BE(offset);
    offset += 2;

    this.ciaddr = new IPv4Addr().decode(raw_packet, offset);
    offset += 4;

    this.yiaddr = new IPv4Addr().decode(raw_packet, offset);
    offset += 4;

    this.siaddr = new IPv4Addr().decode(raw_packet, offset);
    offset += 4;

    this.giaddr = new IPv4Addr().decode(raw_packet, offset);
    offset += 4;

    this.chaddr = new EthernetAddr(raw_packet, offset);
    offset += 16;

    this.sname = raw_packet.slice(offset, offset + 64);
    offset += 64;

    this.bootfile = raw_packet.slice(offset, offset + 128);
    offset += 128;

    var magic = raw_packet.readUInt32BE(offset);
    offset += 4;
    if (magic != 0x63825363) {
        throw new Error('Incorrect DHCP magic cookie');
    }

    this.options = {};

    do {
        var optionCode = raw_packet.readUInt8(offset);
        offset++;

        var optionLength = 0;
        if (optionCode < 255) {
            optionLength = raw_packet.readUInt8(offset);
            offset++;
        }

        var optionData = undefined;
        if (optionLength > 0) {
            optionData = raw_packet.slice(offset, offset + optionLength);
            offset += optionLength;
        }

        this.decodeOption(optionCode, optionData);
    } while (optionCode != 255 && offset < raw_packet.length);


    if(this.emitter) { this.emitter.emit("dhcp", this); }
    return this;
};

DHCP.prototype.decoderName = "dhcp";
DHCP.prototype.eventsOnDecode = true;

module.exports = DHCP;
