(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var webMercatorTiles = require('web-mercator-tiles'),
  SphericalMercator = require('sphericalmercator'),
  baseURL = 'http://tile.openstreetmap.org',
  mercatorMaxRes = 156543.03392804097,
  mapDiv, size;
// get map window size
mapDiv = document.getElementById('map');
size = {
  height: parseInt(mapDiv.clientHeight),
  width: parseInt(mapDiv.clientWidth)
};
// projection tranformer instace
merc = new SphericalMercator({size:256});
// add event listenre to 'zoomTo' button 
document.getElementById('zoomTo').addEventListener('click', zoomTo);
// call zoomTo funcion on page load
zoomTo();

function zoomTo() {
  var center = document.getElementById('center').value.split(','),
    zoom =  parseInt(document.getElementById('zoom').value),
    mercCenter, mapExtent, res, tiles;
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

},{"sphericalmercator":2,"web-mercator-tiles":3}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9tYWluLmpzIiwibm9kZV9tb2R1bGVzL3NwaGVyaWNhbG1lcmNhdG9yL3NwaGVyaWNhbG1lcmNhdG9yLmpzIiwibm9kZV9tb2R1bGVzL3dlYi1tZXJjYXRvci10aWxlcy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHdlYk1lcmNhdG9yVGlsZXMgPSByZXF1aXJlKCd3ZWItbWVyY2F0b3ItdGlsZXMnKSxcbiAgU3BoZXJpY2FsTWVyY2F0b3IgPSByZXF1aXJlKCdzcGhlcmljYWxtZXJjYXRvcicpLFxuICBiYXNlVVJMID0gJ2h0dHA6Ly90aWxlLm9wZW5zdHJlZXRtYXAub3JnJyxcbiAgbWVyY2F0b3JNYXhSZXMgPSAxNTY1NDMuMDMzOTI4MDQwOTcsXG4gIG1hcERpdiwgc2l6ZTtcbi8vIGdldCBtYXAgd2luZG93IHNpemVcbm1hcERpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAnKTtcbnNpemUgPSB7XG4gIGhlaWdodDogcGFyc2VJbnQobWFwRGl2LmNsaWVudEhlaWdodCksXG4gIHdpZHRoOiBwYXJzZUludChtYXBEaXYuY2xpZW50V2lkdGgpXG59O1xuLy8gcHJvamVjdGlvbiB0cmFuZm9ybWVyIGluc3RhY2Vcbm1lcmMgPSBuZXcgU3BoZXJpY2FsTWVyY2F0b3Ioe3NpemU6MjU2fSk7XG4vLyBhZGQgZXZlbnQgbGlzdGVucmUgdG8gJ3pvb21UbycgYnV0dG9uIFxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb21UbycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgem9vbVRvKTtcbi8vIGNhbGwgem9vbVRvIGZ1bmNpb24gb24gcGFnZSBsb2FkXG56b29tVG8oKTtcblxuZnVuY3Rpb24gem9vbVRvKCkge1xuICB2YXIgY2VudGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NlbnRlcicpLnZhbHVlLnNwbGl0KCcsJyksXG4gICAgem9vbSA9ICBwYXJzZUludChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbScpLnZhbHVlKSxcbiAgICBtZXJjQ2VudGVyLCBtYXBFeHRlbnQsIHJlcywgdGlsZXM7XG4gIC8vIGNhbGN1bGF0ZSBtYXAgcGFyYW1ldGVycyBpbiBtZXJjYXRvciBwcm9qZWN0aW9uXG4gIG1lcmNDZW50ZXIgPSBtZXJjLmZvcndhcmQoW3BhcnNlRmxvYXQoY2VudGVyWzBdKSxwYXJzZUZsb2F0KGNlbnRlclsxXSldKTtcbiAgcmVzID0gbWVyY2F0b3JNYXhSZXMvTWF0aC5wb3coMix6b29tKTtcbiAgbWFwRXh0ZW50ID0ge1xuICAgIGxlZnQ6IG1lcmNDZW50ZXJbMF0gLSBzaXplLndpZHRoLzIgKiByZXMsXG4gICAgcmlnaHQ6IG1lcmNDZW50ZXJbMF0gKyBzaXplLndpZHRoLzIgKiByZXMsXG4gICAgYm90dG9tOiBtZXJjQ2VudGVyWzFdIC0gc2l6ZS5oZWlnaHQvMiAqIHJlcyxcbiAgICB0b3A6IG1lcmNDZW50ZXJbMV0gKyBzaXplLmhlaWdodC8yICogcmVzXG4gIH07XG4gIC8vIGdldCBtYXAgdGlsZXMgbGlzdCBmb3Igb3VyIG1hcCBleHRlbnRcbiAgdGlsZXMgPSB3ZWJNZXJjYXRvclRpbGVzKG1hcEV4dGVudCwgem9vbSk7XG4gIC8vIGFwcGVuZCBtYXAgdGlsZSBpbWFnZXMgdG8gdGhlIG1hcCBkaXZcbiAgbWFwRGl2LmlubmVySFRNTCA9IFwiXCI7XG4gIHRpbGVzLmZvckVhY2goZnVuY3Rpb24odCkge1xuICAgIHZhciBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbiAgICBpbWcuc3JjID0gYmFzZVVSTCArICcvJysgdC5aICsgJy8nICsgdC5YICsgJy8nICsgdC5ZICsgJy5wbmcnO1xuICAgIGltZy5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2xlZnQ6JysgdC5sZWZ0ICsgJ3B4O3RvcDonK3QudG9wKydweDsnKTtcbiAgICBpbWcuc2V0QXR0cmlidXRlKCdjbGFzcycsJ3RpbGUnKTtcbiAgICBtYXBEaXYuYXBwZW5kQ2hpbGQoaW1nKTtcbiAgfSk7XG59XG4iLCJ2YXIgU3BoZXJpY2FsTWVyY2F0b3IgPSAoZnVuY3Rpb24oKXtcblxuLy8gQ2xvc3VyZXMgaW5jbHVkaW5nIGNvbnN0YW50cyBhbmQgb3RoZXIgcHJlY2FsY3VsYXRlZCB2YWx1ZXMuXG52YXIgY2FjaGUgPSB7fSxcbiAgICBFUFNMTiA9IDEuMGUtMTAsXG4gICAgRDJSID0gTWF0aC5QSSAvIDE4MCxcbiAgICBSMkQgPSAxODAgLyBNYXRoLlBJLFxuICAgIC8vIDkwMDkxMyBwcm9wZXJ0aWVzLlxuICAgIEEgPSA2Mzc4MTM3LjAsXG4gICAgTUFYRVhURU5UID0gMjAwMzc1MDguMzQyNzg5MjQ0O1xuXG5cbi8vIFNwaGVyaWNhbE1lcmNhdG9yIGNvbnN0cnVjdG9yOiBwcmVjYWNoZXMgY2FsY3VsYXRpb25zXG4vLyBmb3IgZmFzdCB0aWxlIGxvb2t1cHMuXG5mdW5jdGlvbiBTcGhlcmljYWxNZXJjYXRvcihvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdGhpcy5zaXplID0gb3B0aW9ucy5zaXplIHx8IDI1NjtcbiAgICBpZiAoIWNhY2hlW3RoaXMuc2l6ZV0pIHtcbiAgICAgICAgdmFyIHNpemUgPSB0aGlzLnNpemU7XG4gICAgICAgIHZhciBjID0gY2FjaGVbdGhpcy5zaXplXSA9IHt9O1xuICAgICAgICBjLkJjID0gW107XG4gICAgICAgIGMuQ2MgPSBbXTtcbiAgICAgICAgYy56YyA9IFtdO1xuICAgICAgICBjLkFjID0gW107XG4gICAgICAgIGZvciAodmFyIGQgPSAwOyBkIDwgMzA7IGQrKykge1xuICAgICAgICAgICAgYy5CYy5wdXNoKHNpemUgLyAzNjApO1xuICAgICAgICAgICAgYy5DYy5wdXNoKHNpemUgLyAoMiAqIE1hdGguUEkpKTtcbiAgICAgICAgICAgIGMuemMucHVzaChzaXplIC8gMik7XG4gICAgICAgICAgICBjLkFjLnB1c2goc2l6ZSk7XG4gICAgICAgICAgICBzaXplICo9IDI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5CYyA9IGNhY2hlW3RoaXMuc2l6ZV0uQmM7XG4gICAgdGhpcy5DYyA9IGNhY2hlW3RoaXMuc2l6ZV0uQ2M7XG4gICAgdGhpcy56YyA9IGNhY2hlW3RoaXMuc2l6ZV0uemM7XG4gICAgdGhpcy5BYyA9IGNhY2hlW3RoaXMuc2l6ZV0uQWM7XG59O1xuXG4vLyBDb252ZXJ0IGxvbiBsYXQgdG8gc2NyZWVuIHBpeGVsIHZhbHVlXG4vL1xuLy8gLSBgbGxgIHtBcnJheX0gYFtsb24sIGxhdF1gIGFycmF5IG9mIGdlb2dyYXBoaWMgY29vcmRpbmF0ZXMuXG4vLyAtIGB6b29tYCB7TnVtYmVyfSB6b29tIGxldmVsLlxuU3BoZXJpY2FsTWVyY2F0b3IucHJvdG90eXBlLnB4ID0gZnVuY3Rpb24obGwsIHpvb20pIHtcbiAgICB2YXIgZCA9IHRoaXMuemNbem9vbV07XG4gICAgdmFyIGYgPSBNYXRoLm1pbihNYXRoLm1heChNYXRoLnNpbihEMlIgKiBsbFsxXSksIC0wLjk5OTkpLCAwLjk5OTkpO1xuICAgIHZhciB4ID0gTWF0aC5yb3VuZChkICsgbGxbMF0gKiB0aGlzLkJjW3pvb21dKTtcbiAgICB2YXIgeSA9IE1hdGgucm91bmQoZCArIDAuNSAqIE1hdGgubG9nKCgxICsgZikgLyAoMSAtIGYpKSAqICgtdGhpcy5DY1t6b29tXSkpO1xuICAgICh4ID4gdGhpcy5BY1t6b29tXSkgJiYgKHggPSB0aGlzLkFjW3pvb21dKTtcbiAgICAoeSA+IHRoaXMuQWNbem9vbV0pICYmICh5ID0gdGhpcy5BY1t6b29tXSk7XG4gICAgLy8oeCA8IDApICYmICh4ID0gMCk7XG4gICAgLy8oeSA8IDApICYmICh5ID0gMCk7XG4gICAgcmV0dXJuIFt4LCB5XTtcbn07XG5cbi8vIENvbnZlcnQgc2NyZWVuIHBpeGVsIHZhbHVlIHRvIGxvbiBsYXRcbi8vXG4vLyAtIGBweGAge0FycmF5fSBgW3gsIHldYCBhcnJheSBvZiBnZW9ncmFwaGljIGNvb3JkaW5hdGVzLlxuLy8gLSBgem9vbWAge051bWJlcn0gem9vbSBsZXZlbC5cblNwaGVyaWNhbE1lcmNhdG9yLnByb3RvdHlwZS5sbCA9IGZ1bmN0aW9uKHB4LCB6b29tKSB7XG4gICAgdmFyIGcgPSAocHhbMV0gLSB0aGlzLnpjW3pvb21dKSAvICgtdGhpcy5DY1t6b29tXSk7XG4gICAgdmFyIGxvbiA9IChweFswXSAtIHRoaXMuemNbem9vbV0pIC8gdGhpcy5CY1t6b29tXTtcbiAgICB2YXIgbGF0ID0gUjJEICogKDIgKiBNYXRoLmF0YW4oTWF0aC5leHAoZykpIC0gMC41ICogTWF0aC5QSSk7XG4gICAgcmV0dXJuIFtsb24sIGxhdF07XG59O1xuXG4vLyBDb252ZXJ0IHRpbGUgeHl6IHZhbHVlIHRvIGJib3ggb2YgdGhlIGZvcm0gYFt3LCBzLCBlLCBuXWBcbi8vXG4vLyAtIGB4YCB7TnVtYmVyfSB4IChsb25naXR1ZGUpIG51bWJlci5cbi8vIC0gYHlgIHtOdW1iZXJ9IHkgKGxhdGl0dWRlKSBudW1iZXIuXG4vLyAtIGB6b29tYCB7TnVtYmVyfSB6b29tLlxuLy8gLSBgdG1zX3N0eWxlYCB7Qm9vbGVhbn0gd2hldGhlciB0byBjb21wdXRlIHVzaW5nIHRtcy1zdHlsZS5cbi8vIC0gYHNyc2Age1N0cmluZ30gcHJvamVjdGlvbiBmb3IgcmVzdWx0aW5nIGJib3ggKFdHUzg0fDkwMDkxMykuXG4vLyAtIGByZXR1cm5gIHtBcnJheX0gYmJveCBhcnJheSBvZiB2YWx1ZXMgaW4gZm9ybSBgW3csIHMsIGUsIG5dYC5cblNwaGVyaWNhbE1lcmNhdG9yLnByb3RvdHlwZS5iYm94ID0gZnVuY3Rpb24oeCwgeSwgem9vbSwgdG1zX3N0eWxlLCBzcnMpIHtcbiAgICAvLyBDb252ZXJ0IHh5eiBpbnRvIGJib3ggd2l0aCBzcnMgV0dTODRcbiAgICBpZiAodG1zX3N0eWxlKSB7XG4gICAgICAgIHkgPSAoTWF0aC5wb3coMiwgem9vbSkgLSAxKSAtIHk7XG4gICAgfVxuICAgIC8vIFVzZSAreSB0byBtYWtlIHN1cmUgaXQncyBhIG51bWJlciB0byBhdm9pZCBpbmFkdmVydGVudCBjb25jYXRlbmF0aW9uLlxuICAgIHZhciBsbCA9IFt4ICogdGhpcy5zaXplLCAoK3kgKyAxKSAqIHRoaXMuc2l6ZV07IC8vIGxvd2VyIGxlZnRcbiAgICAvLyBVc2UgK3ggdG8gbWFrZSBzdXJlIGl0J3MgYSBudW1iZXIgdG8gYXZvaWQgaW5hZHZlcnRlbnQgY29uY2F0ZW5hdGlvbi5cbiAgICB2YXIgdXIgPSBbKCt4ICsgMSkgKiB0aGlzLnNpemUsIHkgKiB0aGlzLnNpemVdOyAvLyB1cHBlciByaWdodFxuICAgIHZhciBiYm94ID0gdGhpcy5sbChsbCwgem9vbSkuY29uY2F0KHRoaXMubGwodXIsIHpvb20pKTtcblxuICAgIC8vIElmIHdlYiBtZXJjYXRvciByZXF1ZXN0ZWQgcmVwcm9qZWN0IHRvIDkwMDkxMy5cbiAgICBpZiAoc3JzID09PSAnOTAwOTEzJykge1xuICAgICAgICByZXR1cm4gdGhpcy5jb252ZXJ0KGJib3gsICc5MDA5MTMnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYmJveDtcbiAgICB9XG59O1xuXG4vLyBDb252ZXJ0IGJib3ggdG8geHl4IGJvdW5kc1xuLy9cbi8vIC0gYGJib3hgIHtOdW1iZXJ9IGJib3ggaW4gdGhlIGZvcm0gYFt3LCBzLCBlLCBuXWAuXG4vLyAtIGB6b29tYCB7TnVtYmVyfSB6b29tLlxuLy8gLSBgdG1zX3N0eWxlYCB7Qm9vbGVhbn0gd2hldGhlciB0byBjb21wdXRlIHVzaW5nIHRtcy1zdHlsZS5cbi8vIC0gYHNyc2Age1N0cmluZ30gcHJvamVjdGlvbiBvZiBpbnB1dCBiYm94IChXR1M4NHw5MDA5MTMpLlxuLy8gLSBgQHJldHVybmAge09iamVjdH0gWFlaIGJvdW5kcyBjb250YWluaW5nIG1pblgsIG1heFgsIG1pblksIG1heFkgcHJvcGVydGllcy5cblNwaGVyaWNhbE1lcmNhdG9yLnByb3RvdHlwZS54eXogPSBmdW5jdGlvbihiYm94LCB6b29tLCB0bXNfc3R5bGUsIHNycykge1xuICAgIC8vIElmIHdlYiBtZXJjYXRvciBwcm92aWRlZCByZXByb2plY3QgdG8gV0dTODQuXG4gICAgaWYgKHNycyA9PT0gJzkwMDkxMycpIHtcbiAgICAgICAgYmJveCA9IHRoaXMuY29udmVydChiYm94LCAnV0dTODQnKTtcbiAgICB9XG5cbiAgICB2YXIgbGwgPSBbYmJveFswXSwgYmJveFsxXV07IC8vIGxvd2VyIGxlZnRcbiAgICB2YXIgdXIgPSBbYmJveFsyXSwgYmJveFszXV07IC8vIHVwcGVyIHJpZ2h0XG4gICAgdmFyIHB4X2xsID0gdGhpcy5weChsbCwgem9vbSk7XG4gICAgdmFyIHB4X3VyID0gdGhpcy5weCh1ciwgem9vbSk7XG4gICAgLy8gWSA9IDAgZm9yIFhZWiBpcyB0aGUgdG9wIGhlbmNlIG1pblkgdXNlcyBweF91clsxXS5cbiAgICB2YXIgYm91bmRzID0ge1xuICAgICAgICBtaW5YOiBNYXRoLmZsb29yKHB4X2xsWzBdIC8gdGhpcy5zaXplKSxcbiAgICAgICAgbWluWTogTWF0aC5mbG9vcihweF91clsxXSAvIHRoaXMuc2l6ZSksXG4gICAgICAgIG1heFg6IE1hdGguZmxvb3IoKHB4X3VyWzBdIC0gMSkgLyB0aGlzLnNpemUpLFxuICAgICAgICBtYXhZOiBNYXRoLmZsb29yKChweF9sbFsxXSAtIDEpIC8gdGhpcy5zaXplKVxuICAgIH07XG4gICAgaWYgKHRtc19zdHlsZSkge1xuICAgICAgICB2YXIgdG1zID0ge1xuICAgICAgICAgICAgbWluWTogKE1hdGgucG93KDIsIHpvb20pIC0gMSkgLSBib3VuZHMubWF4WSxcbiAgICAgICAgICAgIG1heFk6IChNYXRoLnBvdygyLCB6b29tKSAtIDEpIC0gYm91bmRzLm1pbllcbiAgICAgICAgfTtcbiAgICAgICAgYm91bmRzLm1pblkgPSB0bXMubWluWTtcbiAgICAgICAgYm91bmRzLm1heFkgPSB0bXMubWF4WTtcbiAgICB9XG4gICAgcmV0dXJuIGJvdW5kcztcbn07XG5cbi8vIENvbnZlcnQgcHJvamVjdGlvbiBvZiBnaXZlbiBiYm94LlxuLy9cbi8vIC0gYGJib3hgIHtOdW1iZXJ9IGJib3ggaW4gdGhlIGZvcm0gYFt3LCBzLCBlLCBuXWAuXG4vLyAtIGB0b2Age1N0cmluZ30gcHJvamVjdGlvbiBvZiBvdXRwdXQgYmJveCAoV0dTODR8OTAwOTEzKS4gSW5wdXQgYmJveFxuLy8gICBhc3N1bWVkIHRvIGJlIHRoZSBcIm90aGVyXCIgcHJvamVjdGlvbi5cbi8vIC0gYEByZXR1cm5gIHtPYmplY3R9IGJib3ggd2l0aCByZXByb2plY3RlZCBjb29yZGluYXRlcy5cblNwaGVyaWNhbE1lcmNhdG9yLnByb3RvdHlwZS5jb252ZXJ0ID0gZnVuY3Rpb24oYmJveCwgdG8pIHtcbiAgICBpZiAodG8gPT09ICc5MDA5MTMnKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZvcndhcmQoYmJveC5zbGljZSgwLCAyKSkuY29uY2F0KHRoaXMuZm9yd2FyZChiYm94LnNsaWNlKDIsNCkpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5pbnZlcnNlKGJib3guc2xpY2UoMCwgMikpLmNvbmNhdCh0aGlzLmludmVyc2UoYmJveC5zbGljZSgyLDQpKSk7XG4gICAgfVxufTtcblxuLy8gQ29udmVydCBsb24vbGF0IHZhbHVlcyB0byA5MDA5MTMgeC95LlxuU3BoZXJpY2FsTWVyY2F0b3IucHJvdG90eXBlLmZvcndhcmQgPSBmdW5jdGlvbihsbCkge1xuICAgIHZhciB4eSA9IFtcbiAgICAgICAgQSAqIGxsWzBdICogRDJSLFxuICAgICAgICBBICogTWF0aC5sb2coTWF0aC50YW4oKE1hdGguUEkqMC4yNSkgKyAoMC41ICogbGxbMV0gKiBEMlIpKSlcbiAgICBdO1xuICAgIC8vIGlmIHh5IHZhbHVlIGlzIGJleW9uZCBtYXhleHRlbnQgKGUuZy4gcG9sZXMpLCByZXR1cm4gbWF4ZXh0ZW50LlxuICAgICh4eVswXSA+IE1BWEVYVEVOVCkgJiYgKHh5WzBdID0gTUFYRVhURU5UKTtcbiAgICAoeHlbMF0gPCAtTUFYRVhURU5UKSAmJiAoeHlbMF0gPSAtTUFYRVhURU5UKTtcbiAgICAoeHlbMV0gPiBNQVhFWFRFTlQpICYmICh4eVsxXSA9IE1BWEVYVEVOVCk7XG4gICAgKHh5WzFdIDwgLU1BWEVYVEVOVCkgJiYgKHh5WzFdID0gLU1BWEVYVEVOVCk7XG4gICAgcmV0dXJuIHh5O1xufTtcblxuLy8gQ29udmVydCA5MDA5MTMgeC95IHZhbHVlcyB0byBsb24vbGF0LlxuU3BoZXJpY2FsTWVyY2F0b3IucHJvdG90eXBlLmludmVyc2UgPSBmdW5jdGlvbih4eSkge1xuICAgIHJldHVybiBbXG4gICAgICAgICh4eVswXSAqIFIyRCAvIEEpLFxuICAgICAgICAoKE1hdGguUEkqMC41KSAtIDIuMCAqIE1hdGguYXRhbihNYXRoLmV4cCgteHlbMV0gLyBBKSkpICogUjJEXG4gICAgXTtcbn07XG5cbnJldHVybiBTcGhlcmljYWxNZXJjYXRvcjtcblxufSkoKTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IFNwaGVyaWNhbE1lcmNhdG9yO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihleHRlbnQseikge1xuICAvLyB3ZWIgbWVyY2F0b3IgcHJvamVjdGlvbiBleHRlbnRcbiAgdmFyIHByb2pFeHRlbnQgPSB7XG4gICAgICBsZWZ0OiAtMjAwMzc1MDguMzQyNzg5MjQ0LFxuICAgICAgcmlnaHQ6IDIwMDM3NTA4LjM0Mjc4OTI0NCxcbiAgICAgIGJvdHRvbTogLTIwMDM3NTA4LjM0Mjc4OTI0NCxcbiAgICAgIHRvcDogMjAwMzc1MDguMzQyNzg5MjQ0XG4gICAgfSwgXG4gICAgLy90aWxlIHNlaXplXG4gICAgc2l6ZSA9IDI1NixcbiAgICAvLyByZXNvbHV0aW9uc1xuICAgIHJlcyA9IFsxNTY1NDMuMDMzOTI4MDQwOTcsIDc4MjcxLjUxNjk2NDAyMDQ4LCAzOTEzNS43NTg0ODIwMTAyNCwgMTk1NjcuODc5MjQxMDA1MTIsIDk3ODMuOTM5NjIwNTAyNTYsIDQ4OTEuOTY5ODEwMjUxMjgsIDI0NDUuOTg0OTA1MTI1NjQsIDEyMjIuOTkyNDUyNTYyODIsIDYxMS40OTYyMjYyODE0MSwgMzA1Ljc0ODExMzE0MDcwNSwgMTUyLjg3NDA1NjU3MDM1MjUsIDc2LjQzNzAyODI4NTE3NjI1LCAzOC4yMTg1MTQxNDI1ODgxMywgMTkuMTA5MjU3MDcxMjk0MDYzLCA5LjU1NDYyODUzNTY0NzAzMiwgNC43NzczMTQyNjc4MjM1MTYsIDIuMzg4NjU3MTMzOTExNzU4LCAxLjE5NDMyODU2Njk1NTg3OSwgMC41OTcxNjQyODM0Nzc5Mzk1LCAwLjI5ODU4MjE0MTczODk2OTc0LCAwLjE0OTI5MTA3MDg2OTQ4NDg3LCAwLjA3NDY0NTUzNTQzNDc0MjQ0LCAwLjAzNzMyMjc2NzcxNzM3MTIyLCAwLjAxODY2MTM4Mzg1ODY4NTYxXSxcbiAgICAvL2Nvb3JkaW5hdGVkIGluIHBpeGVsXG4gICAgbHggPSBNYXRoLmZsb29yKChleHRlbnQubGVmdCAtIHByb2pFeHRlbnQubGVmdCkvcmVzW3pdKSxcbiAgICByeCA9IE1hdGguZmxvb3IoKGV4dGVudC5yaWdodCAtIHByb2pFeHRlbnQubGVmdCkvcmVzW3pdKSxcbiAgICBieSA9IE1hdGguZmxvb3IoKHByb2pFeHRlbnQudG9wIC0gZXh0ZW50LmJvdHRvbSApL3Jlc1t6XSksXG4gICAgdHkgPSBNYXRoLmZsb29yKChwcm9qRXh0ZW50LnRvcCAtIGV4dGVudC50b3AgKS9yZXNbel0pLFxuICAgIC8vIHRpbGUgbnVtYmVyc1xuICAgIGxYID0gTWF0aC5mbG9vcihseC9zaXplKSxcbiAgICByWCA9IE1hdGguZmxvb3Iocngvc2l6ZSksXG4gICAgYlkgPSBNYXRoLmZsb29yKGJ5L3NpemUpLFxuICAgIHRZID0gTWF0aC5mbG9vcih0eS9zaXplKSxcbiAgICAvL3RvcCBsZWZ0IHRpbGUgcG9zaXRpb24gb2YgdG9wLWxlZnQgdGlsZSB3aXRoIHJlc3BlY3QgdG8gd2luZG93L2RpdiBcbiAgICB0b3AgPSB0b3BTdGFydCA9ICh0WSAqIHNpemUpIC0gdHksXG4gICAgbGVmdCA9IChsWCAqIHNpemUpIC0gbHgsXG4gICAgdGlsZXMgPSBbXTtcbiAgZm9yICh2YXIgaT1sWDsgaTw9clg7IGkrKykge1xuICAgIHRvcCA9IHRvcFN0YXJ0O1xuICAgIGZvcih2YXIgaj10WTsgajw9Ylk7IGorKykge1xuICAgICAgdGlsZXMucHVzaCh7XG4gICAgICAgIFg6aSxcbiAgICAgICAgWTpqLFxuICAgICAgICBaOnosXG4gICAgICAgIHRvcDogdG9wLFxuICAgICAgICBsZWZ0OiBsZWZ0XG4gICAgICB9KTtcbiAgICAgIHRvcCArPXNpemU7XG4gICAgfVxuICAgIGxlZnQgKz1zaXplO1xuICB9XG4gIHJldHVybiB0aWxlcztcbn07XG4iXX0=
