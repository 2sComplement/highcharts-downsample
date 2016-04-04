/*
 * The MIT License

Copyright (c) 2013 by Sveinn Steinarsson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function (factory) {
	if (typeof module === 'object' && module.exports) {
		module.exports = factory;
	} else {
		factory(Highcharts);
	}
}(function (H) {
    "use strict";

    if(!Array.isArray) {
        Array.isArray = function (vArg) {
            return Object.prototype.toString.call(vArg) === "[object Array]";
        };
    }

    var floor = Math.floor,
        abs = Math.abs;

	function getX(dataPoint){
		if(dataPoint === undefined){
			return;
		}
		if(Array.isArray(dataPoint) && dataPoint.length >= 2){
			return dataPoint[0];
		}else if(dataPoint.x){
			return dataPoint.x;
		}else if(dataPoint.name){
			return dataPoint.name;
		}
	}
	function getY(dataPoint){
		if(dataPoint === undefined){
			return;
		}
		if(Array.isArray(dataPoint) && dataPoint.length >= 2){
			return dataPoint[1];
		}else if(dataPoint.y !== undefined){
			return dataPoint.y;
		}else if(dataPoint.value !== undefined){
			return dataPoint.value;
		}
	}

	function mergeY(dataPoint, mergePoint){
		if(dataPoint === undefined){
			return;
		}
		if(Array.isArray(dataPoint) && dataPoint.length >= 2){
			dataPoint[1] += mergePoint[1];
		}else if(dataPoint.y !== undefined){
			 dataPoint.y += mergePoint.y;
		}else if(dataPoint.value !== undefined){
			dataPoint.value += mergePoint.value;
		}
	}

	function setX(dataPoint, x){
		if(dataPoint === undefined){
			return;
		}
		if(Array.isArray(dataPoint) && dataPoint.length >= 2){
			dataPoint[0] = x;
		}else if(dataPoint.x !== undefined){
			 dataPoint.x = x;
		}else if(dataPoint.value !== undefined){
			dataPoint.value = x;
		}
	}

	function setY(dataPoint, y){
		if(dataPoint === undefined){
			return;
		}
		if(Array.isArray(dataPoint) && dataPoint.length >= 2){
			dataPoint[1] = y;
		}else if(dataPoint.y !== undefined){
			 dataPoint.y += y;
		}else if(dataPoint.value !== undefined){
			dataPoint.value += y;
		}
	}
	
	function clone(dataPoint){
		if(dataPoint === undefined){
			return;
		}
		if(Array.isArray(dataPoint) && dataPoint.length >= 2){
			return [dataPoint[0],dataPoint[1]]
		}else if(dataPoint.y !== undefined){
			var obj = {};	
			for(var key in dataPoint){
				obj[key] = dataPoint[key];
			}
			return obj;
		}
	}
	
	
	
    function largestTriangleThreeBuckets(data, threshold) {

        var data_length = data.length;
        if (threshold >= data_length || threshold === 0) {
            return data; // Nothing to do
        }

        var sampled = [],
            sampled_index = 0;

        // Bucket size. Leave room for start and end data points
        var every = (data_length - 2) / (threshold - 2);

        var a = 0,  // Initially a is the first point in the triangle
            max_area_point,
            max_area,
            area,
            next_a;

        sampled[ sampled_index++ ] = data[ a ]; // Always add the first point

        for (var i = 0; i < threshold - 2; i++) {

            // Calculate point average for next bucket (containing c)
            var avg_x = 0,
                avg_y = 0,
                avg_range_start  = floor( ( i + 1 ) * every ) + 1,
                avg_range_end    = floor( ( i + 2 ) * every ) + 1;
            avg_range_end = avg_range_end < data_length ? avg_range_end : data_length;

            var avg_range_length = avg_range_end - avg_range_start;

            for ( ; avg_range_start<avg_range_end; avg_range_start++ ) {
              avg_x += getX(data[ avg_range_start ]) * 1; // * 1 enforces Number (value may be Date)
              avg_y += getY(data[ avg_range_start ]) * 1;
            }
            avg_x /= avg_range_length;
            avg_y /= avg_range_length;

            // Get the range for this bucket
            var range_offs = floor( (i + 0) * every ) + 1,
                range_to   = floor( (i + 1) * every ) + 1;

            // Point a
            var point_a_x = getX(data[ a ]) * 1, // Enforce Number (value may be Date)
                point_a_y = getY(data[ a ]) * 1;

            max_area = area = -1;

            for ( ; range_offs < range_to; range_offs++ ) {
                // Calculate triangle area over three buckets
                area = abs( ( point_a_x - avg_x ) * ( getY(data[ range_offs ]) - point_a_y ) -
                            ( point_a_x - getX(data[ range_offs ])) * ( avg_y - point_a_y )
                          ) * 0.5;
                if ( area > max_area ) {
                    max_area = area;
                    max_area_point = data[ range_offs ];
                    next_a = range_offs; // Next a is this b
                }
            }
			var clonedPoint = clone(data[a]);
			setX(clonedPoint,getX(max_area_point));
			setY(clonedPoint,getY(max_area_point));
            sampled[ sampled_index++ ] = clonedPoint; // Pick this point from the bucket
            a = next_a; // This a is the next a (chosen b)
        }

        sampled[ sampled_index++ ] = data[ data_length - 1 ]; // Always add last

        return sampled;
    }


    H.wrap(H.Series.prototype, 'setData', function (proceed) {
        var opt = this.options;
        if (opt.hasOwnProperty('downsample')) {
			
			//cache our presampled data so we can improve our granularity on zoom
			opt.downsample.preSampled = opt.downsample.preSampled ? opt.downsample.preSampled : arguments[1];
			
			console.time('Downsampling');
			 if (!isNaN(parseFloat(arguments[1][0])) && isFinite(arguments[1][0])) {
                // Data is array of numerical values.
                var point_x = typeof opt.pointStart != 'undefined' ? opt.pointStart : 0; // First X
                var pointInterval = typeof opt.pointInterval != 'undefined' ? opt.pointInterval : 1;
                // Turn it into array of arrays with two values.
                for (var i = 0, len = arguments[1].length; i < len; i++) {
                    arguments[1][i] = [point_x, arguments[1][i]];
                    point_x += pointInterval;
                }
                arguments[1] = largestTriangleThreeBuckets(arguments[1], opt.downsample.threshold);
            }
            else {
                // Data is array of arrays with two values
				
				var min = opt.downsample.min;
				var max = opt.downsample.max;
				var data;
				if(arguments[1].length > opt.downsample.threshold && (!(min === null || min === undefined) || !(max === null || max === undefined))){
					data = [];
					var addedMin, maxAdded;
					for (var i = 0; i < arguments[1].length ; i++) {
						var x=getX(arguments[1][i]);
						if((min === null || min === undefined || x >= min) && (max === null || max === undefined || x <= max)){
							//always add the one before the zoom starts
							if(!addedMin && i > 0){
								addedMin = true;
								data.push(arguments[1][i-1]);
							}
							data.push(arguments[1][i]);
							maxAdded = i;
						}
					}
					//always add the one before the zoom ends
					if((maxAdded+1) < arguments[1].length){
						data.push(arguments[1][maxAdded+1]);
					}
					
				}else{
					data = arguments[1]
				}
                arguments[1] = largestTriangleThreeBuckets(data, opt.downsample.threshold);
				console.log('After sample',arguments[1].length);
            }
			console.timeEnd('Downsampling');
        }
        proceed.apply(this, Array.prototype.slice.call(arguments, 1));
    });
	
	H.wrap(H.Axis.prototype, 'setExtremes', function (proceed) {
        var series = this.series;
        var min = arguments[1];
		var max = arguments[2];
		for (var i = 0; i < series.length; i++) {
			var serie = series[i];
			//On zoom update our data sample
			if(serie.options && serie.options.downsample && Array.isArray(serie.options.downsample.preSampled)){
				serie.options.downsample.min = min;
				serie.options.downsample.max = max;
				serie.setData(serie.options.downsample.preSampled);
			}
		}
		
        proceed.apply(this,Array.prototype.slice.call(arguments, 1));
    });

}));
