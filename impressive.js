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

Math.mod = function(a, n){
    if( a < 0 ){
        return this.mod(a + n, n);   
    }else{
        return a%n;
    }
}
/* Constant */
var HUE_RANGE = 360;
var CHROMA_RULE = {sL: 0.20, vL:0.20};
var ACHROMA_RULE = {sR: 0.20, vR:0.20};
var HIGH_SAT_RULE = {sL : 0.7, vL:0.9};
/* Module */
var Impressive = function Impressive(imageObj){
    var RESIZING_PIXEL = 100000;
    var SV_FLATTEN_RATE = 0.3;
    var SV_SMOOTHING_CNT = 3;
    imageObj = imageObj ? imageObj : {};
    if(!(this instanceof Impressive)){
       return new Impressive(imageObj);
    }
    if (cmCvs.isImage(imageObj) || cmCvs.isCanvas(imageObj)){
        var imageCanvas = this.imageCanvas = cmCvs.createCanvasByImage(imageObj, RESIZING_PIXEL);
//        var rawHistResult = hueHistogram(imageCanvas, CHROMA_RULE);
//        var rawHist = this.hueHist = rawHistResult.hist;
        this.pickedColors = [];
        var svHists = this.svHists = [];
        
        var highHueHistResult = hueHistogram(imageCanvas, HIGH_SAT_RULE);
        var highHueHist = this.highHueHist = highHueHistResult.hist;
        var pickedHighSHues = highHueHist.smoothing(2).flatten(0.01).pickPeaks();
        
        for(var hIdx = 0; hIdx < pickedHighSHues.length; ++hIdx){
            console.log(hIdx, "hue : ", pickedHighSHues[hIdx]);    
            var svHistsResult = svHistogram(imageCanvas, pickedHighSHues[hIdx], HIGH_SAT_RULE);  
            svHists[svHists.length] = svHistsResult.hist;
            console.log("svRate : ",svHistsResult.rate);
            //아아 깔끔하다.
            var pickedSV = svHists[svHists.length-1].smoothing(3).flatten(0.3).pickPeaks();
            for(var svIdx = 0; svIdx < pickedSV.length; ++svIdx){
                console.log("sv : ", pickedSV[svIdx]);
                this.pickedColors[this.pickedColors.length] = tc({
                    h : pickedHighSHues[hIdx]["x"],
                    s : pickedSV[svIdx]["x"],
                    v : pickedSV[svIdx]["y"]
                }).toRgb();
            }
        }
        
        var pickedHues = this.pickedHues = pickHues(imageCanvas);

        
        
        //pickedColor Old ver.
//        this.pickedColorsOld = [];        
//        for(var i = 0; i< this.pickedHues.length && i < 5; ++i){
//            this.pickedColorsOld[i] = 
//                tc({h : this.pickedHues[i]["x"], 
//                    s : findSat(imageCanvas, pickedHues[i]),
//                    v : 100
//                   }).toRgb();
//        }
        
        for(var hIdx = 0; hIdx < pickedHues.length; ++hIdx){
            console.log(hIdx, "hue : ", pickedHues[hIdx]);    
            var svHistsResult = svHistogram(imageCanvas, pickedHues[hIdx], CHROMA_RULE);  
            svHists[svHists.length] = svHistsResult.hist;
            console.log("svRate : ",svHistsResult.rate);
            //아아 깔끔하다.
            var pickedSV = svHists[svHists.length-1].smoothing(3).flatten(0.3).pickPeaks();
            for(var svIdx = 0; svIdx < pickedSV.length; ++svIdx){
                console.log("sv : ", pickedSV[svIdx]);
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
        
function isInHueRange(hue, rangeL, rangeR){
    if(rangeL * rangeR > 0 && rangeL <= rangeR){
        return Math.mod(rangeL, 360) <= hue && 
            hue <= Math.mod(rangeR, 360);
    }else{
        return (Math.mod(rangeL, 360) <= hue && hue < 360) ||
            (0 <= hue && hue <= Math.mod(rangeR, 360));
    }
};
function makeHsvRule(rule){
    rule = typeof rule === "undefined" ? { hL : 0, hR : 360, sL : 0, sR : 1, vL : 0, vR : 1 } :
    {
        hL : typeof rule["hL"] !== "undefined" ? rule["hL"] : 0,
        hR : typeof rule["hR"] !== "undefined" ? rule["hR"] : 360,
        sL : typeof rule["sL"] !== "undefined" ? rule["sL"] : 0,
        sR : typeof rule["sR"] !== "undefined" ? rule["sR"] : 1,
        vL : typeof rule["vL"] !== "undefined" ? rule["vL"] : 0,
        vR : typeof rule["vR"] !== "undefined" ? rule["vR"] : 1                
    };
    return rule;
}
function isInRule(hsv, rule){
    if( isInHueRange(hsv.h, rule.hL, rule.hR) && 
        rule["sL"] <= hsv["s"] && hsv["s"] <= rule["sR"] && 
        rule["vL"] <= hsv["v"] && hsv["v"] <= rule["vR"])
    { return true; 
    }else{ return false; }
}
var pickHuesWithHighSat = function(imageCanvas){
    var rawHistResult = hueHistogram(imageCanvas, HIGH_SAT_RULE);
    var rawHist = rawHistResult.hist;
}
var pickHues = function(imageCanvas){
    //hard coding.
    var rawHistResult = hueHistogram(imageCanvas, CHROMA_RULE);
    var rawHist = rawHistResult.hist;
    console.log("hue rate : ", rawHistResult.rate);
    var resultHist = rawHist.smoothing(4).flatten(0.01);
    return resultHist.pickPeaks();   
}
var hueHistogram = function(imageCanvas, rule){
    var ctx = imageCanvas.getContext("2d");
    var imageData = ctx.getImageData(0,0,imageCanvas.width, imageCanvas.height);
    var hist = new circularHistogram1D(HUE_RANGE);    
    rule = makeHsvRule(rule);
    var allPix=0;
    var ruledPix=0;
    for(var x = 0; x < imageData.width; ++x){
        for(var y = 0; y < imageData.height; ++y){
            var index = (x + y * imageData.width) * 4;
            var r = imageData.data[index + 0];
            var g = imageData.data[index + 1];
            var b = imageData.data[index + 2];
            var a = imageData.data[index + 3];
            var hsv = tc({ r: r, g: g, b: b}).toHsv();
            if(isInRule(hsv, rule)){
                hist[hIdx(hsv)]++;
                ruledPix++;
            }
            allPix++;
        }
    }
    return {hist: hist, rate: ruledPix/allPix};
   
    function hIdx(hsv){ return parseInt(hsv["h"]); }
}
    
var svHistogram = function(imageCanvas, hueData, rule){
    var imageData = imageCanvas.getContext('2d').getImageData(0,0,imageCanvas.width, imageCanvas.height);
    var sRange, vRange;
    sRange = vRange = 101;
    rule = makeHsvRule(rule);
    rule.hL = hueData.rangeL;
    rule.hR = hueData.rangeR;
    var allPix=0;
    var ruledPix=0;
    var hist = new histogram2D("2d", sRange, vRange);
    for(var x = 0; x < imageCanvas.width; ++x){
        for(var y =0; y < imageCanvas.height; ++y){
            var idx = (y*imageCanvas.width + x) * 4;
            var r = imageData.data[idx +0];
            var g = imageData.data[idx +1];
            var b = imageData.data[idx +2];
            var a = imageData.data[idx +3];
            var hsv = tc({r: r, g: g, b: b, a: a}).toHsv();
            if(isInRule(hsv, rule)){
                hist[sIdx(hsv.s)][vIdx(hsv.v)]++;
                ruledPix++;
            }
            allPix++;
        }
    }
    return {hist: hist, rate: ruledPix/allPix};

    function sIdx(s){
        return Math.round(s*(sRange-1));    
    }
    function vIdx(v){
        return Math.round(v*(vRange-1));
    }
}

/* old function */

var findSat = function(imageCanvas, hueData){
    var rawSatData = histogram1D(imageCanvas, "sat", { 
        hL : hueData["rangeL"], 
        hR : hueData["rangeR"], 
        sL : 0.3, 
        vl : 0.3});
    var peaks = pickPeaks(smoothingGraph(rawSatData, 3));
    return pickPeaks(rawSatData)[0]["x"];
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
        rule = makeHsvRule(rule);
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
                if(isInRule(hsv, rule)) 
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
            for( var cvIdx = -2; cvIdx <= 2; ++cvIdx){
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
                 rangeL : normalize(l), rangeR :normalize(r) });   
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
    
/* Histogram */    
/* Circular Histogram */
function circularHistogram1D(width, init){
    init = typeof init !== 'undefined' ? init : 0;
    this.width = width;
    for(var x = 0; x< width; ++x){
        this[x] = init;   
    }
}
circularHistogram1D.prototype = new Array();
circularHistogram1D.prototype.constructor = circularHistogram1D;
circularHistogram1D.prototype.circleIndex = function(idx){
    if( idx >= 0 && idx < this.width){
        return this[idx];
    }else if(idx < 0){
        return this.circleIndex(idx + this.width);
    }else{
        return this.circleIndex(idx - this.width);
    }    
};
circularHistogram1D.prototype.max = function(cmp){
    var arr = [];
    for( var i =0; i< this.width; ++i){
        arr[i] = this[i];   
    }
    return Math.max.apply(null, arr);   
};
circularHistogram1D.prototype.min = function(cmp){
    var arr = [];
    for( var i =0; i< this.width; ++i){
        arr[i] = this[i];   
    }
    return Math.min.apply(null, arr);   
};
circularHistogram1D.prototype.cv = function(coeff){
    var resultHist = new circularHistogram1D(this.width);  
    var coeffRange = parseInt(coeff.length / 2);
    for( var i = 0; i< this.width; ++i){
        for( var cvIdx = -coeffRange; cvIdx <= coeffRange; ++cvIdx){
            resultHist[i] += this.circleIndex(i + cvIdx) * coeff[cvIdx + coeffRange];
        }
        resultHist[i] = Math.round(resultHist[i] * 100)/100;
    }
    return resultHist;
};
circularHistogram1D.prototype.smoothing = function(repeat){
    repeat = typeof repeat !== "undefined"? repeat : 1;
    var resultHist = this;
    var cvCoeff = [1,1,1,1,1];
    var cvCoeffSum = cvCoeff.reduce(function(p, c){ return p+c; }); 
    for(var i=0; i< cvCoeff.length; ++i){
        cvCoeff[i] = cvCoeff[i]/cvCoeffSum;
    }
    for(var i=0; i< repeat; ++i){
        resultHist = resultHist.cv(cvCoeff);    
    }
    return resultHist;
};    
circularHistogram1D.prototype.flatten = function(saturate){
    var resultHist = new circularHistogram1D(this.width);
    saturate = saturate * this.max();
    for( var i = 0; i< this.width; ++i){
        if( this[i] > saturate ) resultHist[i] = this[i];
    }
    return resultHist;  
};
circularHistogram1D.prototype.pickPeaks = function(count){
    var peaks = [];
//    var minDataIndex = this.indexOf(this.min()); // min is zero, ordinally.
    var min = this.min();
    var minDataIndex;
    for(var i=0; i< this.width; ++i){
        if(this[i] === min){
            minDataIndex = i;
            break;
        }
    }
    
    //idx can be <0, or >histLength because loop is started from minDataIndex.
    //it must be normalized.
    for(var x = minDataIndex; x< this.width + minDataIndex; ++x){
        //wow. this is peak.
        if(isPeak.call(this,x)){
            var r, l;
            //let's find left and right end.
            
            for(r = x+1; this.circleIndex(r) > this.circleIndex(r+1) ; ++r);
            for(l = x-1; this.circleIndex(l) > this.circleIndex(l-1) ; --l);
            //push to peaks array.
            console.log(x);
            peaks.push({ x : this.normalize(x), size : this.circleIndex(x), 
                 rangeL : this.normalize(l), rangeR :this.normalize(r) });   
        }
    }
    peaks.sort(function(f,b){ return b.size - f.size });
    return peaks;
    function isPeak(x){
        return this.circleIndex(x-1) < this.circleIndex(x) && 
            this.circleIndex(x) > this.circleIndex(x+1);
    }
}    
circularHistogram1D.prototype.normalize = function(idx){
    if( idx < 0 ){
        return this.normalize(idx + this.width)
    }else if( idx > this.width ){
        return this.normalize(idx - this.width);   
    }else{
        return idx;
    }
}
/* 2Dhistogram */
var histogram2D = function histogram2D(type, width, height, init){
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
histogram2D.prototype = new Array();
histogram2D.prototype.max = function(cmp){
    var max = 0;
    for(var i = 0; i < this.width; ++i){
        var iMax = Math.max.apply(null, this[i]);
        if(max < iMax) max = iMax;
    }
    return max;
};
histogram2D.prototype.min = function(cmp){
    var min = 0;
    for(var i = 0; i < this.width; ++i){
        var iMin = Math.min.apply(null, this[i]);
        if(min < iMin) min = iMin;
    }
    return min;
};
histogram2D.prototype.loop = function(doing){
    for(var x =0; x< this.width; ++x){
        for(var y =0; y< this.height; ++y){
            doing.call(this,x,y);   
        }
    }
};
histogram2D.prototype.cv = function(mat, saturate){
    saturate = typeof saturate !== "undefined" ? saturate : 1;
    var resultHist = new histogram2D('2d', this.width, this.height);
    var matSize = Math.sqrt(mat.length);
    var cvRange = parseInt(matSize/2);
    for(var x =0; x< this.width; ++x){
        for(var y =0; y< this.height; ++y){
            if( x > cvRange && y > cvRange && 
               x < this.width - cvRange && y < this.height - cvRange ){
                for(var i = -cvRange; i <= cvRange; ++i ){
                    for(var j = -cvRange; j<= cvRange; ++j ){
                        var matIndex = (i+cvRange)*matSize + j + cvRange;
                        resultHist[x][y] += this[x+i][y+j] * mat[matIndex];
                    }
                }
            }
            //소수점 6번째 자리까지.
            resultHist[x][y] = Math.round(resultHist[x][y]*1000000)/1000000;
        }      
    }
    return resultHist;
};
histogram2D.prototype.smoothing = function(repeat){
    repeat = typeof repeat !== "undefined"? repeat : 1;
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
    for(var i=0; i< repeat; ++i){
        resultHist = resultHist.cv(mat);    
    }
    return resultHist;
};
histogram2D.prototype.flatten = function(saturate){
    var resultHist = new histogram2D('2d', this.width, this.height);
    saturate = saturate * this.max();
    for( var x = 0; x< this.width; ++x){
        for( var y =0; y< this.height; ++y){
            if( this[x][y] > saturate ) resultHist[x][y] = this[x][y];
        }
    }
    return resultHist;   
};
histogram2D.prototype.binary = function toBinary2DHist(saturate){
    var resultHist = new histogram2D('2d', this.width, this.height);
    saturate = saturate * this.max();
    for( var x = 0; x< this.width; ++x){
        for( var y =0; y< this.height; ++y){
            if( this[x][y] > saturate ) resultHist[x][y] = 1;
        }
    }
    return resultHist;
};
histogram2D.prototype.pickPeaks = function(){
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
//export node module
if(isNodeModule){
    module.exports = Impressive;
}
})();