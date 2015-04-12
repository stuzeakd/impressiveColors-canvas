impressive-color-canvas
=========

pick impressive colors from image, canvas for nodejs, browser.

I'm preparing demopage.

###use node

```javascript
var fs = require("fs");
var Canvas = require("canvas");
var Image = Canvas.Image;
var Impression = require("impression");
var imageData = fs.readFileSync("path/to/image");
var image = new Image();
image.src = imageData;
var imp = Impression(image);
imp.dominantColor.toRGB();
imp.pickedColors.toHexString();
imp.highSatColors.toRGB();
imp.chromaColors.toHexString();
imp.achromaColors.toRGB();
/*get [{r: 255, g: 255, b: 0}, ... ]
  or .toHexString() 
  get ["#FFFF00", ...]*/
```

###use browser

```javascript

```
###use requirejs
```javascript

```