/**
 * @projectDescription	Visualizes locally computed Healthcare System Dynamics information.
 * @inherits	i2b2
 * @namespace	i2b2.HealthcareSystemDynamics
 * @author		Nick Benik
 * @version 	1.0
 * ----------------------------------------------------------------------------------------
 * 2016-24-08:  Initial Launch [Nick Benik]
 */

//  ========== This is the local data generation/calculation engine for this plugin. Eventually this will be replaced 
//  ========== by a server-side cell that does all the data calculation of statistics that are required by the visualization.

i2b2.HealthcareSystemDynamics.calcEngine = {
	data: {},
	ret: {},

	_resetOutput: function() {
		i2b2.HealthcareSystemDynamics.calcEngine.ret = {
			"label": "chart name here",
			"axes": {
				"x": {	"label": "Age in Years", "scale": "linear"},
				"y": {	"label": "Fact Count", "scale": "log"}
			},
			"datagroups": []
		};
	},
	_getConfig: function() {
		// reset scale according to radio button settings from the GUI
		if (!i2b2.h.isBadObjPath('i2b2.HealthcareSystemDynamics.model.options.ScaleY')) { 
			switch(i2b2.HealthcareSystemDynamics.model.options.ScaleY) {
				case "linear":
					this.ret.axes.y.scale = "linear";
					break;
				case "logrithmic":
					this.ret.axes.y.scale = "log";
					break;

			}
		}
		// bucketize the Records according to radio button settings from the GUI
		this.data.ageMin = 0;
		this.data.ageMax = 100;
		this.data.numOfBuckets = 20;
		if (!i2b2.h.isBadObjPath('i2b2.HealthcareSystemDynamics.model.options.BucketSizeAge')) { 
			switch(i2b2.HealthcareSystemDynamics.model.options.BucketSizeAge) {
				case "10yrs":
					this.data.numOfBuckets = parseInt((this.data.ageMax - this.data.ageMin) / 10);
					break;
				case "1yrs":
					this.data.numOfBuckets = parseInt(this.data.ageMax - this.data.ageMin);
					break;

			}
		}
	},



	generate2: function(inControl, inExperiment) {
		this._resetOutput.call(this);
		this._getConfig.call(this);

		// process the CONTROL patient records
		var temp_array = [];
		var pData = i2b2.h.XPath(inControl.ajaxRet.refXML, 'descendant::patient/param[@column]/text()/../..');
		for (var i1=0; i1<pData.length; i1++) {
			var temp = {};

			// get Patient_ID
			var aData = i2b2.h.XPath(pData[i1], 'descendant::patient_id/text()');
			try {
				temp.id = aData[0].nodeValue;
			} catch(e) {
				temp.id = null;
			}

			// get age value
			var aData = i2b2.h.XPath(pData[i1], 'descendant::param[@column="age_in_years_num"]/text()');
			try {
				temp.age = aData[0].nodeValue;
			} catch(e) {
				temp.age = null;
			}


			// get  fact count value
			var aData = i2b2.h.XPath(pData[i1], 'descendant::param[@column="fact_count"]/text()');
			try {
				temp.fact_count = aData[0].nodeValue;
			} catch(e) {
				temp.fact_count = null;
			}

			temp_array.push(temp);
		}

		// bucketize the Records according to radio button settings from the GUI
		i2b2.HealthcareSystemDynamics.calcEngine.data.ageBucketized = i2b2.HealthcareSystemDynamics.calcEngine.bucketizeData(temp_array, this.data.numOfBuckets, this.data.ageMin, this.data.ageMax);
		this.data.midBucketOffset = ((this.data.ageMax - this.data.ageMin) / this.data.numOfBuckets) / 2;

		// build the 5% percentile mapping
		var dgroup = {
			"id": "5percentile",
			"label": "5%",
			"legend": "graph",
			"tooltip": "5th Percentile - Fact count grouping",
			"type": "line",
			"colorset": "Greys,3",
			"color": "1",
			"stroke": "2",
			"points": i2b2.HealthcareSystemDynamics.calcEngine.buildPercentileSeries(0.05, 1,100, this.data.midBucketOffset)
		};
		this.ret.datagroups.push(dgroup);

		// build the 10% percentile mapping
		var dgroup = {
			"id": "10percentile",
			"label": "10%",
			"legend": "graph",
			"tooltip": "10th Percentile - Fact count grouping",
			"type": "line",
			"colorset": "Greys,3",
			"color": "1",
			"stroke": "2",
			"points": i2b2.HealthcareSystemDynamics.calcEngine.buildPercentileSeries(0.10, 1,100, this.data.midBucketOffset)
		};
		this.ret.datagroups.push(dgroup);


		// build the 25% percentile mapping
		var dgroup = {
			"id": "25percentile",
			"label": "25%",
			"legend": "graph",
			"tooltip": "25th Percentile - Fact count grouping",
			"type": "line",
			"colorset": "Greys,3",
			"color": "1",
			"stroke": "2",
			"points": i2b2.HealthcareSystemDynamics.calcEngine.buildPercentileSeries(0.25, 1,100, this.data.midBucketOffset)
		};
		this.ret.datagroups.push(dgroup);

		// build the 50% percentile mapping
		var dgroup = {
			"id": "50percentile",
			"label": "50%",
			"legend": ["graph", "formal"],
			"tooltip": "50th Percentile - Fact count grouping",
			"type": "line",
			"colorset": "Greys,3",
			"color": "2",
			"stroke": "4",
			"points": i2b2.HealthcareSystemDynamics.calcEngine.buildPercentileSeries(0.5, 1,100, this.data.midBucketOffset)
		};
		this.ret.datagroups.push(dgroup);


		// build the 75% percentile mapping
		var dgroup = {
			"id": "75percentile",
			"label": "75%",
			"legend": "graph",
			"tooltip": "75th Percentile - Fact count grouping",
			"type": "line",
			"colorset": "Greys,3",
			"color": "1",
			"stroke": "2",
			"points": i2b2.HealthcareSystemDynamics.calcEngine.buildPercentileSeries(0.75, 1,100, this.data.midBucketOffset)
		};
		this.ret.datagroups.push(dgroup);


		// build the 90% percentile mapping
		var dgroup = {
			"id": "90percentile",
			"label": "90%",
			"legend": "graph",
			"tooltip": "90th Percentile - Fact count grouping",
			"type": "line",
			"colorset": "Greys,3",
			"color": "1",
			"stroke": "2",
			"points": i2b2.HealthcareSystemDynamics.calcEngine.buildPercentileSeries(0.90, 1,100, this.data.midBucketOffset)
		};
		this.ret.datagroups.push(dgroup);

		// build the 95% percentile mapping
		var dgroup = {
			"id": "95percentile",
			"label": "95%",
			"legend": "graph",
			"tooltip": "95th Percentile - Fact count grouping",
			"type": "line",
			"colorset": "Greys,3",
			"color": "1",
			"stroke": "2",
			"points": i2b2.HealthcareSystemDynamics.calcEngine.buildPercentileSeries(0.95, 1,100, this.data.midBucketOffset)
		};
		this.ret.datagroups.push(dgroup);

		if (i2b2.HealthcareSystemDynamics.model.options.SmoothLines) {
			for (var i=0; i<this.ret.datagroups.length; i++) {
				for (var j=1; j<this.ret.datagroups[i].points.length-1; j++) {
					this.ret.datagroups[i].points[j][1] = (
							this.ret.datagroups[i].points[j-1][1]
							+this.ret.datagroups[i].points[j][1]
							+this.ret.datagroups[i].points[j+1][1]
						)/3;
				}
			}
		}

		// process the EXPERIMENT patient records (TODO: Make this handle multiple EXPERIMENT records)
		for (var i=0; i<inExperiment.length; i++) {
			var dgroup = {
				"id": "experimentDataPoints"+i,
				"label": inExperiment[i].sdxInfo.sdxDisplayName,
				"legend": "formal",
				"tooltip": "Data points representing the experiment patient record set",
				"type": "points",
				"colorset": "Set1,7",
				"color": i,			// change this to [0-8] depending on which EXPERIMENT record
				"stroke": "2",
				"points": []
			};
			

			// points data format [x, y, radius, ID, tooltip]
			var temp_array = [];
			var pData = i2b2.h.XPath(inExperiment[i].ajaxRet.refXML, 'descendant::patient/param[@column]/text()/../..');
			var avgX = 0;
			var avgY = 0;
			for (var i1=0; i1<pData.length; i1++) {
				var temp = [];

				// get age [X position]
				var aData = i2b2.h.XPath(pData[i1], 'descendant::param[@column="age_in_years_num"]/text()');
				try {
					temp[0] = aData[0].nodeValue * 1; // force conversion from string
					avgX = avgX + temp[0];
				} catch(e) {
					temp[0] = null;
				}

	
				// get fact count [Y position]
				var aData = i2b2.h.XPath(pData[i1], 'descendant::param[@column="fact_count"]/text()');
				try {
					temp[1] = aData[0].nodeValue  * 1; // force conversion from string
					avgY = avgY + temp[1];
				} catch(e) {
					temp[1] = null;
				}

				// deal with radius value
				temp[2] = 3;

				// get Patient_ID [ID value]
				var aData = i2b2.h.XPath(pData[i1], 'descendant::patient_id/text()');
				try {
					temp[3] = aData[0].nodeValue;
				} catch(e) {
					temp[3] = null;
				}


				// create the tooltip for display
				temp[4] = dgroup.label+"<br>"+temp[4];
	
				temp_array.push(temp);
			}
			dgroup.points = temp_array;
			this.ret.datagroups.push(dgroup);

			avgX = avgX / pData.length;
			avgY = avgY / pData.length;

			// deal with single point mean datagroup
			this.ret.datagroups.push({
				"id": "experimentMeanPoint"+i,
				"label": "MEAN of " + inExperiment[i].sdxInfo.sdxDisplayName,
				"type": "meanPoint",
				"colorset": "Set1,7",
				"color": i,			// change this to [0-8] depending on which EXPERIMENT record
				"stroke": "2",
				"points": [[
					avgX,
					avgY,
					10,
					0
				]]
			});

			// deal with SD ellipse datagroup POINTS(x,y,[radius_x, radius_y])
//			var sdX = d3.deviation(temp_array, function(d) { return d[0]; });
//			var sdY = d3.deviation(temp_array, function(d) { return d[1]; });
			// find SD using old version of D3js
			//var sdX = d3.quantile((temp_array.map(function(d) { return d[0]})).sort(), 0.5);
			//var sdY = d3.quantile((temp_array.map(function(d) { return d[1]})).sort(), 0.5);

			var sdX = 0;
			var sdY = 0;

			if (pData.length > 1) {
				for (var sdi=0; sdi<pData.length; sdi++) {
					sdX += Math.pow(temp_array[sdi][0] - avgX,2);
					sdY += Math.pow(temp_array[sdi][1] - avgY,2);
				}
				sdX = Math.floor(Math.sqrt(sdX/(pData.length-1)));
				sdY = Math.floor(Math.sqrt(sdY/(pData.length-1)));
			}

			this.ret.datagroups.push({
				"id": "experimentSDEllipse"+i,
				"label": "SD of " + inExperiment[i].sdxInfo.sdxDisplayName,
				"type": "ellipse",
				"colorset": "Set1,7",
				"color": i,			// change this to [0-8] depending on which EXPERIMENT record
				"stroke": "2",
				"points": [[
					avgX,
					avgY,
					[sdX, sdY]
				]]
			});




		}

		return this.ret;

	},
	buildPercentileSeries: function(percentile, startX, endX, bucketOffsetValue) {
		var ret = {};
		
		for (var i=startX; i<endX; i++) {
			var idx1 = i2b2.HealthcareSystemDynamics.calcEngine.data.ageBucketized.rangeQuantize(i);
			if (typeof ret[idx1] == "undefined") {
				// do a proper percentile calculation
				var cnt = i2b2.HealthcareSystemDynamics.calcEngine.data.ageBucketized[idx1].length - 1;
				if (cnt >= 0) {
					var pidx = cnt * percentile;
					var pidxInt = parseInt(pidx);
					if (pidxInt == pidx) {
						ret[idx1] = i2b2.HealthcareSystemDynamics.calcEngine.data.ageBucketized[idx1][pidx]*1;
					} else {
						// not a direct match, must interpolate the value
						switch (pidxInt) {
							//case 0:
							//case cnt:
								//ret[idx1] = i2b2.HealthcareSystemDynamics.calcEngine.data.ageBucketized[idx1][pidxInt] * (pidx - pidxInt);
								//ret[idx1] = i2b2.HealthcareSystemDynamics.calcEngine.data.ageBucketized[idx1][pidxInt] * (pidx - pidxInt);
								//break;
							default:
								ret[idx1] = ((i2b2.HealthcareSystemDynamics.calcEngine.data.ageBucketized[idx1][pidxInt+1] - i2b2.HealthcareSystemDynamics.calcEngine.data.ageBucketized[idx1][pidxInt]) * (pidx - pidxInt))*1 + i2b2.HealthcareSystemDynamics.calcEngine.data.ageBucketized[idx1][pidxInt]*1;
								break;
						}
					}
				}
			}
		}

		// cleanup and turn into series for visualization
		var realReturn = [];
		var keys = d3.keys(ret).sort();
		keys.forEach(function(d) { if (!isNaN(ret[d])) { realReturn.push([(d*1 + bucketOffsetValue*1),ret[d]*1]); } }); // multiply stuff by 1 to force JSVM to do integer/float operations
		return realReturn;
		
	},
	
	
	

/* ============================ REFACTOR =========================== */	
	bucketizeData: function(arRecords, cntBucket, minBucket, maxBucket) {
		var ret = {};

		// build the buckets
		var range = [];
		for (var i=minBucket; i<maxBucket; i=i+((maxBucket - minBucket)/cntBucket)) {
			ret[i] = [];
			range.push(i);
		}
		ret['range'] = range;

		// setup the quantize scale
		var quantize = d3.scale.quantize().domain([minBucket, maxBucket]).range(range);
		ret['rangeQuantize'] = quantize;

		// process the records
		arRecords.forEach(function(d) {
			ret[quantize(d.age)].push(d.fact_count);
		});

		// sort all the ranges (THIS IS REQUIRED)
		ret.range.forEach(function(d) { ret[d] = ret[d].sort(function(a,b){ return (a*1 - b*1);}); });

		return ret;
	},
	bucketizeDataAuto: function(arRecords, configuration) {
		var ret = {};
			
		// find the min and max of the "attribute of interest"
		ret.rangedata = {
			value_func: configuration.funcExtractor,
			bucket_count: +configuration.bucketCnt,
			ranges: []
		}

		// deal with min and max values
		if (typeof configuration.min !== 'undefined') {
			ret.rangedata.min = +configuration.min;
		} else {
			if (typeof configuration.funcMin === 'function') {
				ret.rangedata.min = configuration.funcMin(arRecords, configuration.funcExtractor);
			} else {
				ret.rangedata.min = d3.min(arRecords, configuration.funcExtractor);
			}
		}
		if (typeof configuration.max !== 'undefined') {
			ret.rangedata.max = +configuration.max; 
		} else {
			if (typeof configuration.funcMax === 'function') {
				ret.rangedata.max = configuration.funcMax(arRecords, configuration.funcExtractor);
			} else {
				ret.rangedata.max = d3.max(arRecords, configuration.funcExtractor);
			}
		}
		
		// build the buckets
		ret.buckets = [];
		for (var i=0; i<ret.rangedata.bucket_count; i++) {
			ret.rangedata.ranges.push((((ret.rangedata.max - ret.rangedata.min)/ret.rangedata.bucket_count)*i)+ret.rangedata.min);
			ret.buckets[i] = [];
		}
		
		// setup the quantize scale
		ret.rangedata.quantizer = d3.scale.quantize().domain([ret.rangedata.min, ret.rangedata.max]).range(ret.rangedata.ranges);
		
		// process the records into buckets (each bucket's records are NOT sorted)
		arRecords.forEach(function(d) {
			ret.buckets[ret.rangedata.ranges.indexOf(ret.rangedata.quantizer(configuration.funcExtractor(d)))].push(d);
		});

		return ret;
	},
		
	xml2json: function(xmlDoc) {
		var temp_array = [];
		var pData = i2b2.h.XPath(xmlDoc, 'descendant::patient/param[@column]/text()/../..');
		for (var i1=0; i1<pData.length; i1++) {
			var temp = {};

			// get Patient_ID
			var aData = i2b2.h.XPath(pData[i1], 'descendant::patient_id/text()');
			try {
				temp.id = aData[0].nodeValue;
			} catch(e) {
				temp.id = null;
			}

			// get age
			var aData = i2b2.h.XPath(pData[i1], 'descendant::param[@column="age_in_years_num"]/text()');
			try {
				temp.age = aData[0].nodeValue;
			} catch(e) {
				temp.age = null;
			}


			// get 
			var aData = i2b2.h.XPath(pData[i1], 'descendant::param[@column="fact_count"]/text()');
			try {
				temp.fact_count = aData[0].nodeValue;
			} catch(e) {
				temp.fact_count = null;
			}

			temp_array.push(temp);
		}
		
		return temp_array;
	}

};