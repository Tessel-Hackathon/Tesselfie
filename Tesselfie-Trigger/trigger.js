// imports 
var tessel = require('tessel'),
  NRF24 = require('rf-nrf24'),
  pipes = [0xF0F0F0F0E1, 0xF0F0F0F0D2],
  role = 'ping'; // swap this to pong if you want to wait for receive

var rfidlib = require('rfid-pn532');
var ambientlib = require('ambient-attx4');
var climatelib = require('climate-si7020');

var climate = climatelib.use(tessel.port['A']);
var ambient = ambientlib.use(tessel.port['C']);
var rfid = rfidlib.use(tessel.port['D']); 

var ambientReady = false;
var climateReady = false;

var currentDegrees;
var currentHumidity;
var currentLightLevel;
var currentSoundLevel;

pingOpen = false;

ambient.on('ready', function(version){
  console.log('ambient ready');
  ambientReady = true;
});

climate.on('ready', function(version) {
  console.log('climate ready');
  climateReady = true;
});

rfid.on('ready', function (version) {
  while(!ambientReady || !climateReady) {
    console.log('waiting on module load');
  }
  
  console.log('Ready to read RFID card');

  rfid.on('data', function(card) {
    console.log('UID:', card.uid.toString('hex'));

    ambient.getLightLevel( function(err, ldata) {
      ambient.getSoundLevel( function(err, sdata) {
        currentLightLevel = ldata.toFixed(3);
        currentSoundLevel = sdata.toFixed(3);
        console.log("Light level:", ldata.toFixed(3), " ", "Sound Level:", sdata.toFixed(3));
      });
    });

    ambient.on('error', function (err) {
      console.log(err);
    });

    climate.readTemperature('f', function (err, temp) {
      climate.readHumidity(function (err, humid) {
        currentDegrees = temp.toFixed(1);
        currentHumidity = humid.toFixed(0);
        console.log('Degrees:', temp.toFixed(1) + 'F', 'Humidity:', humid.toFixed(0) + '%RH');
      });
    });

    climate.on('error', function(err) {
      console.log('error connecting climate', err);
    });

    if (pingOpen) {
      var visualObj = {
        L: currentLightLevel,
        S: currentSoundLevel
      };
      var tempObj = {
        T: currentDegrees,
        H: currentHumidity,
      };

      var sendObj = function(obj){
        var b = new Buffer(32);
        var stringified = JSON.stringify(obj);
        b.write(stringified);
        console.log("Sending", b);
        tx.write(b);
      };
      sendObj(visualObj);
      sendObj(tempObj);
    }

  });
});

rfid.on('error', function (err) {
  console.error(err);
});



// ===== Start NRF =====
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

      // setInterval(function () {
      //   var b = new Buffer(32); // set buff len of 8 for compat with maniac bug's RF24 lib
      //   //b.fill(0);
      //   //b.writeUInt32BE(n++);
        
      //   var stringified = JSON.stringify(testObj);
      //   b.write(stringified);

      //   console.log("Sending", b);
      //   tx.write(b);
      // }, 5e3); // transmit every 5 seconds
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
// hold this process open
process.ref();