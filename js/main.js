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
