---
layout: post
title: From zero to a blank world map
date: '2015-01-04T17:54:00+00:00'
tumblr_url: http://blog.ruilopes.com/post/107125166855/from-zero-to-a-blank-world-map
---

When you need to show a web map you normally end up using something like:

{% highlight js %}
var map = L.map('map').setView([38.736946, -9.142685], 3);
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);
{% endhighlight %}

But what does it take to show that map? What software stack lays behind the curtains? And how can you customize the map? Lets find out!

We start from a vanilla Linux Virtual Machine and end up showing a humble web map -- a blank world -- the hello world of maps.

<!--MORE-->

**Be warned** that I barely describe the terms used in the [GIS](http://en.wikipedia.org/wiki/Geographic_information_system) world. Be sure to read the referenced material for more information.

So, lets get cooking!

# Ingredients

 * [VirtualBox](https://www.virtualbox.org/)
 * [Xubuntu](http://xubuntu.org/)
 * [Mapbox Studio](https://www.mapbox.com/mapbox-studio/)
 * [OpenStreetMap Coastline data](http://openstreetmapdata.com/data/water-polygons)
 * [Tessera](https://github.com/mojodna/tessera)
 * [Mapbox.js](https://www.mapbox.com/mapbox.js/)

# Recipe

## Install Xubuntu

Install [Xubuntu](http://xubuntu.org/) 14.10 (Utopic Unicorn) from [torrent](http://torrent.ubuntu.com/xubuntu/releases/utopic/release/desktop/xubuntu-14.10-desktop-amd64.iso.torrent) on a [VirtualBox](https://www.virtualbox.org/) VM.

Make sure you give it some respectful resources. I gave mine:

 * 60GB of disk
 * 4GB of memory
 * 2 CPUs
 * 64MB of video memory

After install, bring it up to date. Open a Terminal Emulator and type:

{% highlight bash %}
sudo apt-get update
sudo apt-get upgrade
sudo apt-get clean
sudo reboot
{% endhighlight %}

Install the VirtualBox [Guest Additions](https://www.virtualbox.org/manual/ch04.html). On the VM VirtualBox UI select `Devices`, `Insert Guest Additions CD Image...`. Xubuntu should automatically mount the CD. Open a terminal and type:

{% highlight bash %}
sudo apt-get install dkms
cd /media/$USER/VBOX*
sudo ./VBoxLinuxAdditions.run
sudo reboot
{% endhighlight %}

In order to copy the commands from this article into the VM you should enable the shared clipboard. On the VM VirtualBox UI select the `Devices`, `Shared Clipboard`, `Bidirectional`.


## Mapbox Studio

[Studio](https://www.mapbox.com/mapbox-studio/) is used to quickly style maps.

Install it with:

{% highlight bash %}
sudo apt-add-repository ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install nodejs

sudo apt-get install git
git clone https://github.com/mapbox/mapbox-studio.git
cd mapbox-studio
npm install
{% endhighlight %}

**NB** I've got revision [953ecc](https://github.com/mapbox/mapbox-studio/commit/953ecc35ff6eca3fb5f1caf099ec46f85e86c60c).

Start Studio:

{% highlight bash %}
npm start
{% endhighlight %}

On the Terminal, Right-Click the [http://localhost:3000](http://localhost:3000) text and select `Open Link`. Or open the Firefox Web Browser
from the Xfce menu. Or in a second Terminal type:

{% highlight bash %}
exo-open http://localhost:3000
{% endhighlight %}

Follow the application steps to create a free Mapbox account. After that, you are ready to use Studio.


## Coastline data

The [Coastline](http://wiki.openstreetmap.org/wiki/Coastline) is the line where the land meets the sea. We'll use it to draw the world outline on our map.

The Coastline data is maintained by the [OpenStreetMap contributors](http://www.openstreetmap.org/copyright). Its periodically extracted from OpenStreetMap and made available at the [OpenStreetMap Data](http://openstreetmapdata.com) site as a [Shapefile](http://en.wikipedia.org/wiki/Shapefile) -- created by the [OSMCoastline](http://wiki.openstreetmap.org/wiki/OSMCoastline) application.

This data is available in two different projections (aka [SRS](http://en.wikipedia.org/wiki/Spatial_reference_system)):

 * [EPSG:4326](http://epsg.io/4326) (aka [WGS84](http://en.wikipedia.org/wiki/World_Geodetic_System)). Used in [GPS](http://en.wikipedia.org/wiki/Global_Positioning_System) and [raw OpenStreetMap data](http://wiki.openstreetmap.org/wiki/Projection) found on [Planet.osm](http://wiki.openstreetmap.org/wiki/Planet.osm).
 * [EPSG:3857](http://epsg.io/3857) (aka [Web Mercator or Spherical Mercator](http://en.wikipedia.org/wiki/Web_Mercator) aka [900913](http://en.wikipedia.org/wiki/Web_Mercator#OpenLayers:900913)). Used in web maps (e.g. Google/Bing/Leaftlet/Mapbox.js).

**NB** You should prefer EPSG:3857 because its the one normally used in web maps -- no re-projection will be needed.

**NB** Be sure to known your coordinates projection -- otherwise confusion will surely arise!

Download the Coastline [water polygons](http://openstreetmapdata.com/data/water-polygons) Shapefile (~390MB) -- EPSG:3857 projection:

{% highlight bash %}
sudo apt-get install curl
curl -O http://data.openstreetmapdata.com/water-polygons-split-3857.zip
unzip water-polygons-split-3857.zip
{% endhighlight %}

And index it:

{% highlight bash %}
~/mapbox-studio/node_modules/mapnik/lib/binding/node-v11-linux-*/shapeindex water-polygons-split-3857/water_polygons.shp
{% endhighlight %}

## Source

To show any data in Studio we need to have a [Source](https://www.mapbox.com/mapbox-studio/source-quickstart/).

**NB** A Studio Source handles both of the projections mentioned before. But if you use EPSG:3857 no re-projection will be needed.

To create one, go to Studio, and:

  1. Click the `Projects` icon (bottom-left corner).
  2. Click the `New Project` icon.
  3. Click the `Blank source` icon (right column).

Create a new layer for the data:

  1. Click the `New Layer` icon (top-right).
  2. Click the `Browse` button and select the `water-polygons-split-3857/water_polygons.shp` file.
  3. Click the `rename` link and rename the layer to `coastalarea`. You will later use it in a stylesheet selector as `#coastalarea`.
  4. Click the `Done` button.

Change the project settings:

  1. Click the `Settings` button (left toolbar).
  2. Change the Maxzoom value to `22`.
  3. Click the `Save as` button (left toolbar).
  4. Save the Source project as `blank-world`.

You should now have on your disk a `blank-world.tm2source` directory. It contains all the Source project files.

You are now ready to create a Style project.


## Style

Maps are styled with [CartoCSS](https://github.com/mapbox/carto) -- a language similar to [CSS](http://en.wikipedia.org/wiki/Cascading_Style_Sheets).

Lets use it to style the map.

Go to Studio and create a new [Style](https://www.mapbox.com/mapbox-studio/style-quickstart/) project:

  1. Click the `Projects` icon (bottom-left corner).
  2. Click the `New Project` icon.
  3. Click the `Basic` style icon (left column).

You should now see a basic map; but we want to use our own Source, so:

  1. Click the `Layers` icon.
  2. Click the `Change source` icon.
  3. Toggle the Sources to `Local`.
  4. Select the `blank-world.tm2source` Source that we've created before.
  5. Click the `Save as` button (left toolbar). And save the project as `blank-world`.

On your disk, you should now have a `blank-world.tm2` directory. It contains all the Style project files.

You should also notice a `Style` pane on the right hand side of the window. It contains the stylesheet that is used to style the map. Replace the text with:

{% highlight css %}
@land: #f8f4f0;
@water: #a0c8f0;

Map {
  background-color: @land;
}

#coastalarea {
  line-color: @water;
  polygon-fill: @water;
}
{% endhighlight %}

Save the Project (press Ctrl+S).

After a bit, you should see a map!

## Tile server

To display a map on a web page we need:

 1. A server that returns the map as [Tile images](http://wiki.openstreetmap.org/wiki/Tiles).
 2. A HTML widget that displays them.

We'll use the [tessera server](https://github.com/mojodna/tessera). Install it with:

{% highlight bash %}
mkdir blank-world && cd blank-world

cat<<"EOF">package.json
{
  "name": "blank-world",
  "version": "1.0.0",
  "private": true,
  "dependencies": {}
}
EOF

npm install tessera --save
npm install tilelive-tmsource --save
npm install tilelive-tmstyle --save
{% endhighlight %}

See the resulting dependencies and versions:

{% highlight bash %}
cat package.json
{% endhighlight %}

I got:

{% highlight js %}
"tessera": "^0.5.1",
"tilelive": "^5.4.1",
"tilelive-tmsource": "^0.1.2",
"tilelive-tmstyle": "^0.3.0",
"tilelive-vector": "^2.3.1"
{% endhighlight %}

Start tessera:

{% highlight bash %}
./node_modules/.bin/tessera tmstyle://$HOME/blank-world.tm2
{% endhighlight %}

It should now be running at [http://localhost:8080](http://localhost:8080).

In another Terminal, get the [TileJSON](https://github.com/mapbox/tilejson-spec) document that describes the map:

{% highlight bash %}
sudo apt-get install httpie
http get http://localhost:8080/index.json
{% endhighlight %}

You should see something like:

{% highlight js %}
{
    "attribution": "...", 
    "bounds": [
        -180, 
        -85.0511, 
        180, 
        85.0511
    ], 
    "center": [ ... ], 
    "format": "png8:m=h", 
    "maxzoom": 22, 
    "minzoom": 0, 
    "name": "Untitled", 
    "scale": "1", 
    "source": "tmsource:///home/rgl/blank-world.tm2source", 
    "tilejson": "2.0.0", 
    "tiles": [
        "http://localhost:8080/{z}/{x}/{y}.png"
    ]
}
{% endhighlight %}

You can also get a Tile image, e.g. the south of [Portugal](http://en.wikipedia.org/wiki/Portugal):

{% highlight bash %}
curl -O http://localhost:8080/6/30/24.png
exo-open 24.png
{% endhighlight %}

Tiles are normally PNG images with 256x256 pixels.

You are almost done! Off to showing the web map...

# Web map

To show the map we'll use the [Mapbox.js](https://www.mapbox.com/mapbox.js/) library.

Create the web page:

{% highlight html %}
cat<<"EOF">map.html
<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8' />
<title>blank world</title>
<meta name='viewport' content='initial-scale=1,maximum-scale=1,user-scalable=no' />
<script src='https://api.tiles.mapbox.com/mapbox.js/v2.1.4/mapbox.js'></script>
<link href='https://api.tiles.mapbox.com/mapbox.js/v2.1.4/mapbox.css' rel='stylesheet' />
<style>
  body { margin:0; padding:0; }
  #map { position:absolute; top:0; bottom:0; width:100%; }
</style>
</head>
<body>
<div id='map'></div>
<script>
var map = L.mapbox.map('map', 'http://localhost:8080/index.json')
    .setView([38.736946, -9.142685], 3);
</script>
</body>
</html>
EOF
{% endhighlight %}

Open it:

{% highlight bash %}
exo-open map.html
{% endhighlight %}

You should now see the blank world map!

![](/images/blank-world-map.png)

And there you have it! Let me known how it worked for you.

In a future article I'll show you how to import the [water areas](http://wiki.openstreetmap.org/wiki/Tag:natural%3Dwater) from OpenStreetMap.

# More information

This article mentioned a lot of pieces that you might not be familiar with. To get more insight you should read the following references:

 * [Tiles and zoom levels](https://www.mapbox.com/guides/how-web-maps-work/)
 * [Mapbox Studio Documentation](https://www.mapbox.com/mapbox-studio/)
 * [CartoCSS](https://github.com/mapbox/carto)

Map Styles:

 * [All Mapbox Styles](https://github.com/mapbox?query=.tm2)
 * [Toner](https://github.com/stamen/toner-carto)
 * [OpenStreetMap](https://github.com/gravitystorm/openstreetmap-carto)

Map projections (aka [SRS](http://en.wikipedia.org/wiki/Spatial_reference_system)):

 * [EPSG:4326](http://epsg.io/4326) (aka [WGS84](http://en.wikipedia.org/wiki/World_Geodetic_System)). Used in [GPS](http://en.wikipedia.org/wiki/Global_Positioning_System) and [raw OpenStreetMap data](http://wiki.openstreetmap.org/wiki/Projection) found on [Planet.osm](http://wiki.openstreetmap.org/wiki/Planet.osm).
 * [EPSG:3857](http://epsg.io/3857) (aka [Web Mercator or Spherical Mercator](http://en.wikipedia.org/wiki/Web_Mercator)). Used in web maps (e.g. Google/Bing/Leaftlet/Mapbox.js).
 * [FAQ](http://trac.osgeo.org/proj/wiki/FAQ)
 * [The Google Maps / Bing Maps Spherical Mercator Projection](https://alastaira.wordpress.com/2011/01/23/the-google-maps-bing-maps-spherical-mercator-projection/) confusion.

[OpenStreetMap](http://www.openstreetmap.org/):

 * [Beginners Guide](http://wiki.openstreetmap.org/wiki/Beginners%27_Guide)
 * [Map features](http://wiki.openstreetmap.org/wiki/Map_features)
 * [Good practices](http://wiki.openstreetmap.org/wiki/Good_practice)
 * [Forum](https://help.openstreetmap.org/)
 * [Wiki](http://wiki.openstreetmap.org/wiki/Main_Page)
 * [Overpass Turbo](http://wiki.openstreetmap.org/wiki/Overpass_turbo)

As an alternative software stack, you should look at:

 * [GeoServer](http://geoserver.org/)
 * [OpenLayers](http://openlayers.org/)

And finally, feel free to contact me!

-- RGL
