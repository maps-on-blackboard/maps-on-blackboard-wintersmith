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
