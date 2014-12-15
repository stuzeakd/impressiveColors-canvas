pickColors
=========

pick impressive colors from image, canvas. 


###use

>var Canvas = require("canvas");
>var Image = Canvas.Image;
>var Pickcolors = require("pickcolors");
>imageData = js.readFileSync("path/to/image");
>var image = new Image();
>image.src = imageData;
>Pickcolors(image).toRGB();
>/*get [{r: , g: , b}, ... ]
>  or .toHexString() 
>  get ["#123456", "#234567", ...]
