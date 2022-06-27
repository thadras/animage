import KenBurnsCanvas2D from "kenburns/lib/Canvas2D";
import bezierEasing from "bezier-easing";
import { fabric } from "fabric";
import rectCrop from "rect-crop";
import renderUi from "./ui"
import quickView from "./quickview"

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

function recordingLength() {
  return Number.parseFloat(simpleArraySum(durations)) + Number.parseFloat(simpleArraySum(delays))
}

const randomHundreth = () => Math.floor(10 + Math.random() * 90) / 100

var drawRectCrop = (zoom, center, color) => {
  var centerX = imgDimensions.width * center[0];
  var centerY = imgDimensions.height * center[1];
  var rect = rectCrop(zoom, center)(kbCanvasDimensions, imgDimensions);
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
  else if (x + w > imgDimensions.width) {
    x = imgDimensions.width - w
  }

  if (y < 0) {
    y=0
  }
  else if (y + h > imgDimensions.height) {
    y = imgDimensions.height - h
  }
  // Original canvas
  imgContext.strokeRect(x, y, w, h)
  // Fabric canvas
  var cz = new fabric.Rect({
    originX: 'left',
    originY: 'top',
    left : x,
    top : y,
    width : w,
    height : h,
    stroke: color,
    strokeWidth: '5',
    fill : 'transparent',
    cornerColor: color,
    // allows resizing that maintains scale
    lockUniScaling: true,
    lockRotation: true,
  });
  // Disable vert/horz/rotation controls
  cz.setControlsVisibility({ml: false, mr: false, mt: false, mb: false, mtr: false})
  cropZones.push(cz)
  _canvas.add(cz)
  _canvas.renderAll()

}

const fillEasingList = () => {
  if (!easingSelectValues.length) return
  easings.splice(0, easings.length)
  easingSelectValues.forEach((val) =>{
    const params = []
    val.split(',').forEach((p) => params.push(Number.parseFloat(p)))
    easings.push(bezierEasing(params[0], params[1], params[2], params[3]))
  })
}

function displayArray(data) {
  let msg = ""
  data.forEach((value, key) => {
    msg += `[${key}]: ${value}; `
  })
  console.log(msg);
}

// Clear all Ken Burn waypoints and redraw image
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
  console.log('Rendering the image without waypoints')
  imgContext.drawImage(image, 0, 0);
  waypoints.innerHTML = ""
  // Restore the image display in-case it was hidden
  imageToggle(null)
}

// Free fabric canvas objects and empty array
function resetCropZones() {
  cropZones.forEach(obj => _canvas.remove(obj))
  cropZones.splice(0, cropZones.length);
}

// Find a fabric canvas object by key in the array
function findCropZone(key) {
  let found = -1
  cropZones.forEach((obj, i) => {
      if (key == obj.ownMatrixCache.key) {
        found = i;
      }
  })
  return found;
}

// Dump some Ken Burns data about the waypoints
function dumpKBData() {
  console.groupCollapsed(`scaled ${imgScale} ${zoom.length} centerPoints, zoom, durations, delay, bezier values, sum ${recordingLength()}`)
  if (zoom.length) {
    displayArray(centerPoints);
    displayArray(zoom);
    displayArray(durations);
    displayArray(delays);
    displayArray(easingSelectValues);
    cropZones.forEach(obj => console.log(obj.ownMatrixCache.key))
    console.groupCollapsed('CZ Klass objects')
    cropZones.forEach(obj => console.log(obj))
  } else {
    console.log('No waypoints')
  }
  console.groupEnd()
  console.log({bezierOptions})
  console.log('👆FYI https://cubic-bezier.com/')
  console.groupEnd();
  dispalyWaypointControls();
}

// Minimize raw image and leave the Ken Burns Canvas in-view for WP edits
function imageToggle(ev) {
  const div = document.getElementById("target")
  var style = div.style

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
        .then(() => continueLoop && exampleAnimation(kenBurns)(source))
        .catch(() => console.log('Swallow error from clearing data mid-exe')); // loop again
//#endregion

//#region  Animation constants and data structures
const color = ['red', 'orange', 'green', 'blue', 'cyan', 'black']
// Labels for UI Sliders & Inputs contols
const labels = ['Cx', 'Cy', 'Zoom', 'Duration', 'Delay', 'CxP', 'Cy-P', 'Zoom-P', 'Duration-MS', 'Delay-MS', "Bezier"]
const bezierOptions = [
    { "name": "ease", "value": "0.25,.1,0.25,1" },
    { "name": "linear", "value": "0,0,1,1" },
    { "name": "ease-in", "value": ".42,0,1,1" },
    { "name": "ease-in-2", "value": "0.6, 0, 1, 1" },
    { "name": "ease-in-3", "value": "0.5, 0, 1, 1" },
    { "name": "ease-out", "value": "0,0,0.58,1" },
    { "name": "ease-out-2", "value": "0, 0, 0.6, 1" },
    { "name": "ease-in-out", "value": "0.42,0,0.58,1" },
    { "name": "ease-in-out-2", "value": "0.8, 0, 0.2, 1" }
]
// KB Center Point & Zoom levels for animation freeze-frame 
const centerPoints = [
  [0.45, 0.32],
  [0.85, 0.2],
  [0.80, 0.51],
  [0.50, 0.77],
];
const zoom = [
  0.4,
  0.3,
  0.5,
  0.3,
];
// Frame easing uses cubic-bezier curves for transition speed change
// & will be init by fillEasingList when called via doImageMapping
const easings = [
];
const easingSelectValues = [
  "0.6, 0, 1, 1",
  "0, 0, 1, 1",
  "0.8, 0, 0.2, 1",
  "0.5, 0, 1, 1",
  "0, 0, 0.6, 1",
]
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
let modifiedWP = -1  // Waypoint contols to remain persistent
//#endregion KB points

//#region High-level variables and UI processors
// The image, possibly scaled, that will have a Ken Burns affect applied
let exampleImageUrl = "tree.jfif"
let image = new Image();
const imgDimensions = { width: 0, height: 0 };
const imgCanvas = document.getElementById("fabric-canvas");
const imgContext = imgCanvas.getContext('2d');

// Canvas used to loop a Ken Burns animation of the above image
let canvas;  // Ken Burns canvas for rendering animation
const kbCanvasDimensions = { width: 400, height: 400 }

const createKBCanvas = () => {
  // Canvas2D example
  var canvas2d = document.createElement("canvas");
  canvas2d.id = "animCanvas"
  canvas2d.style.width = `${Math.ceil(kbCanvasDimensions.width)}px`
  canvas2d.style.height = `${Math.ceil(kbCanvasDimensions.height)}px`
  canvas2d.width = kbCanvasDimensions.width
  canvas2d.height = kbCanvasDimensions.height
  return canvas2d
}

// Main functional of drawing image & rendering Ken Burn transition between waypoints
function doImageMapping(imageUrl) {
  exampleImageUrl = imageUrl
  if (canvas) {
    side.innerHTML = ""
  }
  canvas = createKBCanvas()

  fillEasingList()
  const ctx = canvas.getContext("2d");
  const dimInputs = imageDimensionsInputs()
  side.appendChild(canvas);
  side.appendChild(dimInputs)
  var kenBurnsCanvas2d = new KenBurnsCanvas2D(ctx);
  loadCrossOriginImage(imageUrl, true)
    .then(exampleAnimation(kenBurnsCanvas2d))
    .catch(e => console.error("Canvas2D implementation failure:", e));

  // Load full image with on-click handler
  loadCrossOriginImage(imageUrl).then(img => {
    console.log(`Loaded image with width: ${img.width}, and height: ${img.height}`);
    var f_img = new fabric.Image(img);
    f_img.scaleX = imgScale
    f_img.scaleY = imgScale
    _canvas.setWidth(f_img.getScaledWidth())
    _canvas.setHeight(f_img.getScaledHeight())
    _canvas.setBackgroundImage(f_img);
    if (imgScale != 1 ) {
      console.log(`Drawing scaled image width: ${_canvas.width}, and height: ${_canvas.height}`);
    }
    imgDimensions.width = imgCanvas.width =  f_img.getScaledWidth();
    imgDimensions.height = imgCanvas.height = f_img.getScaledHeight();
    imgCanvas.addEventListener('click', canvasClick, false);

    resetCropZones()
    for (var i = 0; i < zoom.length; i++) {
      drawRectCrop(zoom[i], centerPoints[i], color[i % color.length]);
    }
  });
}

// UI interaction of adding a waypoint, with random initialization, and redrawing
const canvasClick = (ev) => {
  var cX = ev.offsetX / imgCanvas.width
  var cY = ev.offsetY / imgCanvas.height
  centerPoints.push([Math.floor(cX * 100) / 100, Math.floor(cY * 100) / 100])
  const wayPoints = zoom.length;
  zoom.push(randomHundreth())
  console.log(`Click at cX ${cX} cY:${cY}`)
  const randomCurve = Math.floor(Math.random() * bezierOptions.length)
  easingSelectValues.push(bezierOptions[randomCurve].value);
  // Duration of easing between frames
  durations.push((randomHundreth() * 10000).toFixed(2))
  // Delay to freeze-frame
  delays.push((randomHundreth() * 1000).toFixed(2))
  crops.push(rectCrop(zoom[wayPoints], centerPoints[wayPoints]));
  continueLoop = true;
  modifiedWP = centerPoints.length - 1
  dumpKBData();
  doImageMapping(exampleImageUrl);
}

let imgScale = 1
// Handler for Select File to re-init key data
const newImage = (image, scale) => {
  imgScale = scale
  console.log(`scale new image by ${imgScale}%`)
  exampleImageUrl = image
  modifiedWP = -1
  clearKBData()
  imageToggle(null)
  doImageMapping(image)
}
//#endregion

//#region append elements to the DOM
const waypoints = document.getElementById("waypoints");
const header = document.getElementById("header");
const side = document.getElementById("side");
const gifContainer = document.getElementById("sideGif");
const vidContainer = document.getElementById("sideWebM");
const controls = document.getElementById("controls");
const buttonRow = document.createElement("div");

header.insertBefore(title("Animage Ken Burns Render"), controls);
doImageMapping(exampleImageUrl)

controls.appendChild(buttonRow);
buttonRow.appendChild(renderUi.selectFile(newImage))
buttonRow.appendChild(renderUi.button('Clear Waypoints', clearKBData))
buttonRow.appendChild(renderUi.button('Toggle Image', imageToggle))
buttonRow.appendChild(renderUi.button('Console Dump', dumpKBData))
buttonRow.appendChild(renderUi.button('Restart Loop', () => doImageMapping(exampleImageUrl)))
buttonRow.appendChild(renderUi.button('WebM Recording', startRecording))
buttonRow.appendChild(renderUi.button('GIF Recording', startGif))
dispalyWaypointControls()

// Update nav bar to include the Ken Burns waypoint UI controls
function dispalyWaypointControls() {
  waypoints.innerHTML = ""
  for (var i = 0; i < centerPoints.length; i++) {
    // Controls are collapesed unless the WP is being modified or added
    const divHeader = document.createElement("div")
    divHeader.className = modifiedWP == i ? "is-selected" : ""
    const p1 = document.createElement("p");
    p1.className = "items"
    p1.innerText = `Waypoint ${i}`
    p1.style.color = color[i % color.length]
    // Button for expand or collapse quickview WP control section
    const qvButton = document.createElement("button")
    qvButton.setAttribute('data-quick-view', "")
    qvButton.setAttribute('aria-expanded', modifiedWP == i)
    qvButton.innerText =  modifiedWP != i  ? '🔽' : '🔼'
    divHeader.appendChild(p1)
    divHeader.appendChild(qvButton)

    const divControls = document.createElement("div")
    divControls.className = `column ${modifiedWP == i ? "": "is-hidden"} quickview-${i}`
    // TODO: Conditional Checkbox
    let textInputs = true;
    waypoints.appendChild(divHeader)
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
      var tuiSDelInput = renderUi.input(labels[9], delays[i], i, inputChanged);
    }
    const bezier = renderUi.select(labels[10], i, easingSelectValues[i], bezierOptions, bezierChanged)

    divControls.appendChild(uiCxInput)
    if (textInputs) divControls.appendChild(tuiCxInput)
    divControls.appendChild(uiCyInput)
    if (textInputs) divControls.appendChild(tuiCyInput)
    divControls.appendChild(uiZInput)
    if (textInputs) divControls.appendChild(tuiZInput)
    divControls.appendChild(uiSDurInput)
    if (textInputs) divControls.appendChild(tuiSDurInput)
    divControls.appendChild(uiSDelInput)
    if (textInputs) divControls.appendChild(tuiSDelInput)
    divControls.appendChild(bezier)

    const div = document.createElement("div")
    div.className = "wp-header"
    div.appendChild(divHeader)
    div.appendChild(divControls)
    waypoints.appendChild(div)
    waypoints.appendChild(document.createElement("br"))
  }
  modifiedWP = -1
  const rec = document.createElement("p");
  rec.innerText = `Legnth: ${(recordingLength() / 1000).toFixed(3)}s`
  waypoints.appendChild(rec)
  // Add handlers for the WP control sections
  quickView.render()
}

// UI redering for KB image dimensions
function imageDimensionsInputs() {
  const divKB = document.createElement("div")
  const pKB = document.createElement("p")
  pKB.innerText = "Animation Output"
  divKB.className = "column items"
  divKB.style.alignSelf = "center"
  divKB.appendChild(pKB)
  const div = document.createElement("div")
  const uiKBWInput = renderUi.input('Width', kbCanvasDimensions.width, 'width', inputKBChanged);
  const uiKBHInput = renderUi.input('Height', kbCanvasDimensions.height, 'height', inputKBChanged);
  div.style.paddingBottom  = '16px'
  div.appendChild(uiKBWInput)
  div.appendChild(uiKBHInput)
  divKB.appendChild(div)
  return divKB
}

// UI Handlers
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
      centerPoints[idx][0] = Number.parseFloat(emitter.value / 100).toPrecision(3)
      break;
    case labels[1]:
    case labels[6]:
      centerPoints[idx][1] =Number.parseFloat(emitter.value / 100).toPrecision(3)
      break;
    case labels[2]:
    case labels[7]:
      zoom[idx] = emitter.value / 100 < 1 ? Number.parseFloat(emitter.value / 100).toPrecision(3) : 0.98;
      break;
    // The range inputs for time values have been scaled whereas the text are as-is
    case labels[3]:
    case labels[8]:
      durations[idx] = mapper[0] == labels[3] ? emitter.value * 100 : emitter.value
      break;
    case labels[4]:
    case labels[9]:
      delays[idx] = mapper[0] == labels[4] ? emitter.value * 100 : emitter.value
      break;
    default:
      return
  }
  crops[idx] = rectCrop(zoom[idx], centerPoints[idx])
  modifiedWP = idx
  doImageMapping(exampleImageUrl);
  dispalyWaypointControls()
}

function inputKBChanged(ev, key) {
  const emitter = document.getElementById(key)
  const mapper = key.split('_')
  try {
    kbCanvasDimensions[mapper[1]] = Number.parseInt(emitter.value)
    side.innerHTML = ""
    doImageMapping(exampleImageUrl)
  }
  catch (e) {
    console.error(e)
  }
}

function bezierChanged(ev, key) {
  const select = document.getElementById(key)
  console.log(`bezier changed at ${JSON.stringify(key)} to ${select.value}`)
  const index = key.split('_')[1]
  easingSelectValues[index] = select.value
  doImageMapping(exampleImageUrl)
}
//#endregion

//#region Fabric helper methods
var _canvas =  new fabric.Canvas('fabric-canvas', {
  containerClass: 'fabric-canvas',
  enableRetinaScaling: false,
  interactive: true,
  selection : true,
  controlsAboveOverlay:true,
  centeredScaling:true,
  allowTouchScrolling: true,
});

//handler for done modifying objects on canvas
var modifiedHandler = function (evt) {
  var modifiedObject = evt.target;
  if (!modifiedObject) { return }  // Unlikely CYA 🤯
  if ( Math.abs(modifiedObject.getScaledWidth() - modifiedObject.width) > 1
      || Math.abs(modifiedObject.getScaledHeight() - modifiedObject.height)  > 1 ) {
    console.log('skip recentering on a scaled event')
    return
  }
  // find selected object & update centerpoint iff not scaled (event-chaining)
  const index = findCropZone(modifiedObject.ownMatrixCache.key)
  if (index < 0) {
    console.error(`Could not locate modified object ${modifiedObject.ownMatrixCache.key}`)
    return
  }
  console.groupCollapsed(`modified L${modifiedObject.get('left')}, T${ modifiedObject.get('top')}, key: ${modifiedObject.ownMatrixCache.key}`);
  console.log(modifiedObject)
  // Intersection of diaganol
  const xCenter = modifiedObject.left + modifiedObject.width / 2
  const yCenter = modifiedObject.top + modifiedObject.height / 2
  const oldY = centerPoints[index][1]
  const oldX = centerPoints[index][0]
  centerPoints[index][0] = Number.parseFloat(xCenter/imgDimensions.width).toPrecision(3);
  centerPoints[index][1] = Number.parseFloat(yCenter/imgDimensions.height).toPrecision(3);

  doImageMapping(exampleImageUrl)
  dispalyWaypointControls()
  console.groupEnd()
  console.log(`centerpoint from ${oldX}, ${oldY} -> ${xCenter/imgDimensions.width}, ${yCenter/imgDimensions.height}`)

};

var scaledHandler = function (evt) {
  var modifiedObject = evt.target;
  if (!modifiedObject) { return }  // Unlikely CYA 🤯
  // find selected object, update zoom
  const index = findCropZone(modifiedObject.ownMatrixCache.key)
  if (index < 0) {
    console.error(`Could not locate modified object ${modifiedObject.ownMatrixCache.key}`)
    return
  }
  console.groupCollapsed(`scaled w${modifiedObject.getScaledWidth()}, h${ modifiedObject.getScaledHeight()}, key: ${modifiedObject.ownMatrixCache.key}`);
  console.log(modifiedObject)
  // Zoom scale calculation and manage out-of-scale changes
  const scale = modifiedObject.getScaledWidth() / modifiedObject.getScaledHeight()
  const scaleImg = imgDimensions.width / imgDimensions.height
  const scaleKB = kbCanvasDimensions.width / kbCanvasDimensions.height
  // ATM assume the scale is mainatined
  const newZoom = modifiedObject.getScaledWidth() / imgDimensions.width
  const oldZoom = zoom[index]
  zoom[index] = Number.parseFloat(newZoom).toPrecision(3)
  crops[index] = rectCrop(zoom[index], centerPoints[index])

  doImageMapping(exampleImageUrl)
  dispalyWaypointControls()
  console.groupEnd()
  console.log(`zoom n${newZoom} o${oldZoom} scales mod: ${scale} img: ${scaleImg} kb: ${scaleKB}`)
}

var mouseDown = function (evt) {
  var movingObject = evt.target;
  if (!movingObject) {
    console.groupCollapsed(`clicked outside any crop at ${evt.e.offsetX}, ${evt.e.offsetY}`);
    console.log(evt)
    if (evt.e instanceof MouseEvent){
      canvasClick(evt.e)
    }
    else if (evt.e instanceof TouchEvent) {
      const mockE = {
        offsetX: evt.pointer.x,
        offsetY: evt.pointer.y,
      }
      canvasClick(mockE)
    }
    else {
      console.error('🤷‍♂️What sort of event even got here then?')
    }
    console.groupEnd()
  }
};

var info = document.getElementById('info');

// TODO: WIP for fabric touch interaction and displaying info in view
function touchG(ev) {
  const msg = `G ${ev.pointer.x}, ${ev.pointer.y}`
  var text = document.createTextNode(msg);
  info.insertBefore(text, info.firstChild);
  console.log(ev)
}
function touchD(ev) {
  const msg = `D ${ev.pointer.x}, ${ev.pointer.y}`
  var text = document.createTextNode(msg);
  info.insertBefore(text, info.firstChild);
  console.log(ev)
}
function touchO(ev) {
  var text = document.createTextNode(' Orientation ');
  info.insertBefore(text, info.firstChild);
  console.log(ev)
}
function touchS(ev) {
  var text = document.createTextNode(' Shaking ');
  info.insertBefore(text, info.firstChild);
  console.log(ev)
}
function touchLP(ev) {
  const mesg = `LP ${ev.pointer.x}, ${ev.pointer.y}`
  var text = document.createTextNode(mesg);
  info.insertBefore(text, info.firstChild);
  console.log(ev)
}

_canvas.on({
  'object:modified' : modifiedHandler,
  'object:scaled' : scaledHandler,
  'mouse:down': mouseDown,
  'touch:longpress': touchLP,
  'touch:gesture': touchG,
  'touch:drag': touchD,
  'touch:orientation': touchO,
  'touch:shake': touchS,
});
//#endregion

//#region WebM helper methods
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
  vidDiv.className = "column"
  vidDiv.appendChild(title("WebM"))
  vidDiv.appendChild(vid);
  const a = document.createElement('a');
  a.download = 'myvid.webm';
  a.href = vid.src;
  a.textContent = '⏬ WebM 💾';
  controls.appendChild(a);
  vidContainer.replaceChildren(vidDiv)
  // vidContainer.appendChild(vidDiv);
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
    const a = document.createElement('a');
    a.download = 'kenburns.gif';
    a.href = img.src;
    a.textContent = '⏬ Gif 💾';
    controls.appendChild(a);
    gifContainer.replaceChildren(div)
    rendered = true;
    requestAnimationFrame(loop);
  });
}
//#endregion
