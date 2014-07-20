var tessel = require('tessel');
var fs = require('fs');
var camera = require('camera-vc0706').use(tessel.port['A']);
var audio = require('audio-vs1053b').use(tessel.port['C']);

var notificationLED = tessel.led[3 ]; // Set up an LED to notify when we're taking a picture


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
  takeSelfie();
};

var takeSelfie = function () {

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
            camera.disable();
          }
        });
      });
    });  
  }, 4000);
};  