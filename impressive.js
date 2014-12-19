/* Impressive

*/
(function(){
var isNodeModule = typeof module !== undefined && module.exports;
var isRequirejs = typeof define === 'function' && define.amd;
var Canvas;
var Image;
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
        define(["tinycolor2", "common-canvas"], function(tinycolor2, commonCanvas){ 
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
    
/* Module */
var Impressive = function Impressive(imageObj){
    var RESIZING_PIXEL = 100000;
    imageObj = imageObj ? imageObj : {};
    if(!(this instanceof Impressive)){
       return new Impressive(imageObj);
    }
    if (imageObj instanceof Image || cmCvs.isCanvas(imageObj)){
        var imageCanvas = this.imageCanvas = cmCvs.createCanvasByImage(imageObj, RESIZING_PIXEL);
        var pickedHues = this.pickedHues = pickHues(imageCanvas);
        
        this.pickedColors = [];        
        for(var i = 0; i< this.pickedHues.length && i < 5; ++i){
            this.pickedColors[i] = 
                tc({h : this.pickedHues[i]["x"], 
                    s : findSat(imageCanvas, pickedHues[i]),
                    v : 100
                   }).toRgb();
        }
    }
}
 
/* prototype */
Impressive.prototype = {
    toRgb : function(num){
        return this.pickedColors;
    },
    
    toHexString : function(num){
        num = typeof num !== "undefined" ? num : 10;
        var pickedHexString =[];
        for(var i = 0; i < this.pickedColors.length && i < num; ++i){
            pickedHexString[i] = tc(this.pickedColors[i]).toHexString();
        }
        return pickedHexString;
    }
}

/* function */
var pickHues = function(imageCanvas){
    //hard coding.
    var rawHist = histogram(imageCanvas, "hue", { sL : 0.3, vL : 0.3});
    var resultHist = smoothingGraph(rawHist, 7);
    return pickPeaks(resultHist);   
}

var findSat = function(imageCanvas, hueData){
    var rawSatData = histogram(imageCanvas, "sat", { 
        hL : hueData["rangeL"], 
        hR : hueData["rangeR"], 
        sL : 0.3, 
        vl : 0.3});
    return median(rawSatData);
}

var histogram = function(canvas, type, rule){
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