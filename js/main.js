var $ = require('jquery'),
  geojson2svg = require('geojson2svg'),
  reproject = require('reproject-spherical-mercator'),
  parseSVG = require('parse-svg'),
  extendGeoJSON = require('extend-geojson-properties'),
  emptyMap = require('emptymap.js'),
  mapTheTiles = require('map-the-tiles'),
  Hammer = require('hammerjs'), 
  vp, size, emap; 

vp = document.querySelector('.rt-viewport');
size = {width: vp.offsetWidth, height: vp.offsetHeight};
emap = new emptyMap(size);
emap.setView({
  view: {"center":[1104009.9356444478,4736381.1012214925],"zoom":2,"rotation":-20},
  callback: function(err,state) {
    if(err) {
      console.log('setview err: '+ err);
      return;
    }
    var svgLayer = document.querySelector('.rt-svg-stack');
    svgLayer.setAttribute('transform', 'matrix('+state.matrix.join(', ')+')');
    // loadTiles for current view 
    var mapDiv = document.querySelector('.rt-map');
    tiler = new mapTheTiles(
      {width: mapDiv.clientWidth, height: mapDiv.clientHeight});
    loadTiles(state.map.getView(), state.tileMatrix,'osm');
    // show maps current view above map
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

/*---- stop dragging of tiles ----*/
//  domDelegate = require('dom-delegate'),
// as images are loaded dynamicaly delegate event on class .tile
// http://davidwalsh.name/event-delegate
// or use the module:
// https://github.com/ftlabs/ftdomdelegate
//var delegate = new domDelegate.Delegate(document.getElementById('viewPort'));
//delegate.on('dragstart','.tile',function() {return false;});
/*---- stop dragging of tiles ----*/

function getEventCenterPx(ev) {
  var viewPort = document.querySelector('.rt-viewport');
  return [
    ev.center.x - viewPort.getBoundingClientRect().left,
    ev.center.y - viewPort.getBoundingClientRect().top];
}

function handleMapState(err,state,refreshTiles) {
  if(err) {
    console.log('map state error: '+ err);
    return;
  }
  var svgLayer = document.querySelector('.rt-svg-stack');
  svgLayer.setAttribute('transform','matrix('+state.matrix.join(', ')+')');
  var cont = document.querySelector('.rt-nonscalable-stack');
  cont.style.transform = 'matrix('+ state.tileMatrix.join(',') + ')';
  if (refreshTiles) {
    emap.resetTileMatrix({
      callback: function(err, state) {
        loadTiles(state.map.getView(), state.tileMatrix,'osm');
      }
    });
  }
  //show maps current view above map
  document.getElementById('viewJSON').innerHTML = JSON.stringify(
    state.map.getView(),null, 2);
}

// now lets pan the map
var viewPort = document.querySelector('.rt-viewport');
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
  emap.applyDeltaMove({
    deltaX: ev.deltaX - lastDelta.x,
    deltaY: ev.deltaY - lastDelta.y,
    callback: handleMapState
  });
  lastDelta.x = ev.deltaX;
  lastDelta.y = ev.deltaY;
});
mc.on('panend',function(ev) {
  console.log('panend');
  emap.resetTileMatrix({
    callback: function(err, state) {
      loadTiles(state.map.getView(), state.tileMatrix,'osm');
    }
  });
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
    callback: function(err,state) {
      handleMapState(err,state,true);
    }
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
mc.on('pinchend', function(ev) {
  console.log('pinchend');
  var view = emap.getView();
  console.log('nearest zoom: '+ emap.getNearestZoom());
  view.zoom = emap.getNearestZoom();
  emap.setView({
    view: view,
    callback: function(err, state) {
      var svgLayer = document.querySelector('.rt-svg-stack');
      svgLayer.setAttribute('transform','matrix('+state.matrix.join(', ')+')');
      loadTiles(state.map.getView(), state.tileMatrix,'osm');
      //show maps current view above map
      document.getElementById('viewJSON').innerHTML = JSON.stringify(
      state.map.getView(),null, 2);
    }
  });
});

var lastRot;
mc.on('rotatestart', function(ev) {
  console.log('rotate start');
  lastRot = 0; 
});
mc.on('rotatemove', function (ev) {
    var center = getEventCenterPx(ev,ev.center);
    emap.applyDeltaScaleRotation({
      position: center,
      scale: 1, 
      rotation: ev.rotation - lastRot,
      callback: handleMapState
    });
    lastRot = ev.rotation;
});
/*mc.on('rotateend', function(ev) {
  console.log('rotateend');
  emap.resetTileMatrix({
    callback: function(err, state) {
      loadTiles(state.map.getView(), state.tileMatrix,'osm');
    }
  });
});*/

$('#zoomin').on('click', function() {
  emap.applyDeltaScaleRotation({
    factor: 2,
    callback: function(err, state) {
      handleMapState(err,state,true);
    }
  });
});
$('#zoomout').on('click', function() {
  emap.applyDeltaScaleRotation({
    factor: 0.5,
    callback: function(err, state) {
      handleMapState(err,state,true);
    }
  });
});
$('#clockwise').on('click', function() {
  emap.applyDeltaScaleRotation({
    rotation: 15,
    callback: function(err, state) {
      handleMapState(err,state,true);
    }
  });
});
$('#anticlockwise').on('click', function() {
  emap.applyDeltaScaleRotation({
    rotation: -15,
    callback: function(err, state) {
      handleMapState(err,state,true);
    }
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
  var mapDiv = document.querySelector('.rt-map'),
    width = mapDiv.offsetWidth,
    svgLayer = document.querySelector('.rt-svg-stack');
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
function loadTiles(view,tileMatrix,layerId) {
  var cont = document.querySelector('.rt-nonscalable-stack');
  cont.style.transform = 'matrix('+ tileMatrix.join(',') + ')';
	var tiles = tiler.getTiles(
    {x:view.center[0], y: view.center[1]},
    view.zoom,
    view.rotation
  );
  var layer = document.querySelector('#'+layerId);
  layer.innerHTML = "";
	tiles.forEach(function(t) {
	  var img = document.createElement('img');
    var baseURL = 'http://tile.openstreetmap.org';
	  img.src = baseURL + '/'+ t.z.toFixed() + '/' + t.x.toFixed() + '/' + t.y.toFixed() + '.png';
	  img.setAttribute('style', 
    //'left:'+ (t.left - cont.offsetLeft)  
    //+ 'px;top:' + (t.top - cont.offsetTop) +'px;'
      'left:'+ (t.left)  
      + 'px;top:' + (t.top) +'px;'
    );
	  img.setAttribute('class','rt-tile');
	  layer.appendChild(img);
	});
}
