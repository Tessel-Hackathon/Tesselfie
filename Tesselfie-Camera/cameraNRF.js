var tessel = require('tessel'),
  NRF24 = require('rf-nrf24'),
  pipes = [0xF0F0F0F0E1, 0xF0F0F0F0D2],
  role = 'pong'; // swap this to pong if you want to wait for receive

var tx;

var nrf = NRF24.channel(0x4c) // set the RF channel to 76. Frequency = 2400 + RF_CH [MHz] = 2476MHz
  .transmitPower('PA_MAX') // set the transmit power to max
  .dataRate('1Mbps')
  .crcBytes(2) // 2 byte CRC
  .autoRetransmit({count:15, delay:4000})
  .use(tessel.port['B']);

nrf._debug = false;
nrf.on('ready', function () {

  nrfReady = true;

  console.log('kale');
  setTimeout(function(){
    nrf.printDetails();
  }, 5000);

  if (role === 'ping') {
    console.log("PING out");

    tx = nrf.openPipe('tx', pipes[0], {autoAck: false}); // transmit address F0F0F0F0D2
    var rx = nrf.openPipe('rx', pipes[1], {size: 4}); // receive address F0F0F0F0D2
    
    tx.on('ready', function () {
      pingOpen = true;

      console.log('pipe is open');
      var n = 0;
      var testObj = {
        machine: 'Tessel',
        color: 'red'
      };
    });
    rx.on('data', function (d) {
      console.log("Got response back:", d);
    });
  } else {
    console.log("PONG back");
    var rx = nrf.openPipe('rx', pipes[0], {size: 32});  
      tx = nrf.openPipe('tx', pipes[1], {autoAck: false}); 
    rx.on('data', function (d) {
      console.log("Got data, will respond", d.toString());
      tx.write(d);
    });
    tx.on('error', function (e) {
      console.warn("Error sending reply.", e);
    });
  }
  console.log('kaleover');
});