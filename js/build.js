(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Tiler = require('map-the-tiles'),
  SphericalMercator = require('sphericalmercator'),
  baseURL = 'http://tile.openstreetmap.org',
  tilesContainerDiv, size, merc, tiler;

// get map window size
tilesContainerDiv = document.getElementById('tilesContainer');
size = {
  height: parseInt(tilesContainerDiv.clientHeight),
  width: parseInt(tilesContainerDiv.clientWidth)
};
// instance of 'map-the-tiles'
tiler = new Tiler(size);
// projection tranformer instace
merc = new SphericalMercator({size:256});
// add event listenre to 'zoomTo' button 
document.getElementById('zoomTo').addEventListener('click', zoomTo);
// call zoomTo funcion on page load
zoomTo();

function zoomTo() {
  var center = document.getElementById('center').value.split(','),
    zoom =  parseInt(document.getElementById('zoom').value),
    rotation = parseFloat(document.getElementById('rotation').value),
    mercCenter, tiles;
  // calculate map parameters in mercator projection
  mercCenter = merc.forward([parseFloat(center[0]),parseFloat(center[1])]);
 
  // get map tiles list for our map extent
  tiles = tiler.getTiles(mercCenter, zoom,rotation);
  tilesContainerDiv.style.transform = 'rotate('+(rotation)+'deg)';
  // append map tile images to the map div
  tilesContainerDiv.innerHTML = "";
  tiles.forEach(function(t) {
    var img = document.createElement('img');
    img.src = baseURL + '/'+ t.z + '/' + t.x + '/' + t.y + '.png';
    img.setAttribute('style', 'left:'+ t.left + 'px;top:'+t.top+'px;');
    img.setAttribute('class','tile');
    tilesContainerDiv.appendChild(img);
  });
}

},{"map-the-tiles":2,"sphericalmercator":7}],2:[function(require,module,exports){
// map-the-tiles.js
var TransformMatrix = require('transformatrix'),
  intersect = require('rectangles-intersect');
var MapTheTiles = function (viewportSize,projExtent,tileSize) {
  this.vpSize = viewportSize || {width: 256, height: 256};
  // default spherical mercator project extent
  this.projExtent = projExtent || { 
    left: -20037508.342789244,
    right: 20037508.342789244,
    bottom: -20037508.342789244,
    top: 20037508.342789244
  };
  this.tSize = tileSize || 256;
  this.maxRes = Math.min(
    Math.abs(this.projExtent.right - this.projExtent.left)/this.tSize,
    Math.abs(this.projExtent.top - this.projExtent.bottom)/this.tSize);
}
MapTheTiles.prototype.getTiles = function(ctr, z, rot) {
  // all calculation are in pixel coordinates i.e. project extent devied by 
  // resolution at that zoom level
  if(!Array.isArray(ctr)) {
    ctr = [ctr.x,ctr.y];
  }
  var vpExtPx = this._getExtentPx(ctr,z), //view port extent in pixel
    ctrPx = this._pointToPx(ctr,z), //center in pixel
    tr, // instance of TransformMatrix used for rotated view calculation
    rotViewportPx, // rotated view port corner coordinates in pixel
    // expandedExtPx: rotated view port extent (MBR) in pixel, if rotation 
    // is 0 then equals to view port extent
    expandedExtPx = vpExtPx,
    xLeft, xRight, yBottom, yTop, top, left,
    tiles = [];
  if(rot && rot !=0) {
    rot = -rot; //to follow the HTML (transform) convention clockwise positive
    tr = new TransformMatrix();
    tr.translate(ctrPx[0], ctrPx[1]);
    tr.rotate(Math.PI/180 * rot); //as rot is in deg
    tr.translate(-ctrPx[0], -ctrPx[1]);
    rotViewportPx = [
      tr.transformPoint(vpExtPx.left,vpExtPx.bottom),
      tr.transformPoint(vpExtPx.right,vpExtPx.bottom),
      tr.transformPoint(vpExtPx.right,vpExtPx.top),
      tr.transformPoint(vpExtPx.left,vpExtPx.top)
    ];
    expandedExtPx = getBBox(rotViewportPx);
  }
  // tile numbers
  xLeft = Math.floor(expandedExtPx.left/this.tSize);
  xRight = Math.floor(expandedExtPx.right/this.tSize);
  yBottom = Math.floor(expandedExtPx.bottom/this.tSize);
  yTop = Math.floor(expandedExtPx.top/this.tSize);
  //top left tile position of top-left tile with respect to window/div 
  top = topStart = Math.round((yTop * this.tSize) - vpExtPx.top);
  left = Math.round((xLeft * this.tSize) - vpExtPx.left);
  for (var i=xLeft; i<=xRight; i++) {
    top = topStart;
    for(var j=yTop; j<=yBottom; j++) {
      tiles.push({x:i, y:j, z:z, top: top, left: left});
      top += this.tSize;
    }
    left += this.tSize;
  }
  if(rot && rot != 0) {
    // filters out tiles (from expanded view port) that do not intersect with
    // view port 
    tiles = tiles.filter(function(t) {
      return intersect(rotViewportPx,this._getTileBoundingRect(t));
    },this);
  }
  return tiles;
};

MapTheTiles.prototype._getExtentPx = function(ctr,z) {
  var res = this.maxRes/Math.pow(2,z);
  return {
    left: (ctr[0] - this.projExtent.left)/res - this.vpSize.width/2,
    right: (ctr[0] - this.projExtent.left)/res + this.vpSize.width/2,
    bottom: (this.projExtent.top - ctr[1])/res + this.vpSize.height/2,
    top: (this.projExtent.top - ctr[1])/res - this.vpSize.height/2
  };
};
MapTheTiles.prototype._pointToPx = function(pt,z) {
  var res = this.maxRes/Math.pow(2,z);
  return [
    (pt[0] - this.projExtent.left)/res,
    (this.projExtent.top - pt[1])/res
  ];
};
MapTheTiles.prototype._getTileBoundingRect = function(t) {
  var res, l, r, t, b;
  res = this.maxRes/Math.pow(2,t.z);
  l = t.x * this.tSize;
  r = l + this.tSize;
  t = t.y * this.tSize;
  b = t + this.tSize;
  return [[l,b], [r,b], [r,t], [l,t]];
};
function getBBox(points) {
  var xArray = points.map(function(p) {return p[0];});
  var yArray = points.map(function(p) {return p[1];});
  return {
    left: Math.min.apply(this,xArray),
    right: Math.max.apply(this,xArray),
    bottom: Math.max.apply(this,yArray),
    top: Math.min.apply(this,yArray)
  };
}
module.exports = MapTheTiles;

},{"rectangles-intersect":5,"transformatrix":6}],3:[function(require,module,exports){
// check-point-in-rectangle.js
// check point intersects with rectangle
// http://martin-thoma.com/how-to-check-if-a-point-is-inside-a-rectangle/
function pointInRect(pt,rect,precision) {
  var p = precision || 6;
  var rectArea = 0.5*Math.abs(
    (rect[0][1] - rect[2][1]) * (rect[3][0] - rect[1][0])
    + (rect[1][1] - rect[3][1]) * (rect[0][0] - rect[2][0])
  );
  var triangleArea = rect.reduce(function(prev,cur, i, arr) {
    var j = i == arr.length-1 ? 0 : i+1;
    return prev + 0.5*Math.abs(
      pt[0] * (arr[i][1] - arr[j][1])
      + arr[i][0] * (arr[j][1] - pt[1])
      + arr[j][0] * (pt[1] - arr[i][1])
    );
  }, 0);
  return fix(triangleArea,p) == fix(rectArea,p);
}
// fix to the precision
function fix(n,p) {
  return parseInt(n * Math.pow(10,p));
};

module.exports = pointInRect;

},{}],4:[function(require,module,exports){
// line-segments-intersect.js 
// intersection point https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
// line 1: x1,y1,x2,y2
// line 2: x3,y3,x4,y4
// for comparing the float number, fixing the number to int to required 
// precision
function linesIntersect(seg1, seg2, precision) {
  var x1 = seg1[0][0],
    y1 = seg1[0][1],
    x2 = seg1[1][0],
    y2 = seg1[1][1],
    x3 = seg2[0][0],
    y3 = seg2[0][1],
    x4 = seg2[1][0],
    y4 = seg2[1][1],
    intPt,x,y,result = false, 
    p = precision || 6,
    denominator = (x1 - x2)*(y3 - y4) - (y1 -y2)*(x3 - x4);
  if (denominator == 0) {
    // check both segments are Coincident, we already know 
    // that these two are parallel 
    if (fix((y3 - y1)*(x2 - x1),p) == fix((y2 -y1)*(x3 - x1),p)) {
      // second segment any end point lies on first segment
      result = intPtOnSegment(x3,y3,x1,y1,x2,y2,p) ||
        intPtOnSegment(x4,y4,x1,y1,x2,y2,p);
    }
  } else {
    x = ((x1*y2 - y1*x2)*(x3 - x4) - (x1 - x2)*(x3*y4 - y3*x4))/denominator;
    y = ((x1*y2 - y1*x2)*(y3 - y4) - (y1 - y2)*(x3*y4 - y3*x4))/denominator;
    // check int point (x,y) lies on both segment 
    result = intPtOnSegment(x,y,x1,y1,x2,y2,p) 
      && intPtOnSegment(x,y,x3,y3,x4,y4,p);
  }
  return result;
} 

function intPtOnSegment(x,y,x1,y1,x2,y2,p) {
  return fix(Math.min(x1,x2),p) <= fix(x,p) && fix(x,p) <= fix(Math.max(x1,x2),p) 
    && fix(Math.min(y1,y2),p) <= fix(y,p) && fix(y,p) <= fix(Math.max(y1,y2),p); 
}

// fix to the precision
function fix(n,p) {
  return parseInt(n * Math.pow(10,p));
}

module.exports = linesIntersect;

},{}],5:[function(require,module,exports){
// rectangles-intersect.js
// two rectangles (non aligned to axis) intersects or not
var linesIntersect = require('line-segments-intersect'),
  pointInside = require('check-point-in-rectangle');

function intersects(rect1,rect2) {
  var intersect = rect1.some(function(pt1,i,r1) {
    //check intersection of any seg or rect1 to any seg of rect2
    var j = i == r1.length-1 ? 0 : i+1;
    return rect2.some(function(pt2,k,r2) {
      var l = k == r2.length-1 ? 0 : k+1;
      return linesIntersect([r1[i], r1[j]], [r2[k], r2[l]]);
    });
  });
  if(!intersect) {
    // check one rectangle contains another
    intersect = rect2.some(function(pt) {
      return pointInside(pt, rect1);
    }) ||
    rect1.some(function(pt) {
      return pointInside(pt, rect2);
    });
  }
  return intersect;
}

module.exports = intersects;

},{"check-point-in-rectangle":3,"line-segments-intersect":4}],6:[function(require,module,exports){
var Matrix = function() {
    this.reset();
};
Matrix.prototype.reset = function() {
    this.m = [1, 0, 0, 1, 0, 0];
    return this;
};
Matrix.prototype.multiply = function(matrix) {
    var m11 = this.m[0] * matrix.m[0] + this.m[2] * matrix.m[1],
        m12 = this.m[1] * matrix.m[0] + this.m[3] * matrix.m[1],
        m21 = this.m[0] * matrix.m[2] + this.m[2] * matrix.m[3],
        m22 = this.m[1] * matrix.m[2] + this.m[3] * matrix.m[3];

    var dx = this.m[0] * matrix.m[4] + this.m[2] * matrix.m[5] + this.m[4],
        dy = this.m[1] * matrix.m[4] + this.m[3] * matrix.m[5] + this.m[5];
    this.m[0] = m11;
    this.m[1] = m12;
    this.m[2] = m21;
    this.m[3] = m22;
    this.m[4] = dx;
    this.m[5] = dy;
    return this;
};
Matrix.prototype.inverse = function() {
    var inv = new Matrix();
    inv.m = this.m.slice(0);
    var d = 1 / (inv.m[0] * inv.m[3] - inv.m[1] * inv.m[2]),
        m0 = inv.m[3] * d,
        m1 = -inv.m[1] * d,
        m2 = -inv.m[2] * d,
        m3 = inv.m[0] * d,
        m4 = d * (inv.m[2] * inv.m[5] - inv.m[3] * inv.m[4]),
        m5 = d * (inv.m[1] * inv.m[4] - inv.m[0] * inv.m[5]);
    inv.m[0] = m0;
    inv.m[1] = m1;
    inv.m[2] = m2;
    inv.m[3] = m3;
    inv.m[4] = m4;
    inv.m[5] = m5;
    return inv;
};
Matrix.prototype.rotate = function(rad) {
    var c = Math.cos(rad),
        s = Math.sin(rad),
        m11 = this.m[0] * c + this.m[2] * s,
        m12 = this.m[1] * c + this.m[3] * s,
        m21 = this.m[0] * -s + this.m[2] * c,
        m22 = this.m[1] * -s + this.m[3] * c;
    this.m[0] = m11;
    this.m[1] = m12;
    this.m[2] = m21;
    this.m[3] = m22;
    return this;
};
Matrix.prototype.translate = function(x, y) {
    this.m[4] += this.m[0] * x + this.m[2] * y;
    this.m[5] += this.m[1] * x + this.m[3] * y;
    return this;
};
Matrix.prototype.scale = function(sx, sy) {
    this.m[0] *= sx;
    this.m[1] *= sx;
    this.m[2] *= sy;
    this.m[3] *= sy;
    return this;
};
Matrix.prototype.transformPoint = function(px, py) {
    var x = px,
        y = py;
    px = x * this.m[0] + y * this.m[2] + this.m[4];
    py = x * this.m[1] + y * this.m[3] + this.m[5];
    return [px, py];
};
Matrix.prototype.transformVector = function(px, py) {
    var x = px,
        y = py;
    px = x * this.m[0] + y * this.m[2];
    py = x * this.m[1] + y * this.m[3];
    return [px, py];
};
if(typeof module !== "undefined") {
    module.exports = Matrix;
}
else {
    window.Matrix = Matrix;
}

},{}],7:[function(require,module,exports){
var SphericalMercator = (function(){

// Closures including constants and other precalculated values.
var cache = {},
    EPSLN = 1.0e-10,
    D2R = Math.PI / 180,
    R2D = 180 / Math.PI,
    // 900913 properties.
    A = 6378137.0,
    MAXEXTENT = 20037508.342789244;


// SphericalMercator constructor: precaches calculations
// for fast tile lookups.
function SphericalMercator(options) {
    options = options || {};
    this.size = options.size || 256;
    if (!cache[this.size]) {
        var size = this.size;
        var c = cache[this.size] = {};
        c.Bc = [];
        c.Cc = [];
        c.zc = [];
        c.Ac = [];
        for (var d = 0; d < 30; d++) {
            c.Bc.push(size / 360);
            c.Cc.push(size / (2 * Math.PI));
            c.zc.push(size / 2);
            c.Ac.push(size);
            size *= 2;
        }
    }
    this.Bc = cache[this.size].Bc;
    this.Cc = cache[this.size].Cc;
    this.zc = cache[this.size].zc;
    this.Ac = cache[this.size].Ac;
};

// Convert lon lat to screen pixel value
//
// - `ll` {Array} `[lon, lat]` array of geographic coordinates.
// - `zoom` {Number} zoom level.
SphericalMercator.prototype.px = function(ll, zoom) {
    var d = this.zc[zoom];
    var f = Math.min(Math.max(Math.sin(D2R * ll[1]), -0.9999), 0.9999);
    var x = Math.round(d + ll[0] * this.Bc[zoom]);
    var y = Math.round(d + 0.5 * Math.log((1 + f) / (1 - f)) * (-this.Cc[zoom]));
    (x > this.Ac[zoom]) && (x = this.Ac[zoom]);
    (y > this.Ac[zoom]) && (y = this.Ac[zoom]);
    //(x < 0) && (x = 0);
    //(y < 0) && (y = 0);
    return [x, y];
};

// Convert screen pixel value to lon lat
//
// - `px` {Array} `[x, y]` array of geographic coordinates.
// - `zoom` {Number} zoom level.
SphericalMercator.prototype.ll = function(px, zoom) {
    var g = (px[1] - this.zc[zoom]) / (-this.Cc[zoom]);
    var lon = (px[0] - this.zc[zoom]) / this.Bc[zoom];
    var lat = R2D * (2 * Math.atan(Math.exp(g)) - 0.5 * Math.PI);
    return [lon, lat];
};

// Convert tile xyz value to bbox of the form `[w, s, e, n]`
//
// - `x` {Number} x (longitude) number.
// - `y` {Number} y (latitude) number.
// - `zoom` {Number} zoom.
// - `tms_style` {Boolean} whether to compute using tms-style.
// - `srs` {String} projection for resulting bbox (WGS84|900913).
// - `return` {Array} bbox array of values in form `[w, s, e, n]`.
SphericalMercator.prototype.bbox = function(x, y, zoom, tms_style, srs) {
    // Convert xyz into bbox with srs WGS84
    if (tms_style) {
        y = (Math.pow(2, zoom) - 1) - y;
    }
    // Use +y to make sure it's a number to avoid inadvertent concatenation.
    var ll = [x * this.size, (+y + 1) * this.size]; // lower left
    // Use +x to make sure it's a number to avoid inadvertent concatenation.
    var ur = [(+x + 1) * this.size, y * this.size]; // upper right
    var bbox = this.ll(ll, zoom).concat(this.ll(ur, zoom));

    // If web mercator requested reproject to 900913.
    if (srs === '900913') {
        return this.convert(bbox, '900913');
    } else {
        return bbox;
    }
};

// Convert bbox to xyx bounds
//
// - `bbox` {Number} bbox in the form `[w, s, e, n]`.
// - `zoom` {Number} zoom.
// - `tms_style` {Boolean} whether to compute using tms-style.
// - `srs` {String} projection of input bbox (WGS84|900913).
// - `@return` {Object} XYZ bounds containing minX, maxX, minY, maxY properties.
SphericalMercator.prototype.xyz = function(bbox, zoom, tms_style, srs) {
    // If web mercator provided reproject to WGS84.
    if (srs === '900913') {
        bbox = this.convert(bbox, 'WGS84');
    }

    var ll = [bbox[0], bbox[1]]; // lower left
    var ur = [bbox[2], bbox[3]]; // upper right
    var px_ll = this.px(ll, zoom);
    var px_ur = this.px(ur, zoom);
    // Y = 0 for XYZ is the top hence minY uses px_ur[1].
    var bounds = {
        minX: Math.floor(px_ll[0] / this.size),
        minY: Math.floor(px_ur[1] / this.size),
        maxX: Math.floor((px_ur[0] - 1) / this.size),
        maxY: Math.floor((px_ll[1] - 1) / this.size)
    };
    if (tms_style) {
        var tms = {
            minY: (Math.pow(2, zoom) - 1) - bounds.maxY,
            maxY: (Math.pow(2, zoom) - 1) - bounds.minY
        };
        bounds.minY = tms.minY;
        bounds.maxY = tms.maxY;
    }
    return bounds;
};

// Convert projection of given bbox.
//
// - `bbox` {Number} bbox in the form `[w, s, e, n]`.
// - `to` {String} projection of output bbox (WGS84|900913). Input bbox
//   assumed to be the "other" projection.
// - `@return` {Object} bbox with reprojected coordinates.
SphericalMercator.prototype.convert = function(bbox, to) {
    if (to === '900913') {
        return this.forward(bbox.slice(0, 2)).concat(this.forward(bbox.slice(2,4)));
    } else {
        return this.inverse(bbox.slice(0, 2)).concat(this.inverse(bbox.slice(2,4)));
    }
};

// Convert lon/lat values to 900913 x/y.
SphericalMercator.prototype.forward = function(ll) {
    var xy = [
        A * ll[0] * D2R,
        A * Math.log(Math.tan((Math.PI*0.25) + (0.5 * ll[1] * D2R)))
    ];
    // if xy value is beyond maxextent (e.g. poles), return maxextent.
    (xy[0] > MAXEXTENT) && (xy[0] = MAXEXTENT);
    (xy[0] < -MAXEXTENT) && (xy[0] = -MAXEXTENT);
    (xy[1] > MAXEXTENT) && (xy[1] = MAXEXTENT);
    (xy[1] < -MAXEXTENT) && (xy[1] = -MAXEXTENT);
    return xy;
};

// Convert 900913 x/y values to lon/lat.
SphericalMercator.prototype.inverse = function(xy) {
    return [
        (xy[0] * R2D / A),
        ((Math.PI*0.5) - 2.0 * Math.atan(Math.exp(-xy[1] / A))) * R2D
    ];
};

return SphericalMercator;

})();

if (typeof module !== 'undefined' && typeof exports !== 'undefined') {
    module.exports = exports = SphericalMercator;
}

},{}]},{},[1])


//# sourceMappingURL=build.js.map