function button (text, handler) {
    const button = document.createElement("button");
    button.addEventListener('click', handler);
    button.innerText = text;
    return button;

  }
  

 button.select = (loaded) => {
    const handler = (ev) => {
        console.log('You selected the file %s', ev.target.files[0].name);
        createImageFromBlob(ev.target.files[0], loaded)
    }
    const label = document.createElement("label")
    label.for = "userFile"
    const input = document.createElement("input")
    input.type = 'file';
    input.accept = "image/*";
    input.id = "userFile"
    input.addEventListener('change', handler)
    input.style = {display: "none"}
    // label.appendChild(button("Select File", input.change))
    label.appendChild(input)

    return label;
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
    const imgCanvas = document.getElementById(
        'canvas'
      ) ;
    const ctx = imgCanvas.getContext('2d');
    var scale = 1;
    image.addEventListener('load', () => {
      console.log(
        'loaded the image with w: %d by h: %d, view w: %d h: %d',
        image.width, image.height, vw, vh,
      );
      if (vw < image.width && vh < image.height) {
        scale = Math.max(vw / image.width, vh / image.height);
        console.log('scale factor of  %s for viewport %s %s', scale, vw, vh);
        imgDeminsionsX = Math.floor(
          image.width * scale
        );
        imgDeminsionsY = Math.floor(
          image.height * scale
        );
      } else {
        imgDeminsionsX = image.width;
        imgDeminsionsY = image.height;
      }
      imgCanvas.width = imgDeminsionsX
      imgCanvas.height = imgDeminsionsY
      ctx.scale(scale, scale);
      ctx.drawImage(image, 0, 0);
      loaded(image.src)
    });
  }
  module.exports = button;