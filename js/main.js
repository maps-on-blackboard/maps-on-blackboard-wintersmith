var $ = require('jquery'),
  geojson2svg = require('geojson2svg'),
  reproject = require('reproject-spherical-mercator'),
  parseSVG = require('parse-svg'),
  extendGeoJSON = require('extend-geojson-properties'),
  emptyMap = require('emptymap.js'),
  Hammer = require('hammerjs'), 
  vp, size, emap; 

vp = document.getElementById('viewPort');
size = {width: vp.offsetWidth, height: vp.offsetHeight};
emap = new emptyMap(size);
emap.setView({
  view: {"center":[1104009.9356444478,4736381.1012214925],"zoom":2,"rotation":-20},
  callback: function(err,state) {
    if(err) {
      console.log('setview err: '+ err);
      return;
    }
    var svgLayer = document.getElementById('worldpop');
    svgLayer.setAttribute('transform', 'matrix('+state.matrix.join(', ')+')');
    //show maps current view above map
    document.getElementById('viewJSON').innerHTML = JSON.stringify(
      state.map.getView(),null, 2);
    // get countires geojson data and population data
    $.when(
      $.getJSON('./data/countries.geo.json'),
      $.getJSON('./data/population.json')
    ).then(drawGeoJSON, function() {
      console.log('data not found');
    })
  }
});
function getEventCenterPx(ev) {
  var viewPort = document.getElementById('viewPort');
  return [
    ev.center.x - viewPort.getBoundingClientRect().left,
    ev.center.y - viewPort.getBoundingClientRect().top];
}

function handleMapState(err,state) {
  if(err) {
    console.log('map state error: '+ err);
    return;
  }
  var svgLayer = document.getElementById('worldpop');
  svgLayer.setAttribute('transform','matrix('+state.matrix.join(', ')+')');
  //show maps current view above map
  document.getElementById('viewJSON').innerHTML = JSON.stringify(
    state.map.getView(),null, 2);
}

// now lets pan the map
var viewPort = document.getElementById('viewPort');
var mc = new Hammer.Manager(viewPort);
mc.add( new Hammer.Pan({ 
  direction: Hammer.DIRECTION_ALL, 
  threshold: 0,
  pointers: 1,
  preventDefault: true 
}) );
var lastDelta = {x: 0, y: 0};
mc.on('panstart', function(ev) {
  console.log('panstart');
  lastDelta = {x: 0, y: 0};
});
mc.on('pan', function(ev) {
  var cont = document.getElementById('container');
  emap.applyDeltaMove({
    deltaX: ev.deltaX - lastDelta.x,
    deltaY: ev.deltaY - lastDelta.y,
    callback: handleMapState
  });
  lastDelta.x = ev.deltaX;
  lastDelta.y = ev.deltaY;
});

// now zoom in
mc.add(new Hammer.Tap({event: 'doubletap',taps: 2}));
mc.on('doubletap', handleDoubleTap);
function handleDoubleTap(ev) {
  console.log('doubletapped');
  var tapX = ev.center.x - viewPort.getBoundingClientRect().left;
  var tapY = ev.center.y - viewPort.getBoundingClientRect().top;
  emap.applyDeltaScaleRotation({
    position: [tapX, tapY],
    factor: 2,
    callback: handleMapState
  });
}
// here we go with pinch and rotate
var pinch = new Hammer.Pinch();
var rotate = new Hammer.Rotate(
  {event:'rotate',pointers:2,threshold: 0});
pinch.recognizeWith(rotate);
mc.add(pinch);
mc.add(rotate);
var lastScale;
mc.on('pinchstart', function(ev) {
  console.log('pinchstart');
  lastScale = ev.scale;
});
mc.on('pinchmove', function(ev) {
  var curFactor = ev.scale/lastScale;
  emap.applyDeltaScaleRotation({
    position: getEventCenterPx(ev),
    factor: curFactor,
    callback: handleMapState
  });
  lastScale = ev.scale;
});
var lastRot;
mc.on('rotatestart', function(ev) {
  console.log('rotate start');
  lastRot = 0; 
});
mc.on('rotatemove', function (ev) {
    var center = getEventCenterPx(ev,ev.center);
    var cont = document.getElementById('container'); 
    emap.applyDeltaScaleRotation({
      position: center,
      scale: 1, 
      rotation: ev.rotation - lastRot,
      callback: handleMapState
    });
    lastRot = ev.rotation;
});

$('#zoomin').on('click', function() {
  emap.applyDeltaScaleRotation({
    factor: 2,
    callback: handleMapState
  });
});
$('#zoomout').on('click', function() {
  emap.applyDeltaScaleRotation({
    factor: 0.5,
    callback: handleMapState
  });
});

function drawGeoJSON(respGeojson,respPopulation) {
  var geojson = {type: 'FeatureCollection',
    features: respGeojson[0].features.map(function(f) {
      return reproject(f);})
    },
    population = respPopulation[0];

  // extend geojson properties with country's population
  var joinMap = {
    geoKey: 'properties.name',
    dataKey: 'countryName'
  };
  extendGeoJSON(geojson,population.countries,joinMap);

  // get the width and height of svg element.
  // as the width of the map container is 100%, we have to set the width and 
  // height of the svgElement as per the current width/height of the container.
  var container = document.getElementById('mapArea'),
    width = container.offsetWidth,
    svgMap = document.getElementById('map');
    svgLayer = document.getElementById('worldpop');
  // initiate geojson2svg 
  var convertor = geojson2svg();
  // process every feature
  geojson.features.forEach(function(f) {
    var popCat, svgString, svg;
    if (f.properties.population <= 30000000) {
      popCat = 'low';
    } else if ( f.properties.population > 30000000 
    && f.properties.population <= 60000000) {
      popCat = 'medium';
    } else {
      popCat = 'high';
    }
    svgString = convertor.convert(
      f,
      {attributes: {'class': popCat,"vector-effect": "non-scaling-stroke"}});
    svg = parseSVG(svgString);
    svgLayer.appendChild(svg);
  });
}
