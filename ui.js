let renderUi = {

  button: function (text, handler) {
    const button = document.createElement("button");
    button.addEventListener('click', handler);
    button.innerText = text;
    return button;
  },


  selectFile: function (loaded) {
    const handler = (ev) => {
      createImageFromBlob(ev.target.files[0], loaded)
    }
    const div = document.createElement("div")
    const input = document.createElement("input")
    const button = document.createElement("button");
    input.type = 'file';
    input.accept = "image/*";
    input.addEventListener('change', handler)
    input.style.display = "none" 
    button.addEventListener('click', () => input.click());
    button.innerText = "Select File"
    div.appendChild(input)
    div.appendChild(button)
    return div;
  },

  input:function(inputLabel, value, key, callback){
    const inputKey = `${inputLabel}_${key}`
    const div = document.createElement("div")
    const label = document.createElement("label")
    const input = document.createElement("input")
    label.innerText = inputLabel
    label.for = input.id = inputKey
    input.value = value
    input.className = 'text-input'
    input.addEventListener('change', (val ) => callback(val, inputKey), false)
    div.appendChild(label)
    div.appendChild(input)
    return div
  },

  slider:function(inputLabel, value, key, callback){
    const inputKey = `${inputLabel}_${key}`
    const div = document.createElement("div")
    div.className = "slidecontainer"
    const label = document.createElement("label")
    const input = document.createElement("input")
    label.innerText = inputLabel
    label.for = input.id = inputKey
    input.value = value*100
    input.type = "range"
    input.className = "slider"
    input.step = 1
    input.min = 1
    input.max = 100
    input.addEventListener('change', (val ) => callback(val, inputKey), false)
    div.appendChild(label)
    div.appendChild(input)
    return div
   
  },

  select: function (inputLabel, key, value, options, callback){
    const inputKey = `${inputLabel}_${key}`
    const div = document.createElement("div")
    div.className = "selectContainer"
    const label = document.createElement("label")
    const select = document.createElement("select")
    label.innerText = inputLabel
    label.for = select.id = inputKey
    select.value = value
    select.name = inputLabel
    select.className = "selecter"
    select.addEventListener('change', (ev) => callback(ev, inputKey))
    options.forEach((option) => {
      const opt = document.createElement("option")
      opt.value = option.value
      opt.innerText = option.name
      opt.selected = option.value == value
      select.appendChild(opt)
    })
    div.appendChild(label)
    div.appendChild(select)
    return div
  }
}

function createImageFromBlob(image, loaded) {
  const reader = new FileReader();
  const type = image.type.split('/');
  if ('image' !== type[0]) {

    return;
  }
  reader.addEventListener('load', doFileRead.bind(this, reader, loaded), false);
  if (image) {
    reader.readAsDataURL(image);
  }
}

const doFileRead = (reader, loaded) => {
  const image = new Image();
  image.src = reader.result;
  const vw = Math.max(
    document.documentElement.clientWidth,
    window.innerWidth || 0
  );
  const vh = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight || 0
  );
  let imgDeminsionsX = vw;
  let imgDeminsionsY = vh;
  let scale = 1;
  image.addEventListener('load', () => {
    console.log(
      'loaded the image with w: %d by h: %d, view w: %d h: %d',
      image.width, image.height, vw, vh,
    );
    if (vw < image.width && vh < image.height) {
      scale = Math.max(vw / image.width, vh / image.height);
      console.log('scale factor of  %s for viewport %s %s', scale, vw, vh);
    }
    loaded(image.src, scale)
  });
}

module.exports = renderUi;