var $ = require('jquery'),
  geojson2svg = require('geojson2svg'),
  parseSVG = require('parse-svg'),
  Rainbow = require('rainbowvis.js');
// get countires geojson data and migration data
$.when(
  $.getJSON('./data/countries.geo.json'),
  $.get('./data/migration-matrix.csv')
).then(drawGeoJSON, function() {
  console.log('data not found');
})
var migration = {},
  selCountry = 'india';
$('#mapArea').on('click', 'path', function() {
  renderForCountry(this.id,$('input[name=type]:checked').val());
  selCountry = this.id;
});
$('#type :radio').on('click', function() {
  renderForCountry(selCountry,$(this).val());
});
drawLegend();

function drawGeoJSON(respGeojson,respMigration) {
  var geojson = respGeojson[0];
  migration = parseCSV(respMigration[0]);
  
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
      mapExtent: {left: -180, right: 180, bottom: -90, top: 90}
    }
  );

  // process every feature in geojson
  geojson.features.forEach(function(f) {
    var svgString = convertor.convert(
      f,
      {attributes: {
        id: f.properties.name.toLowerCase().replace(/[^a-z0-9]/g,''),
        'class': 'nil'}
      }
    );
    var svg = parseSVG(svgString);
    svgMap.appendChild(svg);
  });
  renderForCountry('United States of America', 'source'); 
};

function renderForCountry(name,type) {
  var name = name.toLowerCase().replace(/[^a-z0-9]/g,''); 
  var countries = migration[name][type]
    .filter(function(c) {
      return c.value != 0;
    })
    .sort(function(a,b) {
      return a.value - b.value;
    });
  var pallete = new Rainbow();
  pallete.setNumberRange(0,countries.length - 1);
  pallete.setSpectrum('#ffff85','#6b0000');
  $('#map path').attr('class','nil');
  $('#map path').css('fill','');
  $('#'+name).css('fill','#70d035');
  countries.forEach(function(country,i,arr) {
    $('#'+country.name)
      .css('fill', '#'+pallete.colorAt(i));
  });
}
function drawLegend() {
  var pallete = new Rainbow();
  pallete.setNumberRange(0,19);
  pallete.setSpectrum('#ffff85','#6b0000');
  for(var i=19; i>-1; i--) {
    $('#less').after('<span class="box" style="background-color:#'
      + pallete.colorAt(i) + '"</span>'); 
  }
}
function parseCSV(respString) {
  var matrix = {};
  var rows = respString.split(/\r\n|\r|\n/g);
  //first row is header
  var countries = rows[0].split('\t');
  countries.forEach(function(name) {
    matrix[name.toLowerCase().replace(/[^a-z0-9]/g,'')] 
      = {'dest': [], 'source': []};
  });
  rows = rows.slice(1,rows.length);
  var counter =0;
  rows.forEach(function(row) {
    var data = row.split('\t');
    // first field is country name
    var countryRow = data[0].toLowerCase().replace(/[^a-z0-9]/g,''); 
    for (var i=1; i< data.length; i++) {
      var countryCol = countries[i].toLowerCase().replace(/[^a-z0-9]/g,'');
      if (countryRow !== countryCol) { 
        var val = parseInt(data[i]);
        matrix[countryCol]['source'].push({
          name: countryRow, value: val});
        matrix[countryRow]['dest'].push({
          name: countryCol, value: val}); 
      }
    }
  });
  return matrix;
};
