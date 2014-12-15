pickColors
=========

pick impressive colors from image, canvas. 


###use

```javascript
var Canvas = require("canvas");
var Image = Canvas.Image;
var Pickcolors = require("pickcolors");
imageData = js.readFileSync("path/to/image");
var image = new Image();
image.src = imageData;
Pickcolors(image).toRGB();
/*get [{r: 255, g: 255, b: 0}, ... ]
  or .toHexString() 
  get ["#FFFF00", ...]*/
```