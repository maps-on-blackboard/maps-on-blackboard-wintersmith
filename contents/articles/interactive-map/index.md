---
title: Interactive map for data visualization
author: gagan
email: gaganbansal123@gmail.com 
date: 2015-05-31
template: article.jade
tags: data, visualisation
localcss: ['./css/maps.css']
---
As conceptualized by me [earlier][2] the different components of online maps creation are data, visual rendering, converter and interaction. Once again I'll brief about these components here, but In this article we'll see a nice example of interaction. We'll visualize the [bilateral migration][12] 'to' and 'from' a country by tapping the desired country on map.
   
## 

Spatial (geographic) **data** is foundation for the visualization and no doubt the information data is the cause for visualization. Information is the data that we want to show to user like population or GDP of countries and superimposing this data on maps makes information more readable. For spatial data [GeoJSON][10] is suitable format as an extension of JSON.

For **rendering** of geometries, there are two options SVG and Canvas. SVG is more convenient for interaction and styling. With CSS itself you can change the style of a single SVG element. DOM events are supported on SVG elements.

So now there is a need for **converter** that converts GeoJSON to SVG. I am using [geojson2svg][1] for conversion. There are other tools like [jVectorMap Converter][11], but most of these are tightly integrated with the parent libraries. While geojson2svg output is collection of SVG strings for each geojson feature. These SVG strings can be added easily on browser. 

**Interaction** adds life to your visualization. Interaction is enlarging the map i.e. zooming or adding some behavior to each feature/geometry drawn on map. In this blog I'll demonstrate the implementation of interaction on map using HTML, JavaScript and jQuery.  

Here is the map with tap interaction. Countries [bilateral migration data][12] is visualized on the world map. Tapping any country on map shows other countries in different colors (yellow to brown gradient) based on the number of migration to/from these countries. **Tap on any country (it turns green) to see to/from which countries people are moving.**
<ul id="type" class="type">
  <li > <input name="type" id="source" value="source" type="radio" checked><span class="label">Souce Countries</span>
  <li> <input name="type" id="dest" value="dest" type="radio"><span class="label">Destination Countries</span>
</ul>
<div id="mapArea" style="width: 100%;border:1px solid #c0c0c0;">
  <svg id="map" xmlns="http://www.w3.org/2000/svg" x="0" y="0" >
  </svg>
</div>
<div id="legend">
<span id="less">Few </span>
<span>Many</span>
</div>
<script type="text/javascript" src="./js/build.min.js"></script>
So now let's analyze the code for the above map step by step. Here is the HTML code for the map:

```html
 <ul id="type" class="type">
   <li > <input name="type" id="source" value="source" type="radio" checked><span class="label">Souce Countries</span>
   <li> <input name="type" id="dest" value="dest" type="radio"><span class="label">Destination Countries</span>
 </ul>
 <div id="mapArea" style="width: 100%;border:1px solid #c0c0c0;">
   <svg id="map" xmlns="http://www.w3.org/2000/svg" x="0" y="0" >
   </svg>
 </div>
 <div id="legend">
  <span id="less">Few </span>
  <span>Many</span>
 </div>
 <script type="text/javascript" src="./js/build.min.js"></script>
``` 
The above code is self explanatory, basically we created an empty SVG element here. On this SVG element we'll add country polygons as SVG path element. At end I have included the JavaScript code and source for this is [js/main.js][9] that we'll analyze now.

```javascript
  1 var $ = require('jquery'),
  2   geojson2svg = require('geojson2svg'),
  3   parseSVG = require('parse-svg'),
  4   Rainbow = require('rainbowvis.js');
``` 

First we import the modules, [jQuery][21] that helps a lot, [geojson2svg][4] to convert GeoJSON (country geometry data) to SVG path elements, [parse-svg][5] module to parse SVG string to DOM element and [rainbowvis.js][19] for making the color palette. We'll see the usage of each module as we go through the code.
```javascript
  5 // get countires geojson data and migration data
  6 $.when(
  7   $.getJSON('./data/countries.geo.json'),
  8   $.get('./data/migration-matrix.csv')
  9 ).then(drawGeoJSON, function() {
 10   console.log('data not found');
 11 })
```

With jQuery promise approach I fetch countries geojson data and migration matrix csv file. On success of both request the response data are passed to _drawGeoJSON_ function. This function basically process the GeoJSON and csv data. 

```javascript
 12 var migration = {},
 13   selCountry;
 14 $('#mapArea').on('click', 'path', function() {
 15   renderForCountry(this.id,$('input[name=type]:checked').val());
 16   selCountry = this.id;
 17 });
 18 $('#type :radio').on('click', function() {
 19   renderForCountry(selCountry,$(this).val());
 20 });
 21 drawLegend();
```
Here we define the global variables, _migration_ is json output for parsed csv file. Parsing is explained in detail in later section of this blog. _selCountry_ is selected country i.e. where user has tapped on the map. Next (line 14) I add an event listener on SVG path element (country geometry) using jQuery, here main callback function is _renderForCountry_. Further at line 18 I add event listener to radio button that are used to change the type of movement i.e. to the countries (source) or from the countries (destination). _drawLegend_ is small function to make legend color palette below map. 

So there are three major functions _drawGeoJSON_, _renderForCountry_ and _parseCSV_. First I'll discuss about the parsing of bilateral migration csv data.

The table below is the sample from [migration data][13], I have saved xlsx to csv format with tab as delimiter. 
```
Destination country (across)  Afghanistan  Albania  Algeria  American Samoa  Andorra  Angola  Antigua and Barbuda  Argentina  Armenia  Aruba  Australia
  -Source country (down)      
Afghanistan                   0            0        0        0               0        0       0                    9          0        0      28411    
Albania                       0            0        0        0               0        0       0                    77         0        4      3063     
Algeria                       0            0        0        0               0        0       0                    210        0        3      1392     
American Samoa                0            0        0        0               0        0       0                    0          0        0      219      
Andorra                       0            0        0        0               0        0       0                    47         0        0      22       
Angola                        0            0        0        0               0        0       0                    81         0        0      546      
Antigua and Barbuda           0            0        0        0               0        0       0                    0          0        5      43       
Argentina                     0            0        0        0               708      0       0                    0          0        71     14832    
Armenia                       0            0        0        0               0        0       0                    939        0        0      1253     
Aruba                         0            0        0        0               0        0       5                    0          0        0      41       
Australia                     0            0        167      0               61       0       7                    1179       0        14     0        

```
I parse the csv data to json at client side and sample output is shown here:
```javascript
{
  "unitedstateofamerica": {
    "dest": [
      {"name": "unitedkingdom", "value": 222201},
      {"name": "uganda", "value": 1060},
      ...
    ],
    "source": [
      {"name": "unitedkingdom", "value": 758919},
      {"name": "uganda", "value": 1060},
      ...
    ]
  },
  "uganda" :{
    "dest": [...],
    "source": [...]
  },
  ....
}
```
Now it is easy to understand the _parseCSV_ function. So CSV response string need to be split at new line to get rows. Then for each column record value (split row using tab) need to be pushed for each country's _source_ and _dest_ array set.

```javascript 
 87 function parseCSV(respString) {
 88   var matrix = {};
 89   var rows = respString.split(/\r\n|\r|\n/g);
 90   //first row is header
 91   var countries = rows[0].split('\t');
 92   countries.forEach(function(name) {
 93     matrix[name.toLowerCase().replace(/[^a-z0-9]/g,'')]
 94       = {'dest': [], 'source': []};
 95   });
 96   rows = rows.slice(1,rows.length);
 97   var counter =0;
 98   rows.forEach(function(row) {
 99     var data = row.split('\t');
100     // first field is country name
101     var countryRow = data[0].toLowerCase().replace(/[^a-z0-9]/g,'');
102     for (var i=1; i< data.length; i++) {
103       var countryCol = countries[i].toLowerCase().replace(/[^a-z0-9]/g,'');
104       if (countryRow !== countryCol) {
105         var val = parseInt(data[i]);
106         matrix[countryCol]['source'].push({
107           name: countryRow, value: val});
108         matrix[countryRow]['dest'].push({
109           name: countryCol, value: val});
110       }
111     }
112   });
113   return matrix;
114 };
```

Now we'll discuss the function _drawGeoJSON_ that uses *converter* geojson2svg for converting GeoJSON features (in our case country boundaries) to SVG path element. Lets go line by line carefully.

```javascript
 23 function drawGeoJSON(respGeojson,respMigration) {
 24   var geojson = respGeojson[0];
 25   migration = parseCSV(respMigration[0]);
 26 
```

When both requests for geojson and migration data are successful then _drawGeoJOSN_ function is executed that is callback function to jQuery's _when_ function. Each argument to callback function is array with following structure _[data, statusText, jqXHR]_, check jQuery [documentation][14]. Instead of jQuery you can use some other modules for ajax/promise like [promise][16] or [SuperAgent][17]. Read more about [promise][15]. At line 25 we parse migration data that has been discussed above. 

Next we set width and height of the SVG element on this we are going to draw countries boundary.
```javascript
 27   // get the width and height of svg element.
 28   // as the width of the map container is 100%, we have to set the width and 
 29   // height of the svgElement as per the current width/height of the container.
 30   var container = document.getElementById('mapArea'),
 31     width = container.offsetWidth,
 32     svgMap = document.getElementById('map');
 33   svgMap.setAttribute('width', width);
 34   svgMap.setAttribute('height', width * 0.5);
```

```javascript
 35   // initiate geojson2svg 
 36   var convertor = geojson2svg(
 37     {width: width, height: width * 0.5},
 38     {
 39       mapExtent: {left: -180, right: 180, bottom: -90, top: 90}
 40     }
 41   );
 42 
 43   // process every feature in geojson
 44   geojson.features.forEach(function(f) {
 45     var svgString = convertor.convert(
 46       f,
 47       {attributes: {
 48         id: f.properties.name.toLowerCase().replace(/[^a-z0-9]/g,''),
 49         'class': 'nil'}
 50       }
 51     );
```
[geojson2svg][4] is initiated with svg element's size (width & height) and maps coordinate system extent. Then feature (country) in geojson is converted to svg string with _.convert_ api. In _.convert_ function along with feature, attributes are also passed, here we pass country name as id. So output svg path element's id would be country name. Here is sample svg path: 

```xml
<path d="M48.64402566666665,141.04507866666665 48.35352855555553,
141.377...111124,38.13749934444445 46.57813694444443,37.077336044444436
 49.58739544444444,37.494978844444454Z" id="unitedstatesofamerica" 
 class="nil"></path>
```

In next two lines SVG path string is converted to SVG DOM element using [parseSVG][5] module and appended to root SVG element. Instead of _parseSVG_ you can use [DOMparser][18].
```javascript
 52     var svg = parseSVG(svgString);
 53     svgMap.appendChild(svg);
 54   });
 55   renderForCountry('United States of America', 'source');
 56 }
``` 
At the end _renderforCountry_ is called to initially render the map. We'll analyze now this simple function that basically change the fill color of SVG path elements of countries. Color is based on the number, if the number is more shade of brown is selected and if less towards yellow color is picked. Colors are picked with help a nice module [rainbowvis.js][19]. 

```javascript
 58 function renderForCountry(name,type) {
 59   var name = name.toLowerCase().replace(/[^a-z0-9]/g,'');
 60   var countries = migration[name][type]
 61     .filter(function(c) {
 62       return c.value != 0;
 63     })
 64     .sort(function(a,b) {
 65       return a.value - b.value;
 66     });
```
There are two arguments for this function country name and type i.e. source ('source') or destination ('dest'). First name is formatted the way we are storing country name by converting to lower case removing all other character other than numbers and alphabets. Then I select the data (line 60) and filter (line 61) by removing countries where migration value is zero. Then (line 64) all countries are sorted based on the number of persons movement in ascending order.
```javascript 
 67   var palette = new Rainbow();
 68   palette.setNumberRange(0,countries.length - 1);
 69   palette.setSpectrum('#ffff85','#6b0000');
 70   $('#map path').attr('class','nil');
 71   $('#map path').css('fill','');
 72   $('#'+name).css('fill','#70d035');
 73   countries.forEach(function(country,i,arr) {
 74     $('#'+country.name)
 75       .css('fill', '#'+palette.colorAt(i));
 76   });
 77 }
```

Now the main thing, we need to assign colors to countries. I have done [quantile classification][20] here (whereas each category is having only one unit). Basically we want a palette with color gradient of length equal to the number of countries for a given set, so that we can pick the color for each country in _countries_ data set in ascending order. Colors in color palette need to be depicting first color for few persons and graduating to last color depicting many, so light color shade to dark color would suffice here. [rainbowvis.js][19] module is very helpful for making such color palette. After initiating the _Rainbow_ instance _palette_ (line 67) we need to set the number of colors in palette (line 68) and color shades (line 69). Initially render all countries with _nil_ call as set css fill empty (line 70 and 71). Now color the selected country (where user tapped) green (line 72). And for each country in _countries_ data array set the fill color by picking from _palette_ for given index.

This way you have easily created the interactive thematic map for migration data visualization. The map included in this blog is svg map generated from the above code.  

**Note: Each article in this blog is an individual project. Here is the [source code][6] for this article map.**


[1]: https://github.com/gagan-bansal/geojson2svg
[2]: http://maps-on-blackboard.com/articles/blog1-basic-map/
[3]: https://www.npmjs.com/package/extend-geojson-properties
[4]: https://www.npmjs.com/package/geojson2svg
[5]: https://www.npmjs.com/package/parse-svg
[6]: https://github.com/maps-on-blackboard/interactive-map
[7]: https://github.com/gagan-bansal/extend-geojson-properties
[8]: https://github.com/maps-on-blackboard/blog2-thematic-map/blob/master/map1.html
[9]: https://github.com/maps-on-blackboard/interactive-map/blob/master/js/main.js
[10]: https://en.wikipedia.org/wiki/GeoJSON
[11]: http://jvectormap.com/documentation/gis-converter/
[12]: http://siteresources.worldbank.org/INTPROSPECTS/Resources/334934-1288990760745/Bilateral_Migration_Matrix_2013.xlsx 
[13]: https://github.com/maps-on-blackboard/interactive-map/blob/master/data/migration-matrix.csv
[14]: https://api.jquery.com/jquery.when/
[15]: https://www.promisejs.org/
[16]: https://www.npmjs.com/package/promise
[17]: https://www.npmjs.com/package/superagent
[18]: https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
[19]: https://www.npmjs.com/package/rainbowvis.js
[20]: http://www.ncgia.ucsb.edu/cctp/units/unit47/html/comp_class.html
[21]: https://www.npmjs.com/package/jquery
