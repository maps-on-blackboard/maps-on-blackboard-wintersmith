---
title: Map with background filled as SVG pattern
author: gagan
email: gaganbansal123@gmail.com 
date: 2015-08-15
template: article.jade
tags: ['geojson', 'svg', 'maps', 'geojson2svg', 'thematic-map', 'data-visualization', 'svg-styling', 'symbology']
localcss: ['./css/maps.css']
---
I wanted to use svg fill patterns for thematic maps. I found an interesting library [patternfills][0] and filled the whole world with one of the pattern. Defining SVG patterns and using with [geojson2svg][1] was quite easy. I'll explain the basic usage of SVG fill patterns here. 

## 
Here is the map 

<div id="mapArea" style="width: 100%;">
  <svg id="map" xmlns="http://www.w3.org/2000/svg" x="0" y="0" >
  <defs>
    <pattern id="hatch0" patternUnits="userSpaceOnUse"
        x="0" y="0" width="10" height="10">
      <g style="fill:none; stroke:#fff; stroke-width:2">
        <path d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2"/>
      </g>
    </pattern>
  <defs>
  </svg>
  <script type="text/javascript" src="./js/build.js"></script>
</div> 

So first let's check how to create this fill pattern. The code below shows the pattern definition. Basically with any SVG element fill pattern can be created, here hatch pattern is formed with path element. Read more about [SVG patterns][6] for detailed explanation. 

```html
<div id="mapArea" style="width: 100%;">
  <svg id="map" xmlns="http://www.w3.org/2000/svg" x="0" y="0" >
  <defs>
    <pattern id="hatch0" patternUnits="userSpaceOnUse"
        x="0" y="0" width="10" height="10">
      <g style="fill:none; stroke:#fff; stroke-width:2">
        <path d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2"/>
      </g>
    </pattern>
  <defs>
  </svg>
  <script type="text/javascript" src="./js/build.js"></script>
</div> 
```

And now if we see the JavaScript code for usage of pattern, its quite easy:

```javascript
34   // process every feature
35   geojson.features.forEach(function(f) {
36     var svgString, svg;
37     svgString = convertor.convert(
38       f,
39       {attributes: {'style': 'fill:url(#hatch0)'}});
40     svg = parseSVG(svgString);
41     svgMap.appendChild(svg);
42   });
```

We just pass the fill style while converting each feature to SVG path element. The above code is part of the JavaScript [main file][7]. Different patterns can be passed to geojson features based on your classification.Thematic mapping with [geojson2svg][4] has been explained in my [previous blogs][10].

**Note: Each article in this blog is an individual project. Here is the [source code][11] for this article's map.**

[0]: https://github.com/iros/patternfills
[1]: https://github.com/gagan-bansal/geojson2svg
[2]: http://maps-on-blackboard.com/articles/blog1-basic-map/
[4]: https://www.npmjs.com/package/geojson2svg
[5]: https://www.npmjs.com/package/parse-svg
[6]: http://designmodo.com/svg-patterns/
[7]: https://github.com/maps-on-blackboard/background-map/blob/master/js/main.js
[8]: http://maps-on-blackboard.com/articles/blog2-thematic-map/
[9]: http://maps-on-blackboard.com/articles/interactive-map/
[10]: http://maps-on-blackboard.com/tag/thematic-map/
[11]: https://github.com/maps-on-blackboard/background-map/
