var tessel = require('tessel'),
  NRF24 = require('rf-nrf24'),
  pipes = [0xF0F0F0F0E1, 0xF0F0F0F0D2],
  role = 'pong'; // swap this to pong if you want to wait for receive

var tessel = require('tessel');
var bleLib = require('ble-ble113a');
var clone = require('structured-clone');

var ble;

var trans0_uuid = "883f1e6b76f64da187eb6bdbdb617888";
var trans0_handle = 21;
var trans1_uuid = "21819AB0C9374188B0DBB9621E1696CD";
var trans1_handle = 25;

ble = bleLib.use(tessel.port['B']);

ble.on('ready', function(){

  ble.on('discover', function(device){
    console.log('Device found',device);
    console.log('');
    device.advertisingData.forEach(function(data){
      if (data.typeFlag == 8 && data.data == 'Tessel'){
        console.log('Found another Tessel');
        ble.stopScanning(function(err){
          ble.connect(device, function(err){
            setUpIndicate(device);
          });
        });
      }
    });
  });

  ble.on('indication', parseData);

  ble.on('error', function(err){
    console.log(err);
  });

  ble.on('disconnect', function(peripheral, reason){
    console.log('disconnected', reason);
    ble.startScanning();
  });

  ble.on('connect', function(peripheral){
    console.log('Connected to that other Tessel');
    setUpIndicate(peripheral);
  });

  tessel.button.on('press', function(time){
    console.log('button pressed!');
    ble.disconnect({connection : 0});
  });

  ble.startScanning(function(err){
    err && console.log(err);
    console.log('Scanning');
  });

});

function setUpIndicate(peripheral){
  console.log("peripheral",peripheral);
  peripheral.discoverCharacteristics([trans0_uuid], function(err, characteristic){
    console.log("characteristic",characteristic);
    if (characteristic[0].handle == trans0_handle){
      ble.startIndications(characteristic[0], function(err){
        if (err){
          console.log("Could not start indications", err);
        }
        console.log("Indications started");
        writeData(characteristic[0], {data : "Ping!"});
        console.log('Click!');
      });
    } else {
      console.log("Couldn't find the appropriate characteristic. Check the configuration.");
    }
  });
}

function writeData(characteristic, data){
  var ser = clone.serialize(data);
  ble.write(characteristic, ser, function(err){
    if (err){
      console.log('Remote write failed', err);
    }
  });
}

function parseData(characteristic, serialized_value){
  var data = clone.deserialize(serialized_value);
  console.log(data);
  writeData(characteristic, {data : "Ping!"});
}
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