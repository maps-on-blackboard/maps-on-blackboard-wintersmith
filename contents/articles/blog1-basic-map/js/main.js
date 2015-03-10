var $ = require('jquery'),
  geojson2svg = require('geojson2svg'),
  parseSVG = require('parse-svg');

// get wountires geojson data
$.getJSON('./data/countries.geo.json',drawGeoJSON);

function drawGeoJSON(geojson) {

  // get the width and height of svgg element.
  // as the width of the map container is 100%, we have to set the width and 
  // height of the svgElement as per the current width/height of the container.
  var container = document.getElementById('mapArea'),
    width = container.offsetWidth,
    svgMap = document.getElementById('map');
  svgMap.setAttribute('width', width);
  svgMap.setAttribute('height', width * 0.5);
  // convert geojson to svg string 
  var convertor = geojson2svg(
    {width: width, height: width * 0.5},
    { 
      attributes: {
        'style': 'stroke:#006600; fill: #F0F8FF;stroke-width:0.5px;'
      },
      mapExtent: {
        left: -180,
        right: 180,
        bottom: -90,
        top: 90
      }
    }
  );
  var svgStrings = convertor.convert(geojson);
  
  // parse each svg string and append to svg element 
  svgStrings.forEach(function(svgStr) {
    var svg = parseSVG(svgStr);
    svgMap.appendChild(svg);
  });
}
