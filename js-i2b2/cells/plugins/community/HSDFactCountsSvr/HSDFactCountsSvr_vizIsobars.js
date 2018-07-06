/**
 * @projectDescription	Visualizes locally computed Healthcare System Dynamics information.
 * @inherits	i2b2
 * @namespace	i2b2.HSDFactCountsSvr
 * @author		Nick Benik
 * @version 	1.0
 * ----------------------------------------------------------------------------------------
 * 2016-06-08:  Initial Launch [Nick Benik]
 */


i2b2.HSDFactCountsSvr.multiIsoBar = {
	_checkNested: function(obj /*, level1, level2, ... levelN*/) {
		var args = Array.prototype.slice.call(arguments, 1);
		for (var i = 0; i < args.length; i++) {
			if (!obj || !obj.hasOwnProperty(args[i])) {
				return false;
			}
			obj = obj[args[i]];
		}
		return true;
	},
	display_vars: {
		svg: null,
		x_scale: null,
		y_scale: null,
		margin: {
			top: 0,
			bottom: 40,
			left: 66,
			right: 14
		}
	},
	default: {
		path: {
			stroke: "8",
			color: "#ff00ff",
			fill: "none"
		},
		circle: {
			radius: 10,
			stroke: "1",
			color: "#ff00ff",
			fill: "#00ffff"
		}
	},
	data: null,
	loadJson: function(json) {
		// clear any previous graphic elements
		d3.select(this.display_vars.svg).selectAll("*").remove();

		// get the min/max of the coordinates within the datagroups
//		var x_min = d3.min(json.datagroups, function (set) { return d3.min(set.points, function(point) { return point[0]; }); });  // MOVE THIS BELOW
//		var y_min = d3.min(json.datagroups, function (set) { return d3.min(set.points, function(point) { return point[1]; }); });  // MOVE THIS BELOW
//		var x_max = d3.max(json.datagroups, function (set) { return d3.max(set.points, function(point) { return point[0]; }); });
		var x_max = 100; 
		var y_max = d3.max(json.datagroups, function (set) { return d3.max(set.points, function(point) { return point[1]; }); });
		var chartWidth = this.display_vars.svgWidth - this.display_vars.margin.left - this.display_vars.margin.right;
		var chartHeight = this.display_vars.svgHeight - this.display_vars.margin.top - this.display_vars.margin.bottom;

		// setup the scaler functions
		if (this._checkNested(json, 'axes','x','scale')) {
			switch(json.axes.x.scale) {
				case "linear":
					var x_min = 0;
					this.display_vars.x_scale = d3.scale.linear().range([0, chartWidth]).domain([x_min, x_max]);
					break;
				case "log":
					var x_min = 1;
					this.display_vars.x_scale = d3.scale.log().range([0, chartWidth]).domain([x_min, x_max]);
					break;
			}
		} else {
			// default to linear scale
			var x_min = 1;
			this.display_vars.x_scale = d3.scale.linear().range([0, chartWidth]).domain([x_min, x_max]);
		}
		if (this._checkNested(json, 'axes','y','scale')) {
			switch(json.axes.y.scale) {
				case "linear":
					var y_min = 0;
					this.display_vars.y_scale = d3.scale.linear().range([chartHeight, 0]).domain([y_min, y_max]);
					break;
				case "log":
					var y_min = 1;
					this.display_vars.y_scale = d3.scale.log().range([chartHeight, 0]).domain([y_min, y_max]);
					break;
			}
		} else {
			// default to linear scale
			var y_min = 1;
			this.display_vars.y_scale = d3.scale.log().range([chartHeight, 0]).domain([y_min, y_max]);
		}
		// setup the axis
		var xAxis = d3.svg.axis().scale(this.display_vars.x_scale)
				.orient('bottom')
				.innerTickSize(-chartHeight)
				.outerTickSize(0)
				.tickPadding(10);
		var yAxis = d3.svg.axis().scale(this.display_vars.y_scale)
				.orient('left')
				.innerTickSize(-chartWidth)
				.outerTickSize(0)
				.tickPadding(10)
				.ticks(5)
				.tickFormat((function(d) {
					return this.display_vars.y_scale.tickFormat(5, d3.format(".2s"))(d);
				}).bind(this));

		var axes = d3.select(this.display_vars.svg)
			.append('g')
			.classed('axes', true);

		axes.append('g')
			.attr('class', 'x axis')
			.attr('transform', 'translate(0,' + chartHeight + ')')
			.call(xAxis)
		    .append('text')
			.attr('transform', 'translate('+ ((chartWidth / 2)+40) +', 40)')
			.attr('y', 6)
			.attr('dy', '-.71em')
			.style('text-anchor', 'end')
			.style('font-weight', 'bold')
			.text((function() {
				if (typeof json.axes.x.label === "undefined") {
					return "";
				} else {
					return json.axes.x.label;
				}
			}).bind(this));

		axes.append('g')
			.attr('class', 'y axis')
			.call(yAxis)
		    .append('text')
			//.attr('transform', 'rotate(-90) translate(-240, -62)')
			.attr('transform', 'rotate(-90) translate(-140, -62)')
			.attr('y', 6)
			.attr('dy', '.71em')
			.style('text-anchor', 'end')
			.style('font-weight', 'bold')
			.text((function() {
				if (typeof json.axes.y.label === "undefined") {
					return "";
				} else {
					return json.axes.y.label;
				}
			}).bind(this));

		// add the clippath viewport
		var clipping = d3.select(this.display_vars.svg)
			.append('defs')
			.append('clipPath')
			.attr('id', 'viewport')
			.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', chartWidth)
			.attr('height', chartHeight);
		
		this.render.call(this, json);
	},
	loadURL: function(url) {
		d3.json(data_url, (function(error, json) {
			if (error) return console.warn(error);
			this.loadJson(json);
		}).bind(this));
	},
	init: function(svg, data_url) {
		this.display_vars.svg = svg;
		this.display_vars.svgHeight = svg.height.baseVal.value;
		this.display_vars.svgWidth = svg.width.baseVal.value;
		this.display_vars.svg = d3.select(svg)
						.append('g')
						.attr('transform', 'translate(' + this.display_vars.margin.left + ',' + this.display_vars.margin.top + ')')[0][0];

		if (typeof data_url == "string") { 
			this.loadURL(data_url).bind(this);
		}
	},
	render: function(data) {
		for (var i=0; i<data.datagroups.length; i++) {
			switch (data.datagroups[i].type) {
				case "line":
					this.drawPath.call(this, data.datagroups[i]);
					break;
				case "points":
					if (i2b2.HSDFactCountsSvr.model.options.ShowPatients) this.drawPoints.call(this, data.datagroups[i]);
					break;
				case "meanPoint":
					if (i2b2.HSDFactCountsSvr.model.options.ShowMean) this.drawMeanPoint.call(this, data.datagroups[i]);
					break;
				case "ellipse":
					if (i2b2.HSDFactCountsSvr.model.options.ShowStDev) this.drawEllipse.call(this, data.datagroups[i]);
					break;
			}
		}
		//for (var i=0; i<data.datagroups.length; i++) {
		for (var i=data.datagroups.length-1; i>=0; i--) {
			switch (data.datagroups[i].type) {
				case "line":
					this.drawPathLabel.call(this, data.datagroups[i]);
					break;
			}
		}

	},
	drawEllipse: function(groupdata) {
		// ellipse data format [x, y, [radius_x, radius_y], ID, tooltip]
  		var ellipseGroup = d3.select(this.display_vars.svg).append('g')
				.attr("id", function(d) { return groupdata.id; })
				.selectAll("ellipse")
					.data(groupdata.points)
					.enter().append("ellipse")
						.attr("rx", (function (d) { return this.display_vars.x_scale(d[2][0]); }).bind(this))
						//.attr("ry", (function (d) { return this.display_vars.y_scale(0) - this.display_vars.y_scale(d[2][1]); }).bind(this))
						//.attr("ry", (function (d) { return this.display_vars.y_scale(d[2][1]); }).bind(this))
						//.attr("transform", (function(d) { return "translate("+this.display_vars.x_scale(d[0])+","+this.display_vars.y_scale(d[1])+")"; }).bind(this))

						.attr("ry", (function (d) {
								var eTop = this.display_vars.y_scale(d[1] + d[2][1]);
								var eBot = this.display_vars.y_scale(d[1] - d[2][1]);
								return (eBot - eTop)/2;
						}).bind(this))
						.attr("transform", (function(d) {
								var eTop = this.display_vars.y_scale(d[1] + d[2][1]);
								var eBot = this.display_vars.y_scale(d[1] - d[2][1]);
								return "translate("+this.display_vars.x_scale(d[0])+","+((eTop+eBot)/2)+")";
						}).bind(this))

						.style("fill", (function(d) {
							var color = 0;
							if (typeof groupdata.color !== 'undefined') {
								if (typeof groupdata.colorset !== 'undefined') {
									var tmp = groupdata.colorset.split(',');
									if (typeof colorbrewer[tmp[0]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]][groupdata.color] !== 'undefined') {
										color = colorbrewer[tmp[0]][tmp[1]][groupdata.color];
									}
								} else {
									color = groupdata.color;
								}
							}
							// DISPLAY HACK!!! (override everything if 10px or bigger)
							color = d3.rgb(color);
							color = "rgba("+color.r+","+color.g+","+color.b+",0.1)";
							return color;
						}).bind(this))
						.style("stroke", (function(d) {
							var color = 0;
							if (typeof groupdata.color !== 'undefined') {
								if (typeof groupdata.colorset !== 'undefined') {
									var tmp = groupdata.colorset.split(',');
									if (typeof colorbrewer[tmp[0]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]][groupdata.color] !== 'undefined') {
										color = colorbrewer[tmp[0]][tmp[1]][groupdata.color];
									}
								} else {
									color = groupdata.color;
								}
							}
							// DISPLAY HACK!!! (override everything if 10px or bigger)
							color = d3.rgb(color);
							color = "rgb("+color.r+","+color.g+","+color.b+")";
							return color;
						}).bind(this))


	},
	drawPoints: function(groupdata) {
		// points data format [x, y, radius, ID, tooltip]
		// we need to use closures to access the groupdata information within the D3js functions

		var getRadius = (function(d) {
					return false;
				}).bind(this);

  		var circleGroup = d3.select(this.display_vars.svg).append('g')
				.attr("id", function(d) { return groupdata.id; })
				.selectAll("circle")
					.data(groupdata.points)
					.enter().append("circle")
						.attr("cx", (function (d) { return this.display_vars.x_scale(d[0]); }).bind(this))
						.attr("cy", (function (d) { return this.display_vars.y_scale(d[1]); }).bind(this))
						.attr("r", (function (d) { 
							var radius = 3;
							if (!i2b2.h.isBadObjPath.call(this, 'this.default.circle.radius')) {
								var radius = this.default.circle.radius;
							}
							if (!i2b2.h.isBadObjPath.call(groupdata, 'this.style.radius')) {
								var radius = groupdata.style.radius;
							}
							if (d[2] !== null) {
								var radius = d[2];
							}
							return radius;
						}).bind(this))
						.style("fill", (function(d) {
							var color = this.default.circle.color;
							if (typeof groupdata.color !== 'undefined') {
								if (typeof groupdata.colorset !== 'undefined') {
									var tmp = groupdata.colorset.split(',');
									if (typeof colorbrewer[tmp[0]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]][groupdata.color] !== 'undefined') {
										color = colorbrewer[tmp[0]][tmp[1]][groupdata.color];
									}
								} else {
									color = groupdata.color;
								}
							}
							// DISPLAY HACK!!! (override everything if 10px or bigger)
							var colorRGB = d3.rgb(color);
							color = "rgba("+colorRGB.r+","+colorRGB.g+","+colorRGB.b+",0.25)";
							if (d[2] !== null) {
								if (d[2] >= 10) {
									//color = d3.rgb(color);
									color = "rgba("+colorRGB.r+","+colorRGB.g+","+colorRGB.b+",0.25)";
								}
							}
							return color;
						}).bind(this))
						.attr("stroke", (function(d) {
							var color = this.default.circle.color;
							if (typeof groupdata.color !== 'undefined') {
								if (typeof groupdata.colorset !== 'undefined') {
									var tmp = groupdata.colorset.split(',');
									if (typeof colorbrewer[tmp[0]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]][groupdata.color] !== 'undefined') {
										color = colorbrewer[tmp[0]][tmp[1]][groupdata.color];
									}
								} else {
									color = groupdata.color;
								}
							}
							return color;
						}).bind(this))
						//.attr("stroke-width", "1")
						.attr("stroke-width", (function(d) {
							if (d[2] !== null) {
								if (d[2] >= 10) {
									return "3";
								}
							}
							return "1";
						}).bind(this))
						.append("svg:title")
							.text((function(d) {
								if (typeof this.label !== 'undefined') {
									return "["+this.label+"] "+d[2];
								} else {
									return d[2];
								}
							}).bind(groupdata));
	},
	drawMeanPoint: function(groupdata) {
		// points data format [x, y, radius, ID, tooltip]
		// we need to use closures to access the groupdata information within the D3js functions

		var getRadius = (function(d) {
					return false;
				}).bind(this);
	
  		var circleGroup = d3.select(this.display_vars.svg).append('g')
				.attr("id", function(d) { return groupdata.id; })
				.selectAll("rect")
					.data(groupdata.points)
					.enter().append("rect")
						//.attr("x", (function (d) { return this.display_vars.x_scale(d[0]) - 10; }).bind(this))
						//.attr("y", (function (d) { return this.display_vars.y_scale(d[1]) - 10; }).bind(this))
						.attr("width","20")
						.attr("height","20")
						.attr("transform", (function(d) {
							return "translate("+this.display_vars.x_scale(d[0])+","+(this.display_vars.y_scale(d[1])-14)+")rotate(45)";
						}).bind(this))
						.style("fill", (function(d) {
							var color = this.default.circle.color;
							if (typeof groupdata.color !== 'undefined') {
								if (typeof groupdata.colorset !== 'undefined') {
									var tmp = groupdata.colorset.split(',');
									if (typeof colorbrewer[tmp[0]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]][groupdata.color] !== 'undefined') {
										color = colorbrewer[tmp[0]][tmp[1]][groupdata.color];
									}
								} else {
									color = groupdata.color;
								}
							}
							// DISPLAY HACK!!! (override everything if 10px or bigger)
							var colorRGB = d3.rgb(color);
							color = "rgba("+colorRGB.r+","+colorRGB.g+","+colorRGB.b+",0.25)";
							if (d[2] !== null) {
								if (d[2] >= 10) {
									//color = d3.rgb(color);
									color = "rgba("+colorRGB.r+","+colorRGB.g+","+colorRGB.b+",0.25)";
								}
							}
							return color;
						}).bind(this))
						.attr("stroke", (function(d) {
							var color = this.default.circle.color;
							if (typeof groupdata.color !== 'undefined') {
								if (typeof groupdata.colorset !== 'undefined') {
									var tmp = groupdata.colorset.split(',');
									if (typeof colorbrewer[tmp[0]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]][groupdata.color] !== 'undefined') {
										color = colorbrewer[tmp[0]][tmp[1]][groupdata.color];
									}
								} else {
									color = groupdata.color;
								}
							}
							return color;
						}).bind(this))
						.attr("stroke-width", "2")
						.append("svg:title")
							.text((function(d) {
								if (typeof this.label !== 'undefined') {
									return "["+this.label+"] "+d[2];
								} else {
									return d[2];
								}
							}).bind(groupdata));
	},
	drawPath: function(groupdata) {
		var lineFunc = d3.svg.line()
					.interpolate('linear')
					.x((function (d) { 
						return this.display_vars.x_scale(d[0]); }).bind(this))
					.y((function (d) { 
						return this.display_vars.y_scale(d[1]); }).bind(this));

  		var lineGroup = d3.select(this.display_vars.svg).append('path')
					.attr("id", function(d) { return groupdata.id; })
					.datum(groupdata.points)
					.style('stroke', (function(d) {
						var color = this.default.path.color;
						if (typeof groupdata.color !== 'undefined') {
							if (typeof groupdata.colorset !== 'undefined') {
								var tmp = groupdata.colorset.split(',');
								if (typeof colorbrewer[tmp[0]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]] !== 'undefined' && typeof colorbrewer[tmp[0]][tmp[1]][groupdata.color] !== 'undefined') {
									color = colorbrewer[tmp[0]][tmp[1]][groupdata.color];
								}
							} else {
								color = groupdata.color;
							}
						}
						return color;
					}).bind(this))
					.style('stroke-width', (function(d) {
						if (typeof groupdata.stroke !== 'undefined') {
							return groupdata.stroke;
						} else {
							return this.default.path.stroke;
						}
					}).bind(this))
					.style('fill', (function(d) {
						if (typeof groupdata.fill !== 'undefined') {
							return groupdata.fill;
						} else {
							return this.default.path.fill;
						}
					}).bind(this))
					.attr('d', lineFunc);



	},
	drawPathLabel: function(groupdata) {
		try {
			var showLegend = false;
			if (Array.isArray(groupdata.legend)) {
				if (groupdata.legend.indexOf("graph") != -1) { showLegend = true; }
			} else { 
				if (groupdata.legend == "graph") { showLegend = true; }
			}

			if (showLegend) {
				// find the right-most data point
				var temp = groupdata.points.filter(function(d) { return (d[0]==this); }, d3.max(groupdata.points.map(function(d) { return d[0]; })))
				temp = temp[0];
				var valX = temp[0];
				var valY = temp[1];

				d3.select(this.display_vars.svg).append('rect')
					.attr("x", Math.floor(this.display_vars.x_scale(valX))+3)
					.attr("y", Math.floor(this.display_vars.y_scale(valY))-5)
					.attr("width", "25")
					.attr("height", "13")
					.style("stroke", "grey")
					.style("stroke-width", "1")
					.style("shape-rendering", "crispEdges")
					.style("fill", "rgba(255,255,255,1)");

				// add the text display
				d3.select(this.display_vars.svg).append('text')
					.classed("graphLegend", true)
					.attr("x", Math.floor(this.display_vars.x_scale(valX)))
					.attr("y", Math.floor(this.display_vars.y_scale(valY)))
					.attr("transform", "translate(5,5)")
					.text(groupdata.label);
					
			}
		} catch (e) {}
	}
};
