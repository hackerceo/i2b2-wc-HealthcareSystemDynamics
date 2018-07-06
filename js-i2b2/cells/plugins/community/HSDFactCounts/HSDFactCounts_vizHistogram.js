/**
 * @projectDescription	Visualizes locally computed Healthcare System Dynamics information.
 * @inherits	i2b2
 * @namespace	i2b2.HSDFactCounts
 * @author		Nick Benik
 * @version 	1.0
 * ----------------------------------------------------------------------------------------
 * 2016-06-08:  Initial Launch [Nick Benik]
 */


if (typeof i2b2.HSDFactCounts.classes === "undefined") i2b2.HSDFactCounts.classes = {};

i2b2.HSDFactCounts.classes.Histogram = function(datasets) {
	this.datasets = datasets;
	this._internal = {};
	this.configureVisual = function(config) {
		/* === CONFIG DATA ===
		  - config.width
		  - config.height
		  - config.margin.top
		  - config.margin.right
		  - config.margin.bottom
		  - config.margin.left
		  - config.scale.x
		  - config.scale.y
		*/
		// PREVENT CRAZY LOGIC BUGS THAT CAUSE GRAY HAIR AND WASTED TIME!
		if (typeof config.width !== "undefined") config.width = +config.width;
		if (typeof config.height !== "undefined") config.height = +config.height;
		if (typeof config.margin !== "undefined") {
			if (typeof config.margin.top !== "undefined") config.margin.top = +config.margin.top;
			if (typeof config.margin.right !== "undefined") config.margin.right = +config.margin.right;
			if (typeof config.margin.bottom !== "undefined") config.margin.bottom = +config.margin.bottom;
			if (typeof config.margin.left !== "undefined") config.margin.left = +config.margin.left;
		}
		if (typeof config.scale !== "undefined") {
			// TODO: figure this out later
		}
		// Calculate stuff 
		config.calc = {
			width: config.width - config.margin.left - config.margin.right,
			height: config.height - config.margin.top - config.margin.bottom
		}
		this._internal.disp_config = config;
	};


	this.setSVG = function(el_svg) {
		this._internal.svg = el_svg;
	};

	this.setProcessorLib = function(processor_lib) {
		this._internal.lib_processor = processor_lib;
	};

	this.process = function(configuration) {
		this._internal.processConfig = configuration;
		this._internal.data = [];

		// handle the global min/max fuctions
		if (typeof configuration.funcMin === 'function') {
			configuration.min = [];
			this.datasets.forEach(function(d) { configuration.min.push(configuration.funcMin(d, configuration.funcExtractor)); });
			configuration.min = d3.max(configuration.min);
		}

		if (typeof configuration.funcMax === 'function') {
			configuration.max = [];
			this.datasets.forEach(function(d) { configuration.max.push(configuration.funcMax(d, configuration.funcExtractor)); });
			configuration.max = d3.max(configuration.max);
		}


		// process data into histograms
		for (idx=0; idx<this.datasets.length; idx++) {
			this._internal.data[idx] = this._internal.lib_processor.bucketizeDataAuto(this.datasets[idx], configuration);
		}
	};

	this.render = function(normalize_buckets) {
		// calculate some other display configuration stuff
		this._internal.disp_config.calc.barWidth = Math.floor(this._internal.disp_config.calc.width / this._internal.processConfig.bucketCnt) - 1;

		// restructure the data to a d3-friendly structure
		scratchpad = [];
		this._internal.data.forEach(
			(function(d,i) { 
				for( var i2=0; i2<d.buckets.length; i2++) {
					if (typeof d.buckets[i2].length !== 'undefined') {
						this.push([i, i2, d.buckets[i2].length]);
					} else {
						this.push([i, i2, d.buckets[i2]]);
					}
				}
			}).bind(scratchpad));
		redim_data = d3.nest()
			.key(function(d) { return d[1] })
			.key(function(d) { return d[0] })
			.rollup(function(v){ return v[0][2]; })
			.map(scratchpad);

		scratchpad = [];
		var k1 = d3.keys(redim_data);
		for (var i1=0; i1<k1.length; i1++) {
			var k2 = d3.keys(redim_data[i1]);
			scratchpad[i1] = [];
			for (var i2=0; i2<k2.length; i2++) {
				scratchpad[i1][i2] = redim_data[i1][i2];
			}
		}
		redim_data = scratchpad;
		delete scratchpad;

		// normalize if needed
		if (normalize_buckets === true) {
			// for each patientset normalize each bucket as (bucket-patient-count / total-patients-in-all-buckets)
			this._internal.processConfig.normalize = true;  // save for later
			patient_set_cnts = redim_data[0].length;
			for (var i1=0; i1<patient_set_cnts; i1++) {
				// find the scaling value
				var scaler = d3.sum(redim_data, function(d) { return d[i1]; });
				// rescale the dataset
				for (var i2=0; i2<redim_data.length; i2++) {
					redim_data[i2][i1] = redim_data[i2][i1] / scaler;
				}
			}
		} else {
			this._internal.processConfig.normalize = false; // save for later
		}
		
		// setup scales
		this.scales = {};
		this.scales.x = d3.scale.linear()
			.range([this._internal.disp_config.calc.barWidth / 2, this._internal.disp_config.calc.width - this._internal.disp_config.calc.barWidth / 2])
			.domain([0, this._internal.processConfig.bucketCnt-1]);
		var maxy = d3.max(redim_data, function(d) { return d3.max(d) });
		this.scales.y = d3.scale.linear()
			.range([this._internal.disp_config.calc.height, 0])
			.domain([0,maxy]);

		// offset for graph bars elements
		var graph = d3.select(this._internal.svg)
		    .attr("width", this._internal.disp_config.width)
		    .attr("height", this._internal.disp_config.height)
		  .append("g")
		    .attr("transform", "translate(" + this._internal.disp_config.margin.left + "," + this._internal.disp_config.margin.top + ")");

		// add the buckets
		var barWidth = this._internal.disp_config.calc.barWidth;
		var height = this._internal.disp_config.calc.height;
		var yScale = this.scales.y;
		var xScale = this.scales.x;
		var bins = graph.selectAll(".hsdHistBin")
			.data(redim_data)
			.enter().append("g")
				.attr("transform", function(d, i) { return "translate("+Math.round(xScale(i))+",0)"; })
				.attr("class", "hsdHistBin");

		// add the bars
		var child = bins.selectAll(".hsdHistBinBar")
			.data(function(d) { return d; })
			.enter().append("rect")
				.classed("hsdHistBinBar",true)
				.attr("name", function(d) { return d; })
				.attr("x", -barWidth/2 )
				.attr("width", barWidth )
				.attr("y", yScale)
				.attr("height", function(value) { return Math.round(height - yScale(value)); })
				.style('fill', (function(d,i) {
					if (typeof this._internal.disp_config.colors[i] !== 'undefined') {
						return this._internal.disp_config.colors[i];
					} else {
						return "#000";
					}
				}).bind(this));

		// add the scales
		var scalesEl = graph.append("g")
			.attr('data-histogram-scales',true);

		var baseX = this._internal.disp_config.calc.height;
		var baseY = 0;
		var barWidth = this._internal.disp_config.calc.barWidth;
		var bucketCnt = this._internal.processConfig.bucketCnt;
		// x axis
		scalesEl.append("line")
			.classed("histogram-x-axis",true)
			.attr("x1", baseY)
			.attr("x2", this._internal.disp_config.calc.width + baseY)
			.attr("y1", baseX)
			.attr("y2", baseX)
			.attr("stroke-width", 1)
			.attr("stroke", "black");

		var tempdata = this._internal.data[0].rangedata.ranges.slice();
		tempdata[this._internal.data[0].rangedata.bucket_count] = tempdata[this._internal.data[0].rangedata.bucket_count-1] + tempdata[1];
		// labels
		var xLabels = scalesEl.append("g");
		xLabels.selectAll(".hsdXLabels")
			.data(tempdata)
			.enter().append("text")
			.classed("hsdXLabels",true)
			.text(function(v, i) {
				if (bucketCnt == 10) {
					return Math.round(v);
				} else {
					if (i % 10 == 0) {
						return Math.round(v);
					}
				}
			})
			.attr("x", function (v,i) { 
				return xScale(i);
			})
			.attr("y", baseX - 10)
		xLabels.attr("transform","translate("+Math.round(-barWidth/2)+",28)");
		scalesEl.append("text")
			.attr("y", this._internal.disp_config.margin.top + this._internal.disp_config.calc.height)
			.attr("x", this._internal.disp_config.width /2 - this._internal.disp_config.margin.left/2)
			.attr("dy", "2.2em")
			.style("text-anchor", "middle")
			.style('font-weight', 'bold')
			.text(this._internal.processConfig.axisTitleX);


		// y axis
//		scalesEl.append("line")
//			.classed("histogram-y-axis",true)
//			.attr("x1", baseY)
//			.attr("x2", baseY)
//			.attr("y1", 0)
//			.attr("y2", baseX)
//			.attr("stroke-width", 1)
//			.attr("stroke", "black");



		// setup axes
		this.axis = {};
		this.axis.y = d3.svg.axis()
			.orient("left")
			.scale(this.scales.y)
			.tickPadding(6);
		// axis label
		this.axis.y.ticks(this._internal.processConfig.axisTicksY, this._internal.processConfig.axisFormatY);
		var yAxis = graph.append("g")
			.classed("hsdYAxis",true)
			.call(this.axis.y);
		yAxis.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 0 - this._internal.disp_config.margin.left)
			.attr("x",0 - (this._internal.disp_config.calc.height/ 2))
			.attr("dy", "1em")
			.style("text-anchor", "middle")
			.style('font-weight', 'bold')
			.text(this._internal.processConfig.axisTitleY);
	};
};
