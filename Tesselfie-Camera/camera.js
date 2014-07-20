var tessel = require('tessel');
var fs = require('fs');
var camera = require('camera-vc0706').use(tessel.port['A']);
var audio = require('audio-vs1053b').use(tessel.port['C']);

var notificationLED = tessel.led[3 ]; // Set up an LED to notify when we're taking a picture



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
  takeSelfie();
  setTimeout(takeSelfie,5000);
}



var audioReady =  false;
var cameraReady = false;

audio.on('ready', function(){
  audioReady = true;
  //set default input to onboard mic and volume to high
  audio.setVolume(1.1, 1.1, function(err){
    if (err){
      console.log('audio volume set errored |', err);
    }
  });
  audio.setOutput('headphones', function(err){
    if (err){
      console.log('audio output set errored |', err);
    }
  });
  if (audioReady && cameraReady) {
    allReady();
  }
});

audio.on('error', function(err) {
  throw err;
});

camera.on('ready', function(){
  cameraReady = true;
  camera.setCompression(0.99, function(err){
    if (err) {
      console.log('error |', err);
    }
  });
  if (audioReady && cameraReady) {
    allReady();
  }
});

camera.on('error', function(err) {
  console.error(err);
});

var allReady = function () {
  // set audio and camera settings
  // takeSelfie();
};

var takeSelfie = function () {
  console.log('taking selfie!');
  // Open a file
  setTimeout(function(){
    fs.createReadStream('beep.mp3').pipe(audio.createPlayStream());
  }, 1000);
  setTimeout(function(){
    fs.createReadStream('beep.mp3').pipe(audio.createPlayStream());
  }, 2000);
  setTimeout(function(){
    fs.createReadStream('beep.mp3').pipe(audio.createPlayStream());
  }, 3000);
  setTimeout(function(){
    fs.readFile('shutter.mp3', function(err, data) {
      audio.play(data, function(){
        console.log('inside callback');
        notificationLED.high();
        camera.takePicture(function(err, image) {
          if (err) {
            console.log('error taking image', err);
          } else {
            console.log('no error');
            notificationLED.low();
            // Name the image
            var name = 'picture-' + Math.floor(Date.now()*1000) + '.jpg';
            // Save the image
            console.log('Picture saving as', name, '...');
            process.sendfile(name, image);
            console.log('done.');
            // Turn the camera off to end the script
            // camera.disable();
          }
        });
      });
    });  
  }, 4000);
};  