/* Impression

*/
(function(){
var isNodeModule = typeof module !== 'undefined' && module.exports;
var isRequirejs = typeof define === 'function' && define.amd;
var Canvas;
var tc;
var cmCvs;
var hA;

var console = {};
console.log = function(){};
    
/* Export and Constructor Setting */
if(isNodeModule){
    //Node module dependency
    Canvas = require("canvas");   
    Image = Canvas.Image;
    tc = require("tinycolor2");
    cmCvs = require("common-canvas");
    hA = require('histogram-analyze');
}else {
    //Canvas constructor for browser
    Canvas = function(width, height){
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }
    if(isRequirejs){
        define(["tinycolor2", "commonCanvas", "histogram-analyze"], function(tinycolor2, commonCanvas, histogramAnalyze){ 
            //requirejs dependency 
            tc = tinycolor2;
            cmCvs = commonCanvas; 
            hA = histogramAnalyze;
            //export requirejs Module
            return Impression; 
        });
    }else{
        //export normal browser module.
        window.Impression = Impression;    
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
var SATURATION_RANGE = 101;
var VALUE_RANGE = 101;
var CHROMA_RULE = {sL: 0.15, vL:0.2};
var ACHROMA_RULE = {sR: 0.15, vR:0.2};
var HIGH_SAT_RULE = {sL : 0.7, vL:0.9};
    
var YELLOW_HUE = 60;    
var GREEN_HUE = 120;
    
/* Module */
var Impression = function Impression(imageObj, mode){
    var dateStart = new Date();
    
    var RESIZING_PIXEL = 100000;
    var SV_FLATTEN_RATE = 0.3;
    var SV_SMOOTHING_CNT = 3;
    var HIGH_SAT_COLOR_EXISTENCE_BOUNDARY_RATE = 0.001;
    imageObj = imageObj ? imageObj : {};
    if(!(this instanceof Impression)){
       return new Impression(imageObj);
    }
    if (cmCvs.isImage(imageObj) || cmCvs.isCanvas(imageObj)){
        var imageCanvas = this.imageCanvas = cmCvs.createCanvasByImage(imageObj, RESIZING_PIXEL);
        
        this.pickedColors = new Colors();
        this.highSatColors = new Colors();
        this.chromaColors = new Colors();
        this.achromaColors = new Colors();
        this.dominantColors = new Colors();
        
        var svHists = this.svHists = [];
        
        var highHueHistResult = hueHistogram(imageCanvas, HIGH_SAT_RULE);
        var highHueHist = this.highHueHist = highHueHistResult.hist;
        var pickedHighSHues = highHueHist.smoothing(2).flatten(0.01).pickPeaks();
        
        console.log(">-------------------------------------");
        console.log(">--");
        console.log(">--- High Saturation Colors"); 
        console.log(">--");
        console.log(">-------------------------------------");
        
        for(var hIdx = 0; hIdx < pickedHighSHues.length; ++hIdx){
            console.log(">-");
            console.log(">--Chroma hue " +hIdx+ " : " + pickedHighSHues[hIdx].x);
            console.log(">-  range : " + pickedHighSHues[hIdx].rangeL + " ~ " +
 pickedHighSHues[hIdx].rangeR + ",\trate : " + Math.round(pickedHighSHues[hIdx].rate * 10000)/100 + " %");

            var svHistsResult = svHistogram(imageCanvas, pickedHighSHues[hIdx], HIGH_SAT_RULE);  
            svHists[svHists.length] = svHistsResult.hist;
            console.log("\t  Hue rate after SV : ",Math.round(svHistsResult.rate * 10000)/100 + " %");
            //아아 깔끔하다.
            
            if(Math.round(svHistsResult.rate*1000)/1000 >= HIGH_SAT_COLOR_EXISTENCE_BOUNDARY_RATE && Math.round(svHistsResult.rate*1000)/1000 < 0.5){
                var pickedSV = svHists[svHists.length-1].smoothing(3).flatten(0.3).pickPeaks();
                //채도가 가장 높은거만 뽑는다.
                pickedSV.sort(function(f,b){ return b.x - f.x }); 
                console.log("\t\t rate in hue: ", Math.round(pickedSV[0].rate * 10000)/100 + " %");
                var color = {
                    h : pickedHighSHues[hIdx]["x"],
                    s : pickedSV[0]["x"]/(SATURATION_RANGE-1),
                    v : pickedSV[0]["y"]/(VALUE_RANGE-1),
                    rate : svHistsResult.rate * pickedSV[0].rate
                };
                //존재 비율을 추가해서 color배열에 넣는다.
                
                console.log(JSON.stringify(color, colorShowFormat, '|     '));
                this.highSatColors[this.highSatColors.length] = 
                this.pickedColors[this.pickedColors.length] = color;
            }
        }
        
        var classifyResult = classifyChroma(imageCanvas, CHROMA_RULE);
        
        var chroma = this.chroma = classifyResult.chroma;
        var chromaRate = classifyResult.rate;
        var achroma = this.achroma = classifyResult.achroma;
        
        var avgRgb = classifyResult.avgRgb;
        var avgHsv = tc(avgRgb).toHsv();
        var achromaAvgRgb = classifyResult.avgRgb
        var achromaAvgHsv = tc(achromaAvgRgb).toHsv();
        
        console.log(">  chroma rate : ", Math.round(chromaRate*10000)/100 + " %");
        console.log("> achroma rate : ", Math.round((1-chromaRate)*10000)/100 + " %");

        var pickedHues = this.pickedHues = chroma.smoothing(4).flatten(0.01).pickPeaks();        
        var pickedTones = achroma.smoothing(4).flatten(0.01).pickPeaks();
        
        console.log(">-------------------------------------");
        console.log(">--");
        console.log(">--- Chroma Colors");
        console.log(">--");
        console.log(">-------------------------------------");
        for(var hIdx = 0; hIdx < pickedHues.length; ++hIdx){
            console.log(">-");
            console.log(">--Chroma hue " +hIdx+ " : " + pickedHues[hIdx].x);
            console.log(">-  range : " + pickedHues[hIdx].rangeL + " ~ " + pickedHues[hIdx].rangeR + ",\trate : " + Math.round(pickedHues[hIdx].rate * 10000)/100 + " %");    

            //High Saturation 색에서 뽑은 Hue는 제외한다.
            var svHistsResult = svHistogram(imageCanvas, pickedHues[hIdx], CHROMA_RULE);  
            svHists[svHists.length] = svHistsResult.hist;
            console.log("\t  Hue rate after SV : ",Math.round(svHistsResult.rate * 10000)/100 + " %");

            var pickedSV = svHists[svHists.length-1].smoothing(3).flatten(0.3).pickPeaks();
            var tmpColors = new Colors();
            for(var svIdx = 0; svIdx < pickedSV.length; ++svIdx){
                console.log("\t\t rate in hue: ", Math.round(pickedSV[svIdx].rate * 10000)/100 + " %");
                var color = {
                    h : pickedHues[hIdx]["x"],
                    s : pickedSV[svIdx]["x"]/(SATURATION_RANGE-1),
                    v : pickedSV[svIdx]["y"]/(VALUE_RANGE-1),
                    rate : pickedHues[hIdx].rate * pickedSV[svIdx].rate
                }
                console.log(JSON.stringify(color, colorShowFormat, '|     '));
                tmpColors[tmpColors.length] =
                this.pickedColors[this.pickedColors.length] = color;
                if(isInColors(color, this.highSatColors)){
                    tmpColors.pop();
                }
                //
                for(var tmpIdx = 0; tmpIdx < tmpColors.length-1; ++tmpIdx){
                    var colorInChroma = isInColors(color, this.chromaColors);
                    if(colorInChroma){
                        colorInChroma.h = (colorInChroma.h * colorInChroma.rate + 
                            color.h * color.rate) / (colorInChroma.rate + color.rate);
                        colorInChroma.s = (colorInChroma.s * colorInChroma.rate + 
                            color.s * color.rate) / (colorInChroma.rate + color.rate);
                        colorInChroma.v = (colorInChroma.v * colorInChroma.rate + 
                            color.v * color.rate) / (colorInChroma.rate + color.rate);
                        colorInChroma.rate += color.rate;
                        tmpColors.pop();
                        break;
                    }
                    if(vContrastRate(tmpColors[tmpIdx].v, color.v) < 0.15){
                        tmpColors[tmpIdx].s = tmpColors[tmpIdx].s > color.s ? tmpColors[tmpIdx].s : color.s;
                        tmpColors[tmpIdx].v = tmpColors[tmpIdx].v > color.v ? tmpColors[tmpIdx].v : color.v;
                        tmpColors[tmpIdx].rate += color.rate;
                        tmpColors.pop();
                        break;
                    }else if(sContrastRate(tmpColors[tmpIdx].s, color.s) < 0.3){
                        if(sContrastRate(tmpColors[tmpIdx].v, color.v) < 0.15){

                            tmpColors[tmpIdx].s = 
                            ((tmpColors[tmpIdx].s * tmpColors[tmpIdx].rate) + (color.s * color.rate))/ (tmpColors[tmpIdx].rate + color.rate);
                            tmpColors[tmpIdx].v = tmpColors[tmpIdx].v > color.v ? tmpColors[tmpIdx].v : color.v;
                            tmpColors[tmpIdx].rate += color.rate;
                            tmpColors.pop();
                            break;
                        }else if(sContrastRate(tmpColors[tmpIdx].v, color.v) < 0.3){
                            tmpColors[tmpIdx].s = 
                            ((tmpColors[tmpIdx].s * tmpColors[tmpIdx].rate) + (color.s * color.rate))/ (tmpColors[tmpIdx].rate + color.rate);
                            tmpColors[tmpIdx].v = 
                            ((tmpColors[tmpIdx].v * tmpColors[tmpIdx].rate) + (color.v * color.rate))/ (tmpColors[tmpIdx].rate + color.rate);               
                            tmpColors[tmpIdx].rate += color.rate;
                            tmpColors.pop();
                            break;
                        }
                    }
                }


            }
            this.chromaColors.pushArray(tmpColors);
        }
        this.chromaColors.sort(function(f,b){ return b.rate - f.rate; });
        //print result.
        console.log(">-------------------------------------");
        console.log(">--");
        console.log(">--- Merged achroma Colors");
        console.log(">--"); 
        console.log(">-------------------------------------");
        for(var chromaIdx = 0; chromaIdx < this.chromaColors.length; ++chromaIdx){
            console.log(JSON.stringify(this.chromaColors[chromaIdx], colorShowFormat, '|     '));
        }
        
        function isInColors(hsv, colors){
            for(var i =0; i < colors.length; ++i){
                if(hContrastRate(hsv.h, colors[i].h) < 0.2 &&
                   sContrastRate(hsv.s, colors[i].s) < 0.2 &&
                   vContrastRate(hsv.v, colors[i].v) < 0.2) return colors[i];
//                if(isInHueRange(hsv.h, hueData.rangeL, hueData.rangeR)) return true;   
            }
            return null;
        }
        
        console.log(">-------------------------------------");
        console.log(">--");
        console.log(">--- Achroma Colors");
        console.log(">--"); 
        console.log(">-------------------------------------");
        for(var svIdx = 0; svIdx < pickedTones.length; ++svIdx){
            
            console.log("Achroma " +svIdx+ " rate : " +  Math.round(pickedTones[svIdx].rate* 10000)/100 + " %");
            var color = {
                'h' : achromaAvgHsv.h,
                's' : pickedTones[svIdx].x/(SATURATION_RANGE-1),
                'v' : pickedTones[svIdx].y/(VALUE_RANGE-1),
                'rate' : (1-chromaRate) * pickedTones[svIdx].rate
            }
            console.log(JSON.stringify(color, colorShowFormat, '|     '));
            this.achromaColors[this.achromaColors.length] = 
            this.pickedColors[this.pickedColors.length] = color;
            for(var achromaIdx = 0; achromaIdx < this.achromaColors.length - 1; ++achromaIdx){
                if(vContrastRate(this.achromaColors[achromaIdx].v, color.v) < 0.1){
                    this.achromaColors[achromaIdx].v = (this.achromaColors[achromaIdx].v * this.achromaColors[achromaIdx].rate + color.v * color.rate) / (this.achromaColors[achromaIdx].rate + color.rate);
                    this.achromaColors.rate += color.rate;
                    this.achromaColors.pop();
                    break;
                }
            }
        }
        this.achromaColors.sort(function(f,b){ return b.rate - f.rate; });

//        this.dominantColors.pushArray(this.chromaColors);   
//        this.dominantColors.pushArray(this.achromaColors);
//        this.dominantColors.sort(function(f,b){ return b.rate - f.rate; });   
        if(chromaRate > 0.55){
            this.dominantColors.pushArray(this.chromaColors);   
            this.dominantColors.pushArray(this.achromaColors);
        }else if( chromaRate < 0.3 ){
            this.dominantColors.pushArray(this.achromaColors);   
            this.dominantColors.pushArray(this.chromaColors);

        }else{
            this.dominantColors.pushArray(this.chromaColors);   
            this.dominantColors.pushArray(this.achromaColors);
            this.dominantColors.sort(function(f,b){ return b.rate - f.rate; });   
        }
    }
    var dateEnd = new Date();
    console.log(">> RunTime ms : ", dateEnd - dateStart);
}

Impression.hContrastRate = hContrastRate;
function hContrastRate(h1, h2){
    var colorCircle1 = toColorCircle(h1);
    var colorCircle2 = toColorCircle(h2);
    var diff = Math.abs(colorCircle1 - colorCircle2);
    if ( diff > HUE_RANGE/2 ) diff = HUE_RANGE - diff;
    return diff/(HUE_RANGE/2);
    
    function toColorCircle(hue){
        var colorCircle;
        if(hue < YELLOW_HUE){
            colorCircle = hue * 2
        }else if(hue < GREEN_HUE){
            colorCircle = YELLOW_HUE * 2 + hue - YELLOW_HUE;
        }else{
            colorCircle = GREEN_HUE * 3 / 2 + (hue - GREEN_HUE) * 3 / 4;
        }
        return colorCircle;
    }
}
Impression.sContrastRate = sContrastRate;
function sContrastRate(s1, s2){
    var diff = Math.abs(s1 - s2);
    return diff;
}
Impression.vContrastRate = vContrastRate;
function vContrastRate(v1, v2){
    var diff = Math.abs(v1 - v2);
    return diff;
}
function colorShowFormat(key, value){
    var result;
    switch(key){
        case 'h' : 
            result = parseInt(value);
            break;
        case 's' :
        case 'v' :     
            result = Math.round(value*1000)/1000;
            break;
        case 'rate' :
            result = Math.round(value*10000)/100;
            break;
        default :
            result = value;
    }
    return result;
}
/* colors */
function Colors(arr){
    var colorsArr
    if(arr instanceof Array){
        colorsArr = new Array(arr.length);
        for(var i=0; i < arr.length; ++i){
            colorsArr[i] = arr[i];   
        }
    }else{
        colorsArr = new Array();    
    }
    colorsArr.toRgb = function(num){
        num = typeof num !== "undefined" ? num : 100;
        var pickedRgb =[];
        for(var i = 0; i < this.length && i < num; ++i){
            var tmpColor = {
                h: this[i].h,
                s: this[i].s,
                v: this[i].v
            }
            pickedRgb[i] = tc(tmpColor).toRgb();
        }
        return pickedRgb;
    },
    colorsArr.toHexString = function(num){
        num = typeof num !== "undefined" ? num : 100;
        var pickedHexString =[];
        for(var i = 0; i < this.length && i < num; ++i){
            var tmpColor = {
                h: this[i].h,
                s: this[i].s,
                v: this[i].v
            }
            pickedHexString[i] = tc(tmpColor).toHexString();
        }
        return pickedHexString;
    }
    colorsArr.pushArray = function(arr){
        if(arr instanceof Array){
            for(var i =0; i< arr.length; ++i){
                this[this.length] = arr[i];   
            }
        }
    }
    return colorsArr;
}
        
function isInHueRange(hue, rangeL, rangeR){
    if(rangeL * rangeR > 0 && rangeL <= rangeR){
        return Math.mod(rangeL, HUE_RANGE) <= hue && 
            hue <= Math.mod(rangeR, HUE_RANGE);
    }else{
        return (Math.mod(rangeL, HUE_RANGE) <= hue && hue < HUE_RANGE) ||
            (0 <= hue && hue <= Math.mod(rangeR, HUE_RANGE));
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
var classifyChroma = function(imageCanvas, rule){
    var ctx = imageCanvas.getContext("2d");
    var imageData = ctx.getImageData(0,0,imageCanvas.width, imageCanvas.height);
    var chroma = new hA('circular1D', HUE_RANGE);    
    var achroma = new hA('2d', SATURATION_RANGE,VALUE_RANGE);
    rule = makeHsvRule(rule);
    var allPxl=0;
    var ruledPxl=0;
    var avgRgb = {
        r : 0,
        g : 0,
        b : 0,
        a : 255
    };
    var achromaAvgRgb = {
        r : 0,
        g : 0,
        b : 0,
        a : 255
    }
    for(var x = 0; x < imageData.width; ++x){
        for(var y = 0; y < imageData.height; ++y){
            var index = (x + y * imageData.width) * 4;
            var r = imageData.data[index + 0];
            var g = imageData.data[index + 1];
            var b = imageData.data[index + 2];
            var a = imageData.data[index + 3];
            var hsv = tc({ r: r, g: g, b: b}).toHsv();
            avgRgb.r += r;
            avgRgb.g += g;
            avgRgb.b += b;
            if(isInRule(hsv, rule)){
                chroma[hIdx(hsv)]++;
                ruledPxl++;
            }else{
                achromaAvgRgb.r += r;
                achromaAvgRgb.g += g;
                achromaAvgRgb.b += b;
                achroma[sIdx(hsv)][vIdx(hsv)]++;   
            }
            allPxl++;
        }
    }
    avgRgb.r = parseInt(avgRgb.r/allPxl);
    avgRgb.g = parseInt(avgRgb.g/allPxl);
    avgRgb.b = parseInt(avgRgb.b/allPxl);
    achromaAvgRgb.r = parseInt(achromaAvgRgb.r/(allPxl-ruledPxl));
    achromaAvgRgb.g = parseInt(achromaAvgRgb.g/(allPxl-ruledPxl));
    achromaAvgRgb.b = parseInt(achromaAvgRgb.b/(allPxl-ruledPxl));
    
    return {chroma: chroma, rate: ruledPxl/allPxl, achroma: achroma, avgRgb: avgRgb, achromaAvgRgb: achromaAvgRgb};
   
    function hIdx(hsv){ return parseInt(hsv.h); }
    function sIdx(hsv){ return Math.round(hsv.s*(SATURATION_RANGE-1)); }
    function vIdx(hsv){ return Math.round(hsv.v*(VALUE_RANGE-1)); }
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
    var hist = new hA('circular1D', HUE_RANGE);    
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
    var hist = new hA("2d", sRange, vRange);
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
//export node module
if(isNodeModule){
    module.exports = Impression;
}
})();