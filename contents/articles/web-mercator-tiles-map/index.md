---
title: Map of web mercator tiles
author: gagan
email: gaganbansal123@gmail.com
date: 2015-04-15
template: article.jade
localcss: ['./css/maps.css']
---
A lot of processing is required to create raster map tiles at back end. Yes there are many steps with many software to generate OSM tiles with road data. But on the other hand consuming these map tiles is very easy at browser end. We'll see in this blog how easy it is to display map of reqired area with raster map tile in perticular for spherical mercator commanly known as web mercator projection. 

## 
 
Here is the map with web mercator image tiles using npm module [web-mercator-tiles][1]. You can change the center and zoom of this map. In the current example map can not be dragged or zoomed, the idea is to show the calculation of map tiles at proper place.

<div id="map"></div>
<span> Center (long, lat) </span><input type="text" id="center" value="-71.147, 42.472"/>
<span> Zoom </span> <input type="number" id="zoom" value="12" style="width:50px" /><input id="zoomTo" type="button" value="Zoom"/>
<script type="text/javascript" src="./js/build.min.js"></script>

Let's understand the approach for this map. So the requirement is to display a map for a given location and zoom level. 

First extent of the map need to be calculated in projected coordinate system (in our case spherical mercator) for a map's div size and desired center and zoom level. Now npm module [web-mercator-tiles][1] can be used to get the list of tiles for given projected extent and zoom. Each tile of this set has tile's Z,X,Y properties and top, left with respect to map div. And now its quite easy to display all the map tile images as image tag in map div from any map provider (OSM, MapBox and yes google, bing also).

We'll see now the code in detail. First the HTML component of this example:

```html
<div id="map"></div>
<span> Center (long, lat) </span>
<input type="text" id="center" value="-71.147, 42.472"/>
<span> Zoom </span> 
<input type="number" id="zoom" value="12" style="width:50px" />
<input id="zoomTo" type="button" value="Zoom"/>
<script type="text/javascript" src="./js/build.min.js"></script>
```

The main logic (JavaScript code) for this map is in [main.js][3] file that is part of [this repo][2]. So here goes the code step by step.

```javascript
1 var webMercatorTiles = require('web-mercator-tiles'),
2   SphericalMercator = require('sphericalmercator'),
3   baseURL = 'http://tile.openstreetmap.org',
4   mercatorMaxRes = 156543.03392804097,
5   mapDiv, size;
```

First we _require_ the npm modules. [web-mercator-tiles][1] module to get the tiles for given map extent and [sphericalmercator][4] to transform geographic coordinates to spherical/web mercator projection. As OSM tiles url pattern is `http://tile.openstreetmap.org/{z}/{X}/{Y}.png` so we defined the baseURL at line 3. Mercator projection extent divided by tile size (256) will give the maximum resolution i.e. zoom level 0 resolution.

Next we calculate the map's div size.

```javascript
 6 // get map window size
 7 mapDiv = document.getElementById('map');
 8 size = {
 9   height: parseInt(mapDiv.clientHeight),
10   width: parseInt(mapDiv.clientWidth)
11 };
```

Now we create an instance of SphericalMercator that is projection transformer. To change the map area and zoom I created a button and assigned function `zoomTo`. And on page load we call our `zoomTo` function that is the main function to load the tiles. 

```javascript
12 // projection tranformer instace
13 merc = new SphericalMercator({size:256});
14 // add event listenre to 'zoomTo' button
15 document.getElementById('zoomTo').addEventListener('click', zoomTo);
16 // call zoomTo funcion on page load
17 zoomTo();
```

zoomTo function:
 
```javascript
19 function zoomTo() {
20   var center = document.getElementById('center').value.split(','),
21     zoom =  parseInt(document.getElementById('zoom').value),
22     mercCenter, mapExtent, res, tiles;
23   // calculate map parameters in mercator projection
24   mercCenter = merc.forward([parseFloat(center[0]),parseFloat(center[1])]);
25   res = mercatorMaxRes/Math.pow(2,zoom);
26   mapExtent = {
27     left: mercCenter[0] - size.width/2 * res,
28     right: mercCenter[0] + size.width/2 * res,
29     bottom: mercCenter[1] - size.height/2 * res,
30     top: mercCenter[1] + size.height/2 * res
31   };
32   // get map tiles list for our map extent
33   tiles = webMercatorTiles(mapExtent, zoom);
```

As we discussed in the approach extent (web/spehrical mercator) of the map is required for [web-mercator-tiles][1] module. So we calcualte center of the map in mercator projection at line 24. Then resolution for given zoom is calculated at line 25. Now its quite easy to get projected map extent with respect to the center and give map's div size. Pass the map extent and zoom to `webMercatorTile` function to get the tiles details. Here is example of tile object:

```javascript
{
  "X":1237,
  "Y":1512,
  "Z":12,
  "top":-120,
  "left":-28
}
```

`top` and `left` are with respect to map's div. Its quite easy now to append each map image tile as `img` tag in map's div.

```javascript
34   // append map tile images to the map div
35   mapDiv.innerHTML = "";
36   tiles.forEach(function(t) {
37     var img = document.createElement('img');
38     img.src = baseURL + '/'+ t.Z + '/' + t.X + '/' + t.Y + '.png';
39     img.setAttribute('style', 'left:'+ t.left + 'px;top:'+t.top+'px;');
40     img.setAttribute('class','tile');
41     mapDiv.appendChild(img);
42   });
43 }
```

And we are done.

**Future:** While writing this blog I was thinking that its not difficult to modify `web-mercator-tiles` ([github source][2]) for making it generic. Generic here I mean for any projection. Right  now itself projection transformer is not part of this module and I can initiate the instance with  projection extent and maximum resolution. Then the tiles detail can be calculated easily for any projection. 

Other basic functionality of any map is navigation. `pan` and `zoom` can also be achieved using some gesture library. I am thinking of using [hammer.js][6]. Certainly I'll try this as my next exercise.

**Note: Each article in this blog is an individual project. Here is the [source code][5] for this article. In the source repository there are maps[n].html files that are used to show maps in the blog.**

[1]: https://www.npmjs.com/package/web-mercator-tiles
[2]: http://github.com/gagan-bansal/web-mercator-tiles
[3]: https://github.com/maps-on-blackboard/web-mercator-tiles-map/blob/master/js/main.js
[4]: https://www.npmjs.com/package/sphericalmercator
[5]: https://github.com/maps-on-blackboard/web-mercator-tiles-map
[6]: http://hammerjs.github.io/
