import KenBurnsCanvas2D from "kenburns/lib/Canvas2D";
import bezierEasing from "bezier-easing";
import { fabric } from "fabric";
import rectCrop from "rect-crop";
import renderUi from "./ui"

//#region Utility methods
// Utility to load an Image by url, which works data-urls
const loadCrossOriginImage = (src) => new Promise((success, failure) => {
  let img = new window.Image();
  img.crossOrigin = true;
  img.onload = () => success(img);
  img.onabort = img.onerror = failure;
  img.src = src;
  image = img
});

// Utility to create a promise resolved after a delay
const delay = ms => new Promise(success => setTimeout(success, ms));

const title = t => {
  const h2 = document.createElement("h2");
  h2.innerHTML = t;
  return h2;
};

function simpleArraySum(ar) {
  var sum = 0;
  for (var i = 0; i < ar.length; i++) {
    sum += Number.parseFloat(ar[i]);
  }
  return sum;
}

var drawRectCrop = (zoom, center, color) => {
  var centerX = imgDeminsions.width * center[0];
  var centerY = imgDeminsions.height * center[1];
  var rect = rectCrop(zoom, center)(canvasDeminsions, imgDeminsions);
  imgContext.beginPath();
  imgContext.strokeStyle = color;
  imgContext.beginPath();
  imgContext.arc(centerX, centerY, 10, 0, 2 * Math.PI, false);
  imgContext.fillStyle = color;
  imgContext.fill();
  imgContext.lineWidth = 5;
  let x = rect[0]
  let y = rect[1]
  const w = rect[2]
  const h = rect[3]
  // Out-of-bounds corrections
  if (x < 0) {
    x=0
  }
  else if (x + w > imgDeminsions.width) {
    x = imgDeminsions.width - w
  }

  if (y < 0) {
    y=0
  }
  else if (y + h > imgDeminsions.height) {
    y = imgDeminsions.height - h
  }
  console.log(`drawRect ${x},  ${y}, ${w}, ${h}, ${color}`)
  imgContext.strokeRect(x, y, w, h)

  var cz = new fabric.Rect({
    originX: 'left',
    originY: 'top',
    left : x,
    top : y,
    width : w,
    height : h,
    stroke: color,
    // TODO: Does not seem to work 🤦‍♂️
    strokeStyle: {strokeWidth: '42px' },
    fill : 'transparent',
    // lockUniScaling: true wont allow resizing with other locking,
    lockMovementX: true,
    lockMovementY: true,
    lockRotation: true,
  });
  cropZones.push(cz)
  _canvas.add(cz)
  _canvas.renderAll()

}

function displayArray(data) {
  let msg = ""
  data.forEach((value, key) => {
    msg += `[${key}]: ${value}; `
  })
  console.log(msg);
}

function clearKBData() {
  centerPoints.splice(0, centerPoints.length);
  zoom.splice(0, zoom.length);
  durations.splice(0, durations.length);
  delays.splice(0, delays.length);
  crops.splice(0, crops.length);
  easings.splice(0, easings.length);
  resetCropZones();
  continueLoop = false;
  canvas.remove()
  dumpKBData();
  console.groupCollapsed('drawing the clean slate')
  console.log(image)
  imgContext.drawImage(image, 0, 0);
  console.groupEnd()
  waypoints.innerHTML = ""
  imageToggle(null)
}

function dumpKBData() {
  console.groupCollapsed(`${zoom.length} centerPoints, zoom, durations, delay, canvasDeminsions sum ${recordingLength()}`)
  displayArray(centerPoints);
  displayArray(zoom);
  displayArray(durations);
  displayArray(delays);
  displayArray(cropZones);
  console.log(canvasDeminsions)
  console.groupEnd();
  dispalyWaypoints();

}

function dispalyWaypoints() {
  waypoints.innerHTML = ""
  for (var i = 0; i < centerPoints.length; i++) {
    const div = document.createElement("div")
    div.className = "column"
    const p1 = document.createElement("p");
    let text = `Waypoint ${i}: Color: ${color[i % color.length]}`
    p1.innerText = text
    const style = {
      color: color[i % color.length],
    }
    p1.className = "items"
    Object.assign(p1.style, style)
    const p2 = document.createElement("p");
    text = `duration:${durations[i] / 1000}; delay:${delays[i] / 1000}`
    p2.className = "items"
    p2.innerText = text
    div.appendChild(p1)
    // TODO: Conditional Checkbox
    let textInputs = true;
    waypoints.appendChild(div)
    // SLIDERS
    var uiCxInput = renderUi.slider(labels[0], centerPoints[i][0], i, inputChanged);
    var uiCyInput = renderUi.slider(labels[1], centerPoints[i][1], i, inputChanged);
    var uiZInput = renderUi.slider(labels[2], zoom[i], i, inputChanged);
    var uiSDurInput = renderUi.slider(labels[3], durations[i] / 10000, i, inputChanged);
    var uiSDelInput = renderUi.slider(labels[4], delays[i] / 10000, i, inputChanged);

    if (textInputs) {
      // TEXT
      var tuiCxInput = renderUi.input(labels[5], centerPoints[i][0]*100, i, inputChanged);
      var tuiCyInput = renderUi.input(labels[6], centerPoints[i][1]*100, i, inputChanged);
      var tuiZInput = renderUi.input(labels[7], zoom[i]*100, i, inputChanged);
      var tuiSDurInput = renderUi.input(labels[8], durations[i], i, inputChanged);
      var tuiSDelInput = renderUi.input(labels[9], delays[i] , i, inputChanged);
    }

    waypoints.appendChild(uiCxInput)
    if (textInputs) waypoints.appendChild(tuiCxInput)
    waypoints.appendChild(uiCyInput)
    if (textInputs) waypoints.appendChild(tuiCyInput)
    waypoints.appendChild(uiZInput)
    if (textInputs) waypoints.appendChild(tuiZInput)
    waypoints.appendChild(uiSDurInput)
    if (textInputs) waypoints.appendChild(tuiSDurInput)
    waypoints.appendChild(uiSDelInput)
    if (textInputs) waypoints.appendChild(tuiSDelInput)

    waypoints.appendChild(p2)
    waypoints.appendChild(document.createElement("br"))
  }
  const rec = document.createElement("p");
  rec.innerText = `Legnth: ${(recordingLength() / 1000).toFixed(3)}s`
  waypoints.appendChild(rec)
}

function imageDimensionsInputs() {
  const div = document.createElement("div")
  const uiKBWInput = renderUi.input('Width', canvasDeminsions.width, 'width', inputKBChanged);
  const uiKBHInput = renderUi.input('Height', canvasDeminsions.height, 'height', inputKBChanged);
  div.style.padding = '16px'
  div.appendChild(uiKBWInput)
  div.appendChild(uiKBHInput)
  return div
}

function inputChanged(ev, key) {
  const emitter = document.getElementById(key)
  const mapper = key.split('_')
  const idx = mapper[1];
  console.groupCollapsed(`received change on ${JSON.stringify(mapper)} to value ${emitter.value}`)
  console.log(ev)
  console.groupEnd()

  // Error Checking
  if (isNaN(emitter.value)) {
    console.error(`${key} input of ${emitter.value} is NaN, so input rejected 🤷‍♂️`)
    emitter.style.outline = '1px solid red'
    return
  }

  switch (mapper[0]) {
    case labels[0]:
    case labels[5]:
      centerPoints[idx][0] = emitter.value / 100;
      break;
    case labels[1]:
    case labels[6]:
      centerPoints[idx][1] = emitter.value / 100;
      break;
    case labels[2]:
    case labels[7]:
      zoom[idx] = emitter.value / 100;
      break;
    case labels[3]:
    case labels[8]:
      durations[idx] = emitter.value * 100;
      break;
    case labels[4]:
    case labels[9]:
      delays[idx] = emitter.value * 100;
      break;
    default:
      console.log(mappern)
  }
  crops[idx] = rectCrop(zoom[idx], centerPoints[idx])
  doImageMapping(exampleImageUrl);
  dispalyWaypoints()
}

function inputKBChanged(ev, key) {
  const emitter = document.getElementById(key)
  const mapper = key.split('_')
  try {
    canvasDeminsions[mapper[1]] = Number.parseInt(emitter.value)
    side.innerHTML = ""
    doImageMapping(exampleImageUrl)
  }
  catch (e) {
    console.error(e)
  }
}
function imageToggle(ev) {
  const div = document.getElementById("target")
  var style = div.style
  console.log(style)
  if (style.display == "none" || !ev) {
    // Always show image when loading image or clearing KB data
    style.display = "flex"
    Object.apply(div.style, style)
    return
  }
  style.display = "none"
  Object.apply(div.style, style)
}

// Ken Burns animation worker
const exampleAnimation =
  kenBurns => // for a given kenBurns instance (impl agnostic)
    source => // and the 'source' (image / texture, dep on the impl)
      crops.reduce((p, crop, i) => p.then(() => // chain all the steps
        kenBurns.animate( // animate kenburns
          source,
          crop,
          crops[(i + 1) % crops.length], // next crop spot
          durations[i],
          easings[i]
        )
          .then(() => delay(delays[i])) // wait a bit
      ), Promise.resolve()) // start with a resolved promise
        .then(() => continueLoop && exampleAnimation(kenBurns)(source)); // loop again
//#endregion

//#region  Animation constants and datat structures
const color = ['red', 'orange', 'green', 'blue', 'cyan', 'black']
const labels = ['Cx', 'Cy', 'Zoom', 'Duration', 'Delay', 'CxP', 'Cy-P', 'Zoom-P', 'Duration-MS', 'Delay-MS']
// KB Center Point & Zoom levels for animation freeze-frame 
const centerPoints = [
  [0.15, 0.38],
  [0.8, 0.0],
  [0.54, 0.47],
  [0.81, 0.48],
];
const zoom = [
  0.4,
  0.3,
  0.1,
  0.2,
];
// Frame transition easing
const easings = [
  bezierEasing(0.6, 0, 1, 1),
  bezierEasing(0, 0, 1, 1),
  bezierEasing(0.8, 0, 0.2, 1),
  bezierEasing(0.5, 0, 1, 1),
  bezierEasing(0, 0, 0.6, 1),
];
// Duration of easing between frames
const durations = [
  3000,
  2000,
  3000,
  2000,
  3000,
];
// Delay on freeze-frame
const delays = [
  800,
  300,
  0,
  1000,
  0,
];
// Actual croppings of the image
const crops = [
  rectCrop(zoom[0], centerPoints[0]),
  rectCrop(zoom[1], centerPoints[1]),
  rectCrop(zoom[2], centerPoints[2]),
  rectCrop(zoom[3], centerPoints[3]),
  rectCrop.largest,
];
// Fabric objects to be filled by doImageMapping calling drawRectCrop
const cropZones = [];

let continueLoop = true;

//#endregion KB points

// describe our loop example
let exampleImageUrl = "download.jpg" // "http://i.imgur.com/Uw2EQEk.jpg"
var canvasDeminsions = { width: 400, height: 400 }
var canvas;  // Ken Burns canvas for rendering

const createKBCanvas = () => {
  // Canvas2D example
  var canvas2d = document.createElement("canvas");
  canvas2d.id = "animCanvas"
  canvas2d.style.width = `${canvasDeminsions.width}px`
  canvas2d.style.height = `${canvasDeminsions.height}px`
  canvas2d.width = canvasDeminsions.width
  canvas2d.height = canvasDeminsions.height
  return canvas2d
}

function resetCropZones() {
  cropZones.forEach(obj => {
    console.log(obj)
    _canvas.remove(obj)
  })
  cropZones.splice(0, cropZones.length);
}

function doImageMapping(imageUrl) {
  exampleImageUrl = imageUrl;
  if (canvas) {
    side.innerHTML = ""
  }
  canvas = createKBCanvas()

  const ctx = canvas.getContext("2d");
  const dimInputs = imageDimensionsInputs()
  side.appendChild(dimInputs)
  side.appendChild(canvas);
  var kenBurnsCanvas2d = new KenBurnsCanvas2D(ctx);
  console.log('starting KB map')
  loadCrossOriginImage(imageUrl, true)
    .then(exampleAnimation(kenBurnsCanvas2d))
    .catch(e => console.error("Canvas2D implementation failure:", e));

  // Load full image with on-click handler
  loadCrossOriginImage(imageUrl).then(img => {
    console.log(`loaded the image with w: ${img.width} by h: ${img.height}`);
    var f_img = new fabric.Image(img);
    _canvas.setWidth(img.width)
    _canvas.setHeight(img.height)
    _canvas.setBackgroundImage(f_img);

    imgDeminsions.width = img.width;
    imgDeminsions.height = img.height;
    imgCanvas.width = img.width
    imgCanvas.height = img.height
    imgContext.drawImage(img, 0, 0);
    imgCanvas.addEventListener('click', canvasClick, false);

    resetCropZones()
    for (var i = 0; i < zoom.length; i++) {
      drawRectCrop(zoom[i], centerPoints[i], color[i % color.length]);
    }
  });
}

var imgDeminsions = { width: 0, height: 0 };
var imgCanvas = document.getElementById("canvas");
var imgContext = imgCanvas.getContext('2d');
let image = new Image();

const randomHundreth = () => Math.floor(10 + Math.random() * 90) / 100
var canvasClick = (ev) => {
  var cX = ev.offsetX / imgCanvas.width
  var cY = ev.offsetY / imgCanvas.height
  centerPoints.push([Math.floor(cX * 100) / 100, Math.floor(cY * 100) / 100])
  const wayPoints = zoom.length;
  zoom.push(randomHundreth())
  console.log(`Click at cX ${cX} cY:${cY}`)
  easings.push(easings[Math.floor(Math.random() * wayPoints)]);
  // Duration of easing between frames
  durations.push((randomHundreth() * 10000).toFixed(2))
  // Delay on freeze-frame
  delays.push((randomHundreth() * 1000).toFixed(2))
  crops.push(rectCrop(zoom[wayPoints], centerPoints[wayPoints]));
  continueLoop = true;
  // const cz = createCropZone(wayPoints)
  // _canvas.add(cz)
  // console.log(cz)
  // cropzones.push(cz)
  dumpKBData();
  doImageMapping(exampleImageUrl);
}
const newImage = (image) => {
  // imageData = image;
  exampleImageUrl = image
  clearKBData()
  imageToggle(null)
  doImageMapping(image)
}

//#region append elements to the DOM
const waypoints = document.getElementById("waypoints");
const header = document.getElementById("header");
const container = document.getElementById("side");
const controls = document.getElementById("controls");
const buttonRow = document.createElement("div");

header.appendChild(title("Animage Ken Burns Render"));
doImageMapping(exampleImageUrl)

controls.appendChild(buttonRow);
buttonRow.appendChild(renderUi.selectFile(newImage))
buttonRow.appendChild(renderUi.button('Clear Waypoints', clearKBData))
buttonRow.appendChild(renderUi.button('Toggle Image', imageToggle))
buttonRow.appendChild(renderUi.button('Console Dump', dumpKBData))
buttonRow.appendChild(renderUi.button('Restart Loop', () => doImageMapping(exampleImageUrl)))
buttonRow.appendChild(renderUi.button('WebM Recording', startRecording))
buttonRow.appendChild(renderUi.button('GIF Recording', startGif))
dispalyWaypoints()
//#endregion

//#region Fabric helper methods
imageToggle(1)  // Hide ordinary canvas till ready to replace it with fabric canvas
var _canvas =  new fabric.Canvas('fabric-canvas', {
  width: 500,
  height: 500,
  containerClass: 'fabric-canvas',
  enableRetinaScaling: false,
  interactive: true,
  selection : false,
  controlsAboveOverlay:true,
  centeredScaling:true,
  allowTouchScrolling: true,
  selectionLineWidth: 42,
});
var fab = document.getElementById("fabric-canvas")
fab.addEventListener('click', fabclick);
function fabclick(ev){
  console.log(ev)
  _canvas.add(new fabric.Circle({
    radius: 10, fill: 'green', left: ev.offsetX, top: ev.offsetY
    // radius: 20, fill: 'green', left: 100, top: 100
  }));
}

//handler for done modifying objects on canvas
var modifiedHandler = function (evt) {
  var modifiedObject = evt.target;
  console.groupCollapsed(modifiedObject.get('left'), modifiedObject.get('top'));
  console.log(modifiedObject)
  console.groupEnd()
  // TODO update centerpoint and zoom arrays
  // Intersection of diaganol
  // Zoom scale calculation

};

var moveHandler = function (evt) {
  var movingObject = evt.target;
  console.groupCollapsed(movingObject.get('left'), movingObject.get('top'));
  console.log(movingObject)
  console.groupEnd()
  // TODO: Is this even necessary?
};

var mouseDown = function (evt) {
  var movingObject = evt.target;
  if (!movingObject) {
    console.groupCollapsed(`clicked outside any crop at ${evt.e.offsetX}, ${evt.e.offsetY}`);
    console.log(evt)
    console.groupEnd()
    canvasClick(evt.e)
    return
  }
  console.groupCollapsed(movingObject.get('left'), movingObject.get('top'));
  console.log(movingObject)
  console.groupEnd()
};

_canvas.on({
  'object:moving' : moveHandler,
  'object:modified' : modifiedHandler,
  'mouse:down': mouseDown
});


//#endregion


//#region WebM helper methods
function recordingLength() {
  return Number.parseFloat(simpleArraySum(durations)) + Number.parseFloat(simpleArraySum(delays))
}

function startRecording() {
  const recordDuration = recordingLength();

  if (!recordDuration) {
    console.log('noting to record')
    return
  }
  doImageMapping(exampleImageUrl)
  anim()
  const chunks = []; // here we will store our recorded media chunks (Blobs)
  const stream = canvas.captureStream(); // grab our canvas MediaStream
  const rec = new MediaRecorder(stream); // init the recorder
  // every time the recorder has new data, we will store it in our array
  rec.ondataavailable = e => chunks.push(e.data);
  // only when the recorder stops, we construct a complete Blob from all the chunks
  rec.onstop = e => exportVid(new Blob(chunks, { type: 'video/webm' }));

  rec.start();
  console.log(`started recording for ${recordDuration} s`)
  setTimeout(() => rec.stop(), recordDuration); // stop recording
}

function exportVid(blob) {
  const vidDiv = document.createElement('div');
  const vid = document.createElement('video');
  vid.src = URL.createObjectURL(blob);
  vid.controls = true;
  vidDiv.appendChild(vid);
  const a = document.createElement('a');
  a.download = 'myvid.webm';
  a.href = vid.src;
  a.textContent = '⏬ 📽 💾';
  controls.appendChild(a);
  container.appendChild(vidDiv);
}

function anim() {
  requestAnimationFrame(anim);
}
//#endregion

//#region GIF recorder
// Adapted from https://dev.to/melissamcewen/code-experiment-converting-canvas-animations-to-gifs-58hh
function startGif() {
  if (!recordingLength()) {
    console.log('noting to record')
    return
  }

  let numFrames = Math.round(recordingLength()/100);
  let canvas = document.getElementById("animCanvas");
  let gif = new GIF({
    workers: 2,
    quality: 10,
    loop: true,
    // TODO: Conditional Checkbox
    // transparent: true,
  });
  //https://codepen.io/agar3s/pen/pJpoya
  let ctx = canvas.getContext("2d");
  let x = 0;
  let y = 0;
  let rendered = false;

  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = "lighter";
  console.log(`Starting GIF of ${numFrames} frames`)
  // Start loop at beginning
  doImageMapping(exampleImageUrl)

  function loop() {
    x += 2;
    y += 2;
    if (x > numFrames*2) {
      x = -50;
      y = -50;
      if (rendered === false) {
        console.log("Rendering frame");
        gif.render();
      } else {
        requestAnimationFrame(loop);
      }
    } else {
      if (rendered === false) {
          console.log(`Rendering Gif of ${numFrames} frames`);
        gif.addFrame(canvas, {
          copy: true,
          delay: 50
        });
      }
      setTimeout(() => requestAnimationFrame(loop), 100)
    }
  }

  requestAnimationFrame(loop);

  gif.on("finished", function(blob) {
    const div = document.createElement("div")
    const img = document.createElement("img")
    div.className = "column"
    img.src = URL.createObjectURL(blob);
    console.log(`Gif rendered of ~${recordingLength()}s`);
    div.appendChild(title("GIF"))
    div.appendChild(img)
    container.appendChild(div)
    rendered = true;
    requestAnimationFrame(loop);
  });
}
//#endregion