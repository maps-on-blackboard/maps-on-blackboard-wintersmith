(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
var webMercatorTiles = require('web-mercator-tiles'),
  SphericalMercator = require('sphericalmercator'),
  baseURL = 'http://tile.openstreetmap.org',
  merc, mercCenter, mapExtent, res,
  tiles, containter,mapDiv, size;
  mercatorMaxRes = 156543.03392804097;
// get map window size
mapDiv = document.getElementById('map');
size = {
  height: parseInt(mapDiv.clientHeight),
  width: parseInt(mapDiv.clientWidth)
};
merc = new SphericalMercator({size:256});
zoomTo();
document.getElementById('zoomTo').addEventListener('click', zoomTo);

function zoomTo() {
  var center = document.getElementById('center').value.split(','),
    zoom =  parseInt(document.getElementById('zoom').value);
  // calculate map parameters in mercator projection
  mercCenter = merc.forward([parseFloat(center[0]),parseFloat(center[1])]);
  res = mercatorMaxRes/Math.pow(2,zoom);
  mapExtent = {
    left: mercCenter[0] - size.width/2 * res,
    right: mercCenter[0] + size.width/2 * res,
    bottom: mercCenter[1] - size.height/2 * res,
    top: mercCenter[1] + size.height/2 * res
  };
  // get map tiles list for our map extent
  tiles = webMercatorTiles(mapExtent, zoom);
  // append map tile images to the map div
  mapDiv.innerHTML = "";
  tiles.forEach(function(t) {
    var img = document.createElement('img');
    img.src = baseURL + '/'+ t.Z + '/' + t.X + '/' + t.Y + '.png';
    img.setAttribute('style', 'left:'+ t.left + 'px;top:'+t.top+'px;');
    img.setAttribute('class','tile');
    mapDiv.appendChild(img);
  });
}

},{"sphericalmercator":1,"web-mercator-tiles":3}],3:[function(require,module,exports){
module.exports = function(extent,z) {
  // web mercator projection extent
  var projExtent = {
      left: -20037508.342789244,
      right: 20037508.342789244,
      bottom: -20037508.342789244,
      top: 20037508.342789244
    }, 
    //tile seize
    size = 256,
    // resolutions
    res = [156543.03392804097, 78271.51696402048, 39135.75848201024, 19567.87924100512, 9783.93962050256, 4891.96981025128, 2445.98490512564, 1222.99245256282, 611.49622628141, 305.748113140705, 152.8740565703525, 76.43702828517625, 38.21851414258813, 19.109257071294063, 9.554628535647032, 4.777314267823516, 2.388657133911758, 1.194328566955879, 0.5971642834779395, 0.29858214173896974, 0.14929107086948487, 0.07464553543474244, 0.03732276771737122, 0.01866138385868561],
    //coordinated in pixel
    lx = Math.floor((extent.left - projExtent.left)/res[z]),
    rx = Math.floor((extent.right - projExtent.left)/res[z]),
    by = Math.floor((projExtent.top - extent.bottom )/res[z]),
    ty = Math.floor((projExtent.top - extent.top )/res[z]),
    // tile numbers
    lX = Math.floor(lx/size),
    rX = Math.floor(rx/size),
    bY = Math.floor(by/size),
    tY = Math.floor(ty/size),
    //top left tile position of top-left tile with respect to window/div 
    top = topStart = (tY * size) - ty,
    left = (lX * size) - lx,
    tiles = [];
  for (var i=lX; i<=rX; i++) {
    top = topStart;
    for(var j=tY; j<=bY; j++) {
      tiles.push({
        X:i,
        Y:j,
        Z:z,
        top: top,
        left: left
      });
      top +=size;
    }
    left +=size;
  }
  return tiles;
};

},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvc3BoZXJpY2FsbWVyY2F0b3Ivc3BoZXJpY2FsbWVyY2F0b3IuanMiLCJqcy9tYWluLmpzIiwibm9kZV9tb2R1bGVzL3dlYi1tZXJjYXRvci10aWxlcy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFNwaGVyaWNhbE1lcmNhdG9yID0gKGZ1bmN0aW9uKCl7XG5cbi8vIENsb3N1cmVzIGluY2x1ZGluZyBjb25zdGFudHMgYW5kIG90aGVyIHByZWNhbGN1bGF0ZWQgdmFsdWVzLlxudmFyIGNhY2hlID0ge30sXG4gICAgRVBTTE4gPSAxLjBlLTEwLFxuICAgIEQyUiA9IE1hdGguUEkgLyAxODAsXG4gICAgUjJEID0gMTgwIC8gTWF0aC5QSSxcbiAgICAvLyA5MDA5MTMgcHJvcGVydGllcy5cbiAgICBBID0gNjM3ODEzNy4wLFxuICAgIE1BWEVYVEVOVCA9IDIwMDM3NTA4LjM0Mjc4OTI0NDtcblxuXG4vLyBTcGhlcmljYWxNZXJjYXRvciBjb25zdHJ1Y3RvcjogcHJlY2FjaGVzIGNhbGN1bGF0aW9uc1xuLy8gZm9yIGZhc3QgdGlsZSBsb29rdXBzLlxuZnVuY3Rpb24gU3BoZXJpY2FsTWVyY2F0b3Iob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuc2l6ZSA9IG9wdGlvbnMuc2l6ZSB8fCAyNTY7XG4gICAgaWYgKCFjYWNoZVt0aGlzLnNpemVdKSB7XG4gICAgICAgIHZhciBzaXplID0gdGhpcy5zaXplO1xuICAgICAgICB2YXIgYyA9IGNhY2hlW3RoaXMuc2l6ZV0gPSB7fTtcbiAgICAgICAgYy5CYyA9IFtdO1xuICAgICAgICBjLkNjID0gW107XG4gICAgICAgIGMuemMgPSBbXTtcbiAgICAgICAgYy5BYyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBkID0gMDsgZCA8IDMwOyBkKyspIHtcbiAgICAgICAgICAgIGMuQmMucHVzaChzaXplIC8gMzYwKTtcbiAgICAgICAgICAgIGMuQ2MucHVzaChzaXplIC8gKDIgKiBNYXRoLlBJKSk7XG4gICAgICAgICAgICBjLnpjLnB1c2goc2l6ZSAvIDIpO1xuICAgICAgICAgICAgYy5BYy5wdXNoKHNpemUpO1xuICAgICAgICAgICAgc2l6ZSAqPSAyO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMuQmMgPSBjYWNoZVt0aGlzLnNpemVdLkJjO1xuICAgIHRoaXMuQ2MgPSBjYWNoZVt0aGlzLnNpemVdLkNjO1xuICAgIHRoaXMuemMgPSBjYWNoZVt0aGlzLnNpemVdLnpjO1xuICAgIHRoaXMuQWMgPSBjYWNoZVt0aGlzLnNpemVdLkFjO1xufTtcblxuLy8gQ29udmVydCBsb24gbGF0IHRvIHNjcmVlbiBwaXhlbCB2YWx1ZVxuLy9cbi8vIC0gYGxsYCB7QXJyYXl9IGBbbG9uLCBsYXRdYCBhcnJheSBvZiBnZW9ncmFwaGljIGNvb3JkaW5hdGVzLlxuLy8gLSBgem9vbWAge051bWJlcn0gem9vbSBsZXZlbC5cblNwaGVyaWNhbE1lcmNhdG9yLnByb3RvdHlwZS5weCA9IGZ1bmN0aW9uKGxsLCB6b29tKSB7XG4gICAgdmFyIGQgPSB0aGlzLnpjW3pvb21dO1xuICAgIHZhciBmID0gTWF0aC5taW4oTWF0aC5tYXgoTWF0aC5zaW4oRDJSICogbGxbMV0pLCAtMC45OTk5KSwgMC45OTk5KTtcbiAgICB2YXIgeCA9IE1hdGgucm91bmQoZCArIGxsWzBdICogdGhpcy5CY1t6b29tXSk7XG4gICAgdmFyIHkgPSBNYXRoLnJvdW5kKGQgKyAwLjUgKiBNYXRoLmxvZygoMSArIGYpIC8gKDEgLSBmKSkgKiAoLXRoaXMuQ2Nbem9vbV0pKTtcbiAgICAoeCA+IHRoaXMuQWNbem9vbV0pICYmICh4ID0gdGhpcy5BY1t6b29tXSk7XG4gICAgKHkgPiB0aGlzLkFjW3pvb21dKSAmJiAoeSA9IHRoaXMuQWNbem9vbV0pO1xuICAgIC8vKHggPCAwKSAmJiAoeCA9IDApO1xuICAgIC8vKHkgPCAwKSAmJiAoeSA9IDApO1xuICAgIHJldHVybiBbeCwgeV07XG59O1xuXG4vLyBDb252ZXJ0IHNjcmVlbiBwaXhlbCB2YWx1ZSB0byBsb24gbGF0XG4vL1xuLy8gLSBgcHhgIHtBcnJheX0gYFt4LCB5XWAgYXJyYXkgb2YgZ2VvZ3JhcGhpYyBjb29yZGluYXRlcy5cbi8vIC0gYHpvb21gIHtOdW1iZXJ9IHpvb20gbGV2ZWwuXG5TcGhlcmljYWxNZXJjYXRvci5wcm90b3R5cGUubGwgPSBmdW5jdGlvbihweCwgem9vbSkge1xuICAgIHZhciBnID0gKHB4WzFdIC0gdGhpcy56Y1t6b29tXSkgLyAoLXRoaXMuQ2Nbem9vbV0pO1xuICAgIHZhciBsb24gPSAocHhbMF0gLSB0aGlzLnpjW3pvb21dKSAvIHRoaXMuQmNbem9vbV07XG4gICAgdmFyIGxhdCA9IFIyRCAqICgyICogTWF0aC5hdGFuKE1hdGguZXhwKGcpKSAtIDAuNSAqIE1hdGguUEkpO1xuICAgIHJldHVybiBbbG9uLCBsYXRdO1xufTtcblxuLy8gQ29udmVydCB0aWxlIHh5eiB2YWx1ZSB0byBiYm94IG9mIHRoZSBmb3JtIGBbdywgcywgZSwgbl1gXG4vL1xuLy8gLSBgeGAge051bWJlcn0geCAobG9uZ2l0dWRlKSBudW1iZXIuXG4vLyAtIGB5YCB7TnVtYmVyfSB5IChsYXRpdHVkZSkgbnVtYmVyLlxuLy8gLSBgem9vbWAge051bWJlcn0gem9vbS5cbi8vIC0gYHRtc19zdHlsZWAge0Jvb2xlYW59IHdoZXRoZXIgdG8gY29tcHV0ZSB1c2luZyB0bXMtc3R5bGUuXG4vLyAtIGBzcnNgIHtTdHJpbmd9IHByb2plY3Rpb24gZm9yIHJlc3VsdGluZyBiYm94IChXR1M4NHw5MDA5MTMpLlxuLy8gLSBgcmV0dXJuYCB7QXJyYXl9IGJib3ggYXJyYXkgb2YgdmFsdWVzIGluIGZvcm0gYFt3LCBzLCBlLCBuXWAuXG5TcGhlcmljYWxNZXJjYXRvci5wcm90b3R5cGUuYmJveCA9IGZ1bmN0aW9uKHgsIHksIHpvb20sIHRtc19zdHlsZSwgc3JzKSB7XG4gICAgLy8gQ29udmVydCB4eXogaW50byBiYm94IHdpdGggc3JzIFdHUzg0XG4gICAgaWYgKHRtc19zdHlsZSkge1xuICAgICAgICB5ID0gKE1hdGgucG93KDIsIHpvb20pIC0gMSkgLSB5O1xuICAgIH1cbiAgICAvLyBVc2UgK3kgdG8gbWFrZSBzdXJlIGl0J3MgYSBudW1iZXIgdG8gYXZvaWQgaW5hZHZlcnRlbnQgY29uY2F0ZW5hdGlvbi5cbiAgICB2YXIgbGwgPSBbeCAqIHRoaXMuc2l6ZSwgKCt5ICsgMSkgKiB0aGlzLnNpemVdOyAvLyBsb3dlciBsZWZ0XG4gICAgLy8gVXNlICt4IHRvIG1ha2Ugc3VyZSBpdCdzIGEgbnVtYmVyIHRvIGF2b2lkIGluYWR2ZXJ0ZW50IGNvbmNhdGVuYXRpb24uXG4gICAgdmFyIHVyID0gWygreCArIDEpICogdGhpcy5zaXplLCB5ICogdGhpcy5zaXplXTsgLy8gdXBwZXIgcmlnaHRcbiAgICB2YXIgYmJveCA9IHRoaXMubGwobGwsIHpvb20pLmNvbmNhdCh0aGlzLmxsKHVyLCB6b29tKSk7XG5cbiAgICAvLyBJZiB3ZWIgbWVyY2F0b3IgcmVxdWVzdGVkIHJlcHJvamVjdCB0byA5MDA5MTMuXG4gICAgaWYgKHNycyA9PT0gJzkwMDkxMycpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29udmVydChiYm94LCAnOTAwOTEzJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGJib3g7XG4gICAgfVxufTtcblxuLy8gQ29udmVydCBiYm94IHRvIHh5eCBib3VuZHNcbi8vXG4vLyAtIGBiYm94YCB7TnVtYmVyfSBiYm94IGluIHRoZSBmb3JtIGBbdywgcywgZSwgbl1gLlxuLy8gLSBgem9vbWAge051bWJlcn0gem9vbS5cbi8vIC0gYHRtc19zdHlsZWAge0Jvb2xlYW59IHdoZXRoZXIgdG8gY29tcHV0ZSB1c2luZyB0bXMtc3R5bGUuXG4vLyAtIGBzcnNgIHtTdHJpbmd9IHByb2plY3Rpb24gb2YgaW5wdXQgYmJveCAoV0dTODR8OTAwOTEzKS5cbi8vIC0gYEByZXR1cm5gIHtPYmplY3R9IFhZWiBib3VuZHMgY29udGFpbmluZyBtaW5YLCBtYXhYLCBtaW5ZLCBtYXhZIHByb3BlcnRpZXMuXG5TcGhlcmljYWxNZXJjYXRvci5wcm90b3R5cGUueHl6ID0gZnVuY3Rpb24oYmJveCwgem9vbSwgdG1zX3N0eWxlLCBzcnMpIHtcbiAgICAvLyBJZiB3ZWIgbWVyY2F0b3IgcHJvdmlkZWQgcmVwcm9qZWN0IHRvIFdHUzg0LlxuICAgIGlmIChzcnMgPT09ICc5MDA5MTMnKSB7XG4gICAgICAgIGJib3ggPSB0aGlzLmNvbnZlcnQoYmJveCwgJ1dHUzg0Jyk7XG4gICAgfVxuXG4gICAgdmFyIGxsID0gW2Jib3hbMF0sIGJib3hbMV1dOyAvLyBsb3dlciBsZWZ0XG4gICAgdmFyIHVyID0gW2Jib3hbMl0sIGJib3hbM11dOyAvLyB1cHBlciByaWdodFxuICAgIHZhciBweF9sbCA9IHRoaXMucHgobGwsIHpvb20pO1xuICAgIHZhciBweF91ciA9IHRoaXMucHgodXIsIHpvb20pO1xuICAgIC8vIFkgPSAwIGZvciBYWVogaXMgdGhlIHRvcCBoZW5jZSBtaW5ZIHVzZXMgcHhfdXJbMV0uXG4gICAgdmFyIGJvdW5kcyA9IHtcbiAgICAgICAgbWluWDogTWF0aC5mbG9vcihweF9sbFswXSAvIHRoaXMuc2l6ZSksXG4gICAgICAgIG1pblk6IE1hdGguZmxvb3IocHhfdXJbMV0gLyB0aGlzLnNpemUpLFxuICAgICAgICBtYXhYOiBNYXRoLmZsb29yKChweF91clswXSAtIDEpIC8gdGhpcy5zaXplKSxcbiAgICAgICAgbWF4WTogTWF0aC5mbG9vcigocHhfbGxbMV0gLSAxKSAvIHRoaXMuc2l6ZSlcbiAgICB9O1xuICAgIGlmICh0bXNfc3R5bGUpIHtcbiAgICAgICAgdmFyIHRtcyA9IHtcbiAgICAgICAgICAgIG1pblk6IChNYXRoLnBvdygyLCB6b29tKSAtIDEpIC0gYm91bmRzLm1heFksXG4gICAgICAgICAgICBtYXhZOiAoTWF0aC5wb3coMiwgem9vbSkgLSAxKSAtIGJvdW5kcy5taW5ZXG4gICAgICAgIH07XG4gICAgICAgIGJvdW5kcy5taW5ZID0gdG1zLm1pblk7XG4gICAgICAgIGJvdW5kcy5tYXhZID0gdG1zLm1heFk7XG4gICAgfVxuICAgIHJldHVybiBib3VuZHM7XG59O1xuXG4vLyBDb252ZXJ0IHByb2plY3Rpb24gb2YgZ2l2ZW4gYmJveC5cbi8vXG4vLyAtIGBiYm94YCB7TnVtYmVyfSBiYm94IGluIHRoZSBmb3JtIGBbdywgcywgZSwgbl1gLlxuLy8gLSBgdG9gIHtTdHJpbmd9IHByb2plY3Rpb24gb2Ygb3V0cHV0IGJib3ggKFdHUzg0fDkwMDkxMykuIElucHV0IGJib3hcbi8vICAgYXNzdW1lZCB0byBiZSB0aGUgXCJvdGhlclwiIHByb2plY3Rpb24uXG4vLyAtIGBAcmV0dXJuYCB7T2JqZWN0fSBiYm94IHdpdGggcmVwcm9qZWN0ZWQgY29vcmRpbmF0ZXMuXG5TcGhlcmljYWxNZXJjYXRvci5wcm90b3R5cGUuY29udmVydCA9IGZ1bmN0aW9uKGJib3gsIHRvKSB7XG4gICAgaWYgKHRvID09PSAnOTAwOTEzJykge1xuICAgICAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGJib3guc2xpY2UoMCwgMikpLmNvbmNhdCh0aGlzLmZvcndhcmQoYmJveC5zbGljZSgyLDQpKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW52ZXJzZShiYm94LnNsaWNlKDAsIDIpKS5jb25jYXQodGhpcy5pbnZlcnNlKGJib3guc2xpY2UoMiw0KSkpO1xuICAgIH1cbn07XG5cbi8vIENvbnZlcnQgbG9uL2xhdCB2YWx1ZXMgdG8gOTAwOTEzIHgveS5cblNwaGVyaWNhbE1lcmNhdG9yLnByb3RvdHlwZS5mb3J3YXJkID0gZnVuY3Rpb24obGwpIHtcbiAgICB2YXIgeHkgPSBbXG4gICAgICAgIEEgKiBsbFswXSAqIEQyUixcbiAgICAgICAgQSAqIE1hdGgubG9nKE1hdGgudGFuKChNYXRoLlBJKjAuMjUpICsgKDAuNSAqIGxsWzFdICogRDJSKSkpXG4gICAgXTtcbiAgICAvLyBpZiB4eSB2YWx1ZSBpcyBiZXlvbmQgbWF4ZXh0ZW50IChlLmcuIHBvbGVzKSwgcmV0dXJuIG1heGV4dGVudC5cbiAgICAoeHlbMF0gPiBNQVhFWFRFTlQpICYmICh4eVswXSA9IE1BWEVYVEVOVCk7XG4gICAgKHh5WzBdIDwgLU1BWEVYVEVOVCkgJiYgKHh5WzBdID0gLU1BWEVYVEVOVCk7XG4gICAgKHh5WzFdID4gTUFYRVhURU5UKSAmJiAoeHlbMV0gPSBNQVhFWFRFTlQpO1xuICAgICh4eVsxXSA8IC1NQVhFWFRFTlQpICYmICh4eVsxXSA9IC1NQVhFWFRFTlQpO1xuICAgIHJldHVybiB4eTtcbn07XG5cbi8vIENvbnZlcnQgOTAwOTEzIHgveSB2YWx1ZXMgdG8gbG9uL2xhdC5cblNwaGVyaWNhbE1lcmNhdG9yLnByb3RvdHlwZS5pbnZlcnNlID0gZnVuY3Rpb24oeHkpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAoeHlbMF0gKiBSMkQgLyBBKSxcbiAgICAgICAgKChNYXRoLlBJKjAuNSkgLSAyLjAgKiBNYXRoLmF0YW4oTWF0aC5leHAoLXh5WzFdIC8gQSkpKSAqIFIyRFxuICAgIF07XG59O1xuXG5yZXR1cm4gU3BoZXJpY2FsTWVyY2F0b3I7XG5cbn0pKCk7XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBTcGhlcmljYWxNZXJjYXRvcjtcbn1cbiIsInZhciB3ZWJNZXJjYXRvclRpbGVzID0gcmVxdWlyZSgnd2ViLW1lcmNhdG9yLXRpbGVzJyksXG4gIFNwaGVyaWNhbE1lcmNhdG9yID0gcmVxdWlyZSgnc3BoZXJpY2FsbWVyY2F0b3InKSxcbiAgYmFzZVVSTCA9ICdodHRwOi8vdGlsZS5vcGVuc3RyZWV0bWFwLm9yZycsXG4gIG1lcmMsIG1lcmNDZW50ZXIsIG1hcEV4dGVudCwgcmVzLFxuICB0aWxlcywgY29udGFpbnRlcixtYXBEaXYsIHNpemU7XG4gIG1lcmNhdG9yTWF4UmVzID0gMTU2NTQzLjAzMzkyODA0MDk3O1xuLy8gZ2V0IG1hcCB3aW5kb3cgc2l6ZVxubWFwRGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcCcpO1xuc2l6ZSA9IHtcbiAgaGVpZ2h0OiBwYXJzZUludChtYXBEaXYuY2xpZW50SGVpZ2h0KSxcbiAgd2lkdGg6IHBhcnNlSW50KG1hcERpdi5jbGllbnRXaWR0aClcbn07XG5tZXJjID0gbmV3IFNwaGVyaWNhbE1lcmNhdG9yKHtzaXplOjI1Nn0pO1xuem9vbVRvKCk7XG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbVRvJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB6b29tVG8pO1xuXG5mdW5jdGlvbiB6b29tVG8oKSB7XG4gIHZhciBjZW50ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2VudGVyJykudmFsdWUuc3BsaXQoJywnKSxcbiAgICB6b29tID0gIHBhcnNlSW50KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd6b29tJykudmFsdWUpO1xuICAvLyBjYWxjdWxhdGUgbWFwIHBhcmFtZXRlcnMgaW4gbWVyY2F0b3IgcHJvamVjdGlvblxuICBtZXJjQ2VudGVyID0gbWVyYy5mb3J3YXJkKFtwYXJzZUZsb2F0KGNlbnRlclswXSkscGFyc2VGbG9hdChjZW50ZXJbMV0pXSk7XG4gIHJlcyA9IG1lcmNhdG9yTWF4UmVzL01hdGgucG93KDIsem9vbSk7XG4gIG1hcEV4dGVudCA9IHtcbiAgICBsZWZ0OiBtZXJjQ2VudGVyWzBdIC0gc2l6ZS53aWR0aC8yICogcmVzLFxuICAgIHJpZ2h0OiBtZXJjQ2VudGVyWzBdICsgc2l6ZS53aWR0aC8yICogcmVzLFxuICAgIGJvdHRvbTogbWVyY0NlbnRlclsxXSAtIHNpemUuaGVpZ2h0LzIgKiByZXMsXG4gICAgdG9wOiBtZXJjQ2VudGVyWzFdICsgc2l6ZS5oZWlnaHQvMiAqIHJlc1xuICB9O1xuICAvLyBnZXQgbWFwIHRpbGVzIGxpc3QgZm9yIG91ciBtYXAgZXh0ZW50XG4gIHRpbGVzID0gd2ViTWVyY2F0b3JUaWxlcyhtYXBFeHRlbnQsIHpvb20pO1xuICAvLyBhcHBlbmQgbWFwIHRpbGUgaW1hZ2VzIHRvIHRoZSBtYXAgZGl2XG4gIG1hcERpdi5pbm5lckhUTUwgPSBcIlwiO1xuICB0aWxlcy5mb3JFYWNoKGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gICAgaW1nLnNyYyA9IGJhc2VVUkwgKyAnLycrIHQuWiArICcvJyArIHQuWCArICcvJyArIHQuWSArICcucG5nJztcbiAgICBpbWcuc2V0QXR0cmlidXRlKCdzdHlsZScsICdsZWZ0OicrIHQubGVmdCArICdweDt0b3A6Jyt0LnRvcCsncHg7Jyk7XG4gICAgaW1nLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCd0aWxlJyk7XG4gICAgbWFwRGl2LmFwcGVuZENoaWxkKGltZyk7XG4gIH0pO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihleHRlbnQseikge1xuICAvLyB3ZWIgbWVyY2F0b3IgcHJvamVjdGlvbiBleHRlbnRcbiAgdmFyIHByb2pFeHRlbnQgPSB7XG4gICAgICBsZWZ0OiAtMjAwMzc1MDguMzQyNzg5MjQ0LFxuICAgICAgcmlnaHQ6IDIwMDM3NTA4LjM0Mjc4OTI0NCxcbiAgICAgIGJvdHRvbTogLTIwMDM3NTA4LjM0Mjc4OTI0NCxcbiAgICAgIHRvcDogMjAwMzc1MDguMzQyNzg5MjQ0XG4gICAgfSwgXG4gICAgLy90aWxlIHNlaXplXG4gICAgc2l6ZSA9IDI1NixcbiAgICAvLyByZXNvbHV0aW9uc1xuICAgIHJlcyA9IFsxNTY1NDMuMDMzOTI4MDQwOTcsIDc4MjcxLjUxNjk2NDAyMDQ4LCAzOTEzNS43NTg0ODIwMTAyNCwgMTk1NjcuODc5MjQxMDA1MTIsIDk3ODMuOTM5NjIwNTAyNTYsIDQ4OTEuOTY5ODEwMjUxMjgsIDI0NDUuOTg0OTA1MTI1NjQsIDEyMjIuOTkyNDUyNTYyODIsIDYxMS40OTYyMjYyODE0MSwgMzA1Ljc0ODExMzE0MDcwNSwgMTUyLjg3NDA1NjU3MDM1MjUsIDc2LjQzNzAyODI4NTE3NjI1LCAzOC4yMTg1MTQxNDI1ODgxMywgMTkuMTA5MjU3MDcxMjk0MDYzLCA5LjU1NDYyODUzNTY0NzAzMiwgNC43NzczMTQyNjc4MjM1MTYsIDIuMzg4NjU3MTMzOTExNzU4LCAxLjE5NDMyODU2Njk1NTg3OSwgMC41OTcxNjQyODM0Nzc5Mzk1LCAwLjI5ODU4MjE0MTczODk2OTc0LCAwLjE0OTI5MTA3MDg2OTQ4NDg3LCAwLjA3NDY0NTUzNTQzNDc0MjQ0LCAwLjAzNzMyMjc2NzcxNzM3MTIyLCAwLjAxODY2MTM4Mzg1ODY4NTYxXSxcbiAgICAvL2Nvb3JkaW5hdGVkIGluIHBpeGVsXG4gICAgbHggPSBNYXRoLmZsb29yKChleHRlbnQubGVmdCAtIHByb2pFeHRlbnQubGVmdCkvcmVzW3pdKSxcbiAgICByeCA9IE1hdGguZmxvb3IoKGV4dGVudC5yaWdodCAtIHByb2pFeHRlbnQubGVmdCkvcmVzW3pdKSxcbiAgICBieSA9IE1hdGguZmxvb3IoKHByb2pFeHRlbnQudG9wIC0gZXh0ZW50LmJvdHRvbSApL3Jlc1t6XSksXG4gICAgdHkgPSBNYXRoLmZsb29yKChwcm9qRXh0ZW50LnRvcCAtIGV4dGVudC50b3AgKS9yZXNbel0pLFxuICAgIC8vIHRpbGUgbnVtYmVyc1xuICAgIGxYID0gTWF0aC5mbG9vcihseC9zaXplKSxcbiAgICByWCA9IE1hdGguZmxvb3Iocngvc2l6ZSksXG4gICAgYlkgPSBNYXRoLmZsb29yKGJ5L3NpemUpLFxuICAgIHRZID0gTWF0aC5mbG9vcih0eS9zaXplKSxcbiAgICAvL3RvcCBsZWZ0IHRpbGUgcG9zaXRpb24gb2YgdG9wLWxlZnQgdGlsZSB3aXRoIHJlc3BlY3QgdG8gd2luZG93L2RpdiBcbiAgICB0b3AgPSB0b3BTdGFydCA9ICh0WSAqIHNpemUpIC0gdHksXG4gICAgbGVmdCA9IChsWCAqIHNpemUpIC0gbHgsXG4gICAgdGlsZXMgPSBbXTtcbiAgZm9yICh2YXIgaT1sWDsgaTw9clg7IGkrKykge1xuICAgIHRvcCA9IHRvcFN0YXJ0O1xuICAgIGZvcih2YXIgaj10WTsgajw9Ylk7IGorKykge1xuICAgICAgdGlsZXMucHVzaCh7XG4gICAgICAgIFg6aSxcbiAgICAgICAgWTpqLFxuICAgICAgICBaOnosXG4gICAgICAgIHRvcDogdG9wLFxuICAgICAgICBsZWZ0OiBsZWZ0XG4gICAgICB9KTtcbiAgICAgIHRvcCArPXNpemU7XG4gICAgfVxuICAgIGxlZnQgKz1zaXplO1xuICB9XG4gIHJldHVybiB0aWxlcztcbn07XG4iXX0=
