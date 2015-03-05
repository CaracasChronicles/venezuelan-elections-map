# venezuelan-elections-map

Source code of interactive map to browse local returns for all Venezuelan elections since 1998:
http://stanford.edu/~dkronick/vzmap

![Screenshot of map](screenshot.png)

### Installation

To build and host this project locally for development, you must have [Git](http://git-scm.com/), [NPM](https://www.npmjs.com/), [Grunt](http://gruntjs.com/) and [Bower](http://bower.io/) installed in your environment.

First, clone a copy of the repository to your local system:
```
git clone https://github.com/cjfont/venezuelan-elections-map.git
```

You must then edit the ```settings.json``` file and enter your own Google API key in order to access Google Maps.  Instructions on how to generate your own API key can be found on [this section of the Google Maps API documentation](https://developers.google.com/maps/documentation/javascript/tutorial#api_key).  You may optionally provide a tracking ID if you intend to use Google Analytics.

Run the following commands from within the project folder to complete the build:

```bash
npm install
bower install
grunt
```

To host the project locally for development, simply run ```grunt server``` then point your browser to http://localhost:4660/.  Live reload is enabled, meaning any modifications made to source files will cause grunt to rebuild dependencies and reload the page automatically to reflect new changes.

### Credits

Site development by Christian Font; raw data from the Venezuelan electoral council (CNE) via [ESDATA](http://esdata.info/); data processing by [Dorothy Kronick](http://dorothykronick.com/). Thanks to Stanford University's Community Engagement Grant for funding and to Javier Rodríguez Rivas for research assistance. 

Additional credit goes to [D3.js](http://d3js.org/) and [Colorbrewer 2.0](http://colorbrewer2.org/).
