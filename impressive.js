/* Impressive

*/
(function(){
var isNodeModule = typeof module !== 'undefined' && module.exports;
var isRequirejs = typeof define === 'function' && define.amd;
var Canvas;
var tc;
var cmCvs;
    
/* Export and Constructor Setting */
if(isNodeModule){
    //Node module dependency
    Canvas = require("canvas");   
    Image = Canvas.Image;
    tc = require("tinycolor2");
    cmCvs = require("common-canvas");
}else {
    //Canvas constructor for browser
    Canvas = function(width, height){
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }
    if(isRequirejs){
        define(["tinycolor2", "commonCanvas"], function(tinycolor2, commonCanvas){ 
            //requirejs dependency 
            tc = tinycolor2;
            cmCvs = commonCanvas; 
            //export requirejs Module
            return Impressive; 
        });
    }else{
        //export normal browser module.
        window.Impressive = Impressive;    
    }
}    
/* add utility method */
Array.prototype.circleIndex = function(idx){
    if( idx >= 0 && idx < this.length){
        return this[idx];
    }else if(idx < 0){
        return this.circleIndex(idx + this.length);
    }else{
        return this.circleIndex(idx - this.length);
    }    
}
Math.mod = function(a, n){
    if( a < 0 ){
        return this.mod(a + n, n);   
    }else{
        return a%n;
    }
}
/* Module */
var Impressive = function Impressive(imageObj){
    var RESIZING_PIXEL = 100000;
    imageObj = imageObj ? imageObj : {};
    if(!(this instanceof Impressive)){
       return new Impressive(imageObj);
    }
    if (cmCvs.isImage(imageObj) || cmCvs.isCanvas(imageObj)){
        var imageCanvas = this.imageCanvas = cmCvs.createCanvasByImage(imageObj, RESIZING_PIXEL);
        var pickedHues = this.pickedHues = pickHues(imageCanvas);
        var svHists = this.svHists = [];
        
        
        //pickedColor Old ver.
        this.pickedColorsOld = [];        
        for(var i = 0; i< this.pickedHues.length && i < 5; ++i){
            this.pickedColorsOld[i] = 
                tc({h : this.pickedHues[i]["x"], 
                    s : findSat(imageCanvas, pickedHues[i]),
                    v : 100
                   }).toRgb();
        }
        this.pickedColors = [];
        for(var hIdx = 0; hIdx < pickedHues.length; ++hIdx){
            console.log(hIdx, "hue : ", pickedHues[hIdx]);    
            svHists[hIdx] = svHistogram(imageCanvas, pickedHues[hIdx]);  
            var pickedSV = svHists[hIdx].smoothing(3).flatten(0.3).pickPeaks();
            for(var svIdx = 0; svIdx < pickedSV.length; ++svIdx){
                ("sv : ", pickedSV[svIdx]);
                this.pickedColors[this.pickedColors.length] = tc({
                    h : pickedHues[hIdx]["x"],
                    s : pickedSV[svIdx]["x"],
                    v : pickedSV[svIdx]["y"]
                }).toRgb();
            }
        }
    }
}
 
/* prototype */
Impressive.prototype = {
    oldToRgb : function(num){
        return this.pickedColorsOld;
    }, 
    toRgb : function(num){
        return this.pickedColors;
    },
    oldToHexString : function(num){
        num = typeof num !== "undefined" ? num : 30;
        var pickedHexString =[];
        for(var i = 0; i < this.pickedColorsOld.length && i < num; ++i){
            pickedHexString[i] = tc(this.pickedColorsOld[i]).toHexString();
        }
        return pickedHexString;
    },

    toHexString : function(num){
        num = typeof num !== "undefined" ? num : 30;
        var pickedHexString =[];
        for(var i = 0; i < this.pickedColors.length && i < num; ++i){
            pickedHexString[i] = tc(this.pickedColors[i]).toHexString();
        }
        return pickedHexString;
    }
}
//Impressive.create2DHist = create2DHist;
//Impressive.histCV = histCV;
//Impressive.smoothing2DHist = smoothing2DHist;
//Impressive.toBinary2DHist = toBinary2DHist;
//Impressive.flatten2DHist = flatten2DHist;
//Impressive.pick2DPeaks = pick2DPeaks;
        
var histogram = function histogram(type, width, height, init){
    init = typeof init !== 'undefined' ? init : 0;
    this.width = width;
    this.height = height;
    for(var x = 0; x < width; ++x){
        this[x] = [];
        for(var y = 0; y <height; ++y){
            this[x][y] = init;    
        }
    }
};
histogram.prototype = new Array();
histogram.prototype.max = function(cmp){
    var max = 0;
    for(var i = 0; i < this.width; ++i){
        var iMax = Math.max.apply(null, this[i]);
        if(max < iMax) max = iMax;
    }
    return max;
};
histogram.prototype.min = function(cmp){
    var min = 0;
    for(var i = 0; i < this.width; ++i){
        var iMin = Math.mim.apply(null, this[i]);
        if(min < iMin) min = iMin;
    }
    return min;
};
histogram.prototype.loop = function(doing){
    for(var x =0; x< this.width; ++x){
        for(var y =0; y< this.height; ++y){
            doing.call(this,x,y);   
        }
    }
};
histogram.prototype.cv = function(mat, saturate){
    saturate = typeof saturate !== "undefined" ? saturate : 1;
    var resultHist = new histogram('2d', this.width, this.height);
    var matSize = Math.sqrt(mat.length);
    var cvRange = parseInt(matSize/2);
    for(var x = 0; x< this.width; ++x){
        for(var y = 0; y < this.height; ++y){
            if( x > cvRange && y > cvRange && 
               x < this.width - cvRange && y < this.height - cvRange ){
                for(var i = -cvRange; i <= cvRange; ++i ){
                    for(var j = -cvRange; j<= cvRange; ++j ){
                        var matIndex = (i+cvRange)*matSize + j + cvRange;
                        resultHist[x][y] += this[x+i][y+j] * mat[matIndex];
                    }
                }                   
            }
        }      
    }
    return resultHist;
};
histogram.prototype.smoothing = function(recur){
    recur = typeof recur !== "undefined"? recur : 1;
    var resultHist = this;
    var mat = [1,1,1,1,1,
               1,1,1,1,1,
               1,1,1,1,1,
               1,1,1,1,1,
               1,1,1,1,1];
    var matSum = mat.reduce(function(p, c){ return p+c; }); 
    for(var i=0; i< mat.length; ++i){
        mat[i] = mat[i]/matSum;
    }
    for(var i=0; i< recur; ++i){
        resultHist = resultHist.cv(mat);    
    }
    return resultHist;
};
histogram.prototype.flatten = function(saturate){
    var resultHist = new histogram('2d', this.width, this.height);
    saturate = saturate * this.max();
    for( var x = 0; x< this.width; ++x){
        for( var y =0; y< this.height; ++y){
            if( this[x][y] > saturate ) resultHist[x][y] = this[x][y];
        }
    }
    return resultHist;   
};
histogram.prototype.binary = function toBinary2DHist(saturate){
    var resultHist = new histogram('2d', this.width, this.height);
    saturate = saturate * this.max();
    for( var x = 0; x< this.width; ++x){
        for( var y =0; y< this.height; ++y){
            if( this[x][y] > saturate ) resultHist[x][y] = 1;
        }
    }
    return resultHist;
};
histogram.prototype.pickPeaks = function(){
    var peaks = [];
    for(var x = 0; x < this.width; ++x){
        for(var y =0; y< this.height; ++y){
            if(isPeak.call(this,x,y)){
                peaks[peaks.length] = {x: x, y: y, size: this[x][y]};
            }
        }
    }
    peaks.sort(function(f,b){ return b.size - f.size });
    return peaks;
    function isPeak(x,y){        
        var ul = 
            (x<=0|| y>=this.height-1) || 
            (this[x][y] > this[x-1][y+1]) ? true : false;
        var uu = 
            (y>=this.height-1) || 
            (this[x][y] > this[x][y+1])? true : false;
        var ur = 
            (x >= this.width-1 || y>=this.height-1) || 
            (this[x][y] > this[x+1][y+1])? true : false;
        var ll = 
            (x<=0) || 
            (this[x][y] > this[x-1][y])? true : false;
        var rr = 
            (x >= this.width-1) ||
            (this[x][y] > this[x+1][y])? true : false;
        var dl = 
            (x<=0 || y<=0) || 
            (this[x][y] > this[x-1][y-1])? true : false;
        var dd = 
            (y<=0) ||
            (this[x][y] > this[x][y-1])? true : false;
        var dr = 
            (x >= this.width-1 || y<=0) ||
            (this[x][y] > this[x+1][y-1])? true : false;
//        if( x <= 0 ){
//            
//        }
//        if( x >= this.length-1 ){
//            
//        }
//        if( y <= 0){
//            
//        }
//        if( y >= this[0].length-1 ){
//            
//        }
        return ul && uu && ur && ll && rr && dl && dd && dr;
    }
};

/* function */
var pickHues = function(imageCanvas){
    //hard coding.
    var rawHist = histogram1D(imageCanvas, "hue", { sL : 0.25, vL : 0.25});
    var resultHist = flattenHist(smoothingGraph(rawHist, 4, [1,1,1,1,1,1,1]), 0.01);
    return pickPeaks(resultHist);   
}

var findSat = function(imageCanvas, hueData){
    var rawSatData = histogram1D(imageCanvas, "sat", { 
        hL : hueData["rangeL"], 
        hR : hueData["rangeR"], 
        sL : 0.3, 
        vl : 0.3});
    var peaks = pickPeaks(smoothingGraph(rawSatData, 3));
    return pickPeaks(rawSatData)[0]["x"];
}

var svHistogram = function(imageCanvas, hueData){
    var imageData = imageCanvas.getContext('2d').getImageData(0,0,imageCanvas.width, imageCanvas.height);
    var sRange, vRange;
    var hRange = 360;
    sRange = vRange = 101;
    var hist = new histogram("2d", sRange, vRange);
    for(var x = 0; x < imageCanvas.width; ++x){
        for(var y =0; y < imageCanvas.height; ++y){
            var idx = (y*imageCanvas.width + x) * 4;
            var r = imageData.data[idx +0];
            var g = imageData.data[idx +1];
            var b = imageData.data[idx +2];
            var a = imageData.data[idx +3];
            var hsv = tc({r: r, g: g, b: b, a: a}).toHsv();
            if(isInHueRange(hsv.h)){
                hist[sIdx(hsv.s)][vIdx(hsv.v)]++;
            }
        }
    }
    return hist;
    
    function isInHueRange(hue){
        //rangeL and rangeR have same sign.
        if(hueData.rangeL * hueData.rangeR > 0){
            return Math.mod(hueData.rangeL, hRange) <= hue && 
                hue <= Math.mod(hueData.rangeR, hRange);
        }else{
            return (Math.mod(hueData.rangeL, hRange) <= hue && hue < 360) ||
                (0 <= hue && hue <= Math.mod(hueData.rangeR, hRange));
        }
    }
    function sIdx(s){
        return Math.round(s*(sRange-1));    
    }
    function vIdx(v){
        return Math.round(v*(vRange-1));
    }
}

var flattenHist = function(hist, saturate){
    var resultHist = [];
    for(var i =0; i< hist.length; ++i){
        resultHist[i] = 0;   
    }
    var max = Math.max.apply(null, hist)
    saturate = saturate * max;
    for( var i = 0; i< hist.length; ++i){
        if( hist[i] > saturate ) resultHist[i] = hist[i];
    }
    return resultHist;  
}
var histogram1D = function(canvas, type, rule){
//    console.log(__basename + " - function() histogram start ... ");
    var ctx = canvas.getContext("2d");
    var imageData = ctx.getImageData(0,0,canvas.width, canvas.height);
    var hist = [];
    var histRange =0;

    if(type === "hue" || type === "h" || type === "sat" || type === "s"){
        rule = typeof rule === "undefined" ? { hL : 0, hR : 359, sL : 0, sR : 1, vL : 0, vR : 1 } :
        {
            hL : typeof rule["hL"] !== "undefined" ? rule["hL"] : 0,
            hR : typeof rule["hR"] !== "undefined" ? rule["hR"] : 359,
            sL : typeof rule["sL"] !== "undefined" ? rule["sL"] : 0,
            sR : typeof rule["sR"] !== "undefined" ? rule["sR"] : 1,
            vL : typeof rule["vL"] !== "undefined" ? rule["vL"] : 0,
            vR : typeof rule["vR"] !== "undefined" ? rule["vR"] : 1                
        };
        
        var isValidInRule = function(hsv){
            if( rule["hL"] <= hsv["h"] && hsv["h"] <= rule["hR"] && 
                rule["sL"] <= hsv["s"] && hsv["s"] <= rule["sR"] && 
                rule["vL"] <= hsv["v"] && hsv["v"] <= rule["vR"]) return true;
            else return false;
        }
        //indexing function is different by type.
        var typeIndex;
        if(type === "hue" || type === "h"){ 
            histRange = 360;
            typeIndex = function(hsv){ return parseInt(hsv["h"]); };
        }else if(type === "sat" || type === "s"){
            histRange = 101;           
            typeIndex = function(hsv){ return parseInt(hsv["s"] * histRange-1); };
        }
        //Initialize histogram array.
        for( var i = 0; i < histRange; i++){
            hist[i] = 0;
        }
        for(var x = 0; x < imageData.width; ++x){
            for(var y = 0; y < imageData.height; ++y){
                var index = (x + y * imageData.width) * 4;
                var r = imageData.data[index + 0];
                var g = imageData.data[index + 1];
                var b = imageData.data[index + 2];
                var hsv = tc({ r: r, g: g, b: b}).toHsv();
                if(isValidInRule(hsv)) 
                    hist[typeIndex(hsv)]++;
            }
        }
//        console.log(__basename + " - function() histogram end ");
        return hist;
    }
}
var smoothingGraph = function(hist, repeat, cvCoeff){
    //set default
    repeat = typeof repeat !== "number" ? 1 : repeat;
    cvCoeff = typeof cvCoeff === "undefined" || cvCoeff.length%2 !== 1 ? [1, 1, 1, 1, 1] : cvCoeff; 
    var beforeHist = hist.slice(0);
    var resultHist;
    var cvSum = cvCoeff.reduce(function(pv, cv){return pv + cv});
    
    for( var r = 0; r < repeat; ++r){
        resultHist = [];
        for( var i = 0; i< beforeHist.length; ++i){
            var sum = 0;
            for( var cvIdx = -2; cvIdx < 2; ++cvIdx){
                sum += beforeHist.circleIndex(i + cvIdx) * cvCoeff[cvIdx + 2];
            }
//            Average Convolution
//            for( var cvIdx = -2; cvIdx < 2; ++cvIdx){
//                sum += beforehist.circleIndexOf(i + cvIdx);
//            }
            resultHist[i] = Math.round(sum/cvSum * 100)/100;
        }
        beforeHist = resultHist;
    }
    return resultHist;
}

var pickPeaks = function(hist, count){
    var peaks = [];
    var minDataIndex = hist.indexOf(Math.min(hist)); // min is zero, ordinally.
    
    //idx can be <0, or >histLength because loop is started from minDataIndex.
    //it must be normalized.
    function normalize(idx){
        if( idx < 0 ){
            return normalize(idx + hist.length)
        }else if( idx > hist.length ){
            return normalize(idx - hist.length);   
        }else{
            return idx;
        }
    }
    for(var i = minDataIndex; i< hist.length + minDataIndex; ++i){
        //wow. this is peak.
        if( hist.circleIndex(i-1) < hist.circleIndex(i) 
           && hist.circleIndex(i) > hist.circleIndex(i+1)){
            var r, l;
            //let's find left and right end.
            for(r = i+1; hist.circleIndex(r) > hist.circleIndex(r+1) ; ++r);
            for(l = i-1; hist.circleIndex(l) > hist.circleIndex(l-1) ; --l);
            //push to peaks array.
            peaks.push({ x : normalize(i), size : hist.circleIndex(i), 
                 rangeL : l, rangeR :r });   
        }
    }
    peaks.sort(function(f,b){ return b.size - f.size });
    return peaks;
}
function median(hist){
    function nthData(hist, n){
        var acc = 0;
        for(var i = 0; i<hist.length; ++i){
            acc += hist[i];
            if(acc > n) break;
        }
        return i;   
    }
    var sum = hist.reduce(function(pv, cv){return pv + cv});
    return sum%2 === 0 ? (nthData(hist, sum%2) + nthData(hist, sum%2+1))/2: nthData(hist, (sum+1)/2);
}
//export node module
if(isNodeModule){
    module.exports = Impressive;
}
})();