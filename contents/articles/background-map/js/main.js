var geojson2svg = require('geojson2svg'),
  parseSVG = require('parse-svg'),
  getJSON = require('get-json-data');
// get countires geojson data and population data
getJSON('./data/countries.geo.json', function(err, data) {
  if(err) {
    console.log('country data ajax error');
    return;
  }
  drawGeoJSON(data);
});

function drawGeoJSON(geojson) {
  // get the width and height of svg element.
  // as the width of the map container is 100%, we have to set the width and 
  // height of the svgElement as per the current width/height of the container.
  var container = document.getElementById('mapArea'),
    width = container.offsetWidth,
    svgMap = document.getElementById('map');
  svgMap.setAttribute('width', width);
  svgMap.setAttribute('height', width * 0.5);
  // initiate geojson2svg 
  var convertor = geojson2svg(
    {width: width, height: width * 0.5},
    { 
      mapExtent: {
        left: -180,
        right: 180,
        bottom: -90,
        top: 90
      }
    }
  );
  // process every feature
  geojson.features.forEach(function(f) {
    var svgString, svg;
    svgString = convertor.convert(
      f,
      {attributes: {'style': 'fill:url(#hatch0)'}});
    svg = parseSVG(svgString);
    svgMap.appendChild(svg);
  });
}
