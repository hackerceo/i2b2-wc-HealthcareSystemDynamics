/**
 * @projectDescription	Visualizes locally computed Healthcare System Dynamics information.
 * @inherits	i2b2
 * @namespace	i2b2.HealthcareSystemDynamics
 * @author		Nick Benik
 * @version 	1.0
 * ----------------------------------------------------------------------------------------
 * 2016-06-08:  Initial Launch [Nick Benik]
 */


i2b2.HealthcareSystemDynamics.config = {
	height: 400,
	width: 800,
	margin: {
		top: 6,
		bottom: 40,
		left: 66,
		right: 20
	}
};
// "fact count by age" settings
i2b2.HealthcareSystemDynamics.cfg.config.d3 = {
	colors: 		d3.scale.category20(),
	chartWidth:		300,
	barHeight:		20,
	gapBetweenGroups:	10,
	spaceForLabels:	150,
    	spaceForLegend: 	150
};



i2b2.HealthcareSystemDynamics.Init = function(loadedDiv) {
	// allow multiple experiments to be dropped into the visualization
	i2b2.HealthcareSystemDynamics.model.prsExperiment = [];

	// register DIV as valid DragDrop target for Patient Record Sets (PRS) objects
	var op_trgt = {dropTarget:true};
	i2b2.sdx.Master.AttachType("HealthcareSystemDynamics-prsDropExperiment", "PRS", op_trgt);
	i2b2.sdx.Master.AttachType("HealthcareSystemDynamics-prsDropControl", "PRS", op_trgt);

	// drop event handlers used by this plugin
	i2b2.sdx.Master.setHandlerCustom("HealthcareSystemDynamics-prsDropExperiment", "PRS", "DropHandler", i2b2.HealthcareSystemDynamics.prsDroppedExperiment);
	i2b2.sdx.Master.setHandlerCustom("HealthcareSystemDynamics-prsDropControl", "PRS", "DropHandler", i2b2.HealthcareSystemDynamics.prsDroppedControl);

	// manage YUI tabs
	this.yuiTabs = new YAHOO.widget.TabView("HealthcareSystemDynamics-TABS", {activeIndex:0});
	this.yuiTabs.on('activeTabChange', function(ev) { 
		//Tabs have changed 
		if (ev.newValue.get('id')=="HealthcareSystemDynamics-TAB1") {
			// user switched to Results tab
			
			if (i2b2.HealthcareSystemDynamics.model.dirtyResultsData != true) { return true; }

			if (typeof i2b2.HealthcareSystemDynamics.model.prsControl == "object" && i2b2.HealthcareSystemDynamics.model.prsExperiment.length > 0) {

				// save are visualization parameters
				if (i2b2.h.isBadObjPath('i2b2.HealthcareSystemDynamics.model.options')) { i2b2.HealthcareSystemDynamics.model.options = {}; }
				i2b2.HealthcareSystemDynamics.model.options.ScaleY = document.querySelector('input[name="YAxisScale"]:checked').value;
				i2b2.HealthcareSystemDynamics.model.options.BucketSizeAge = document.querySelector('input[name="AgeBucketSize"]:checked').value;
				i2b2.HealthcareSystemDynamics.model.options.BucketSizeFactCount = document.querySelector('input[name="FactCountBuckets"]:checked').value;
				i2b2.HealthcareSystemDynamics.model.options.ShowStDev = document.querySelector('input[name="ShowStDev"]').checked;
				i2b2.HealthcareSystemDynamics.model.options.NormalizeHistograms = document.querySelector('input[name="HistogramValues"]:checked').value;

				i2b2.HealthcareSystemDynamics.model.options.SmoothLines = document.querySelector('input[name="SmoothLines"]').checked;
				i2b2.HealthcareSystemDynamics.model.options.ShowPatients = document.querySelector('input[name="ShowPatients"]').checked;
				i2b2.HealthcareSystemDynamics.model.options.ShowMean = document.querySelector('input[name="ShowMean"]').checked;
				i2b2.HealthcareSystemDynamics.model.options.ShowStDev = document.querySelector('input[name="ShowStDev"]').checked;

				// create a Joining Mutex (build into the core of the i2b2 webclient since release)
				var mux1 = i2b2.h.JoiningMutex.contextCreate(null, i2b2.HealthcareSystemDynamics.dataReturned, true);
				// clear previous data
				i2b2.HealthcareSystemDynamics.model.prsControl.PDO = false;
				for (var i=0; i< i2b2.HealthcareSystemDynamics.model.prsExperiment.length; i++) {
					i2b2.HealthcareSystemDynamics.model.prsExperiment[i].PDO = false;
				}

				// create scoped callback for the Control PRS (the JoiningMutex is managed via the callback scope)
				var scopedCallback1 = new i2b2_scopedCallback();
				scopedCallback1.scope = mux1;
				scopedCallback1.callback = function(results) {
					// this keyword is a reference to the JoiningMutex context interface instance for this thread
					i2b2.HealthcareSystemDynamics.model.prsControl.ajaxRet = results;
					var r = this.ThreadFinished();
					if (r.error) { console.warn(r.errorMsg); }
				};
				
				// fire off the requests
				var options1  = { 	patient_limit: 0, 
							PDO_Request: 
								'<input_list>\n' +
								'	<patient_list max="1000000" min="0">\n'+
								'		<patient_set_coll_id>'+i2b2.HealthcareSystemDynamics.model.prsControl.sdxInfo.sdxKeyValue+'</patient_set_coll_id>\n'+
								'	</patient_list>\n'+
								'</input_list>\n'+
								'<filter_list/>\n'+
								'<output_option>\n'+
								'	<patient_set select="using_input_list" onlykeys="false"/>\n'+
								'</output_option>\n'
						};
				i2b2.CRC.ajax.getPDO_fromInputList("PLUGIN:HealthcareSystemDynamics", options1, scopedCallback1);

				for (var i=0; i < i2b2.HealthcareSystemDynamics.model.prsExperiment.length; i++) {
					// create scoped callback for the Control PRS (the JoiningMutex is managed via the callback scope)
					var mux2 = i2b2.h.JoiningMutex.contextJoin(mux1.name());
					var scopedCallback2 = new i2b2_scopedCallback();
					scopedCallback2.scope = {
						mutex: mux2,
						model_idx: i						
					};
					scopedCallback2.callback = function(results) {
						// this keyword is a reference to the JoiningMutex context interface instance for this thread
						i2b2.HealthcareSystemDynamics.model.prsExperiment[this.model_idx].ajaxRet = results;
						var r = this.mutex.ThreadFinished();
						if (r.error) { console.warn(r.errorMsg); }
					};


					var options2  = { 	patient_limit: 0, 
							PDO_Request:
				 				'<input_list>\n' +
								'	<patient_list max="1000000" min="0">\n'+
								'		<patient_set_coll_id>'+i2b2.HealthcareSystemDynamics.model.prsExperiment[i].sdxInfo.sdxKeyValue+'</patient_set_coll_id>\n'+
								'	</patient_list>\n'+
								'</input_list>\n'+
								'<filter_list/>\n'+
								'<output_option>\n'+
								'	<patient_set select="using_input_list" onlykeys="false"/>\n'+
								'</output_option>\n'
						};
					i2b2.CRC.ajax.getPDO_fromInputList("PLUGIN:HealthcareSystemDynamics", options2, scopedCallback2);
				}
				

				
			}

			// temp display stuff
			d3.selectAll('.HealthcareSystemDynamics-MainContent .results-finished svg').remove();
			d3.select(".HealthcareSystemDynamics-MainContent .results-directions").style('display', 'none');
			d3.select(".HealthcareSystemDynamics-MainContent .results-legend").style('display', 'none');
			d3.select(".HealthcareSystemDynamics-MainContent .hsd-tabs").style('display', 'none');
			d3.select(".HealthcareSystemDynamics-MainContent .results-working").style('display', '');
			jQuery('#HealthcareSystemDynamics-mainDiv .results-finished').css('display', 'none');
		}
	});
	
	// setup inital visual state
	jQuery('#HealthcareSystemDynamics-mainDiv .results-finished').css('display', 'none');
	jQuery('#HealthcareSystemDynamics-mainDiv .results-legend').css('display', 'none');
	jQuery('#HealthcareSystemDynamics-mainDiv .results-legend-frame').css('display', 'none');
	jQuery('#HealthcareSystemDynamics-mainDiv .hsd-tabs').css('display', 'none');

	z = $('anaPluginViewFrame').getHeight() - 34;
	$$('DIV#HealthcareSystemDynamics-TABS DIV.HealthcareSystemDynamics-MainContent')[0].style.height = z;
	$$('DIV#HealthcareSystemDynamics-TABS DIV.HealthcareSystemDynamics-MainContent')[1].style.height = z;
	$$('DIV#HealthcareSystemDynamics-TABS DIV.HealthcareSystemDynamics-MainContent')[2].style.height = z;

	// connect click controllers to the results display tabs
	jQuery('#HealthcareSystemDynamics-mainDiv .hsd-tabs li.tab').on('click', function(e) {
		// handling hiding/showing of display elements
		jQuery('#HealthcareSystemDynamics-mainDiv .hsd-tabs li.tab').removeClass("selected");
		jQuery('#HealthcareSystemDynamics-mainDiv .hsd-tabs li.tab[data-tabnum="'+this.dataset.tabnum+'"]').addClass("selected");
		jQuery('#HealthcareSystemDynamics-mainDiv .results-finished').css('display', 'none');
		jQuery('#HealthcareSystemDynamics-mainDiv .results-finished[data-results-disp="'+this.dataset.tabnum+'"]').css('display', '');
	})
	
};


i2b2.HealthcareSystemDynamics.dataReturned = function(a, b) {
	i2b2.HealthcareSystemDynamics.visulizations = {};

	// default to the first tab display
	jQuery('#HealthcareSystemDynamics-mainDiv .hsd-tabs li.tab').removeClass("selected");
	jQuery('#HealthcareSystemDynamics-mainDiv .hsd-tabs li.tab[data-tabnum="1"]').addClass("selected");
	jQuery('#HealthcareSystemDynamics-mainDiv .hsd-tabs').css('display', '');
	jQuery('#HealthcareSystemDynamics-mainDiv .results-finished').css('display', 'none');
	jQuery('#HealthcareSystemDynamics-mainDiv .results-finished[data-results-disp="1"]').css('display', '');

	// delete all SVG elements
	d3.selectAll('.HealthcareSystemDynamics-MainContent .results-finished svg').remove();

	// REFACTOR: Build an array of all the patient sets
	var datasets_orig = [];
	var datasets = [];
	// the control patientset is always index [0]
	datasets_orig.push(i2b2.HealthcareSystemDynamics.model.prsControl);
	datasets.push(i2b2.HealthcareSystemDynamics.calcEngine.xml2json(i2b2.HealthcareSystemDynamics.model.prsControl.ajaxRet.refXML));
	// process the experiment patientsets
	for (var idx=0; idx<i2b2.HealthcareSystemDynamics.model.prsExperiment.length; idx++) {
		datasets_orig.push(i2b2.HealthcareSystemDynamics.model.prsExperiment[idx]);
		datasets.push(i2b2.HealthcareSystemDynamics.calcEngine.xml2json(i2b2.HealthcareSystemDynamics.model.prsExperiment[idx].ajaxRet.refXML));
	}
	// normalize the histogram data?
	switch(i2b2.HealthcareSystemDynamics.model.options.NormalizeHistograms) {
		case "Actual":
			var normalizeBuckets = false;
			break;
		case "Normalize":
			var normalizeBuckets = true;
			break;
	}


	// ============================================================================================
	// figure out how many buckets we need depending on the age resolution option
	switch(i2b2.HealthcareSystemDynamics.model.options.BucketSizeAge) {
		case "10yrs":
			var numOfBuckets = 10;
			break;
		case "1yrs":
			var numOfBuckets = 100;
			break;
	}
	var svgSize = {
		width: i2b2.HealthcareSystemDynamics.config.width,
		height: i2b2.HealthcareSystemDynamics.config.height
	};
	// build "Fact Count by Age" vizualization
	var svg = d3.select('.HealthcareSystemDynamics-MainContent .results-finished[data-results-disp="3"]').append('svg')
		.attr('width',  svgSize.width)
		.attr('height', svgSize.height).node();
	// Init the visualization
	i2b2.HealthcareSystemDynamics.multiIsoBar.init(svg);
	// feed the data to to the isobar visualization
	var json = i2b2.HealthcareSystemDynamics.calcEngine.generate2(i2b2.HealthcareSystemDynamics.model.prsControl, i2b2.HealthcareSystemDynamics.model.prsExperiment);
	i2b2.HealthcareSystemDynamics.model.vis_json = json;
	i2b2.HealthcareSystemDynamics.multiIsoBar.loadJson(json);

	// build the visualizations' legend
	var results_colors = {};
	d3.select(".HealthcareSystemDynamics-MainContent .results-legend").style("display", "").selectAll("*").remove();
	d3.select(".HealthcareSystemDynamics-MainContent div.results-legend").selectAll("div")
		.data(json.datagroups.filter(function(d) {
			try {
				if (d.legend == "formal") { return true; }
				if (Array.isArray(d.legend)) {
					if (d.legend.indexOf("formal") != -1) { return true; }
				}
			} catch(e) {}
		}))
		.enter()
		.append('div')
		.html(function(d,i) {
			if (d.label == "50%") {
				return "<b>&ndash;</b> " + i2b2.HealthcareSystemDynamics.model.prsControl.sdxInfo.sdxDisplayName;
			} else {
			return "&#9679; " + d.label;
			}
		})
		.style("color", function(d,i) {
			try {
				var tmp = d.colorset.split(',');
				results_colors[i] = colorbrewer[tmp[0]][tmp[1]][d.color];
				return results_colors[i];
			} catch(e) {}
		});
	i2b2.HealthcareSystemDynamics.config.colors = results_colors;


	// ============================================================================================
	// build "Age Histogram" vizualization (Bucket Range should be 0yr to 100yrs)
	i2b2.HealthcareSystemDynamics.visulizations.AgeHist = new i2b2.HealthcareSystemDynamics.classes.Histogram(datasets);
	i2b2.HealthcareSystemDynamics.visulizations.AgeHist.configureVisual(i2b2.HealthcareSystemDynamics.config);
	i2b2.HealthcareSystemDynamics.visulizations.AgeHist.setProcessorLib(i2b2.HealthcareSystemDynamics.calcEngine);
	i2b2.HealthcareSystemDynamics.visulizations.AgeHist.setSVG(
		d3.select('.HealthcareSystemDynamics-MainContent .results-finished[data-results-disp="1"]')
		  .append('svg')
		    .attr('width', svgSize.width)
		    .attr('height', svgSize.height).node()
	);
	// figure out how many buckets we need depending on the age resolution option
	switch(i2b2.HealthcareSystemDynamics.model.options.BucketSizeAge) {
		case "10yrs":
			var numOfBuckets = 10;
			break;
		case "1yrs":
			var numOfBuckets = 100;
			break;
	}
	var settings = {
		bucketCnt: numOfBuckets,
		funcExtractor: function(d) { return +d.age },
		min: 0,
		max: 100,
		axisTitleX: "Age in Years",
		axisFormatY: ",f"
	};
	if (normalizeBuckets === true) {
		settings.axisTitleY = "Density";
		settings.axisTicksY = 3;
	} else {
		settings.axisTitleY = "Number of Patients";
		settings.axisTicksY = 10;
	}

	// process the data
	i2b2.HealthcareSystemDynamics.visulizations.AgeHist.process(settings);
	// render the display
	i2b2.HealthcareSystemDynamics.visulizations.AgeHist.render(normalizeBuckets);


	// ============================================================================================
	// build "Fact Count Histogram" vizualization (Bucket Range should be 0 to patientset.max)
	i2b2.HealthcareSystemDynamics.visulizations.FactHist = new i2b2.HealthcareSystemDynamics.classes.Histogram(datasets);
	i2b2.HealthcareSystemDynamics.visulizations.FactHist.configureVisual(i2b2.HealthcareSystemDynamics.config);
	i2b2.HealthcareSystemDynamics.visulizations.FactHist.setProcessorLib(i2b2.HealthcareSystemDynamics.calcEngine);
	i2b2.HealthcareSystemDynamics.visulizations.FactHist.setSVG(
		d3.select('.HealthcareSystemDynamics-MainContent .results-finished[data-results-disp="2"]')
		  .append('svg')
		    .attr('width', svgSize.width)
		    .attr('height', svgSize.height).node()
	);
	// figure out how many buckets we need depending on the fact count bucket resolution option
	switch(i2b2.HealthcareSystemDynamics.model.options.BucketSizeFactCount) {
		case "10":
			var numOfBuckets = 10;
			break;
		case "100":
			var numOfBuckets = 100;
			break;
	}
	// process the data
	var settings = {
		bucketCnt: numOfBuckets,
		funcExtractor: function(d) { return +d.fact_count },
		min: 0,
		axisTitleX: "Patient Fact Count",
		axisFormatY: ",f"
	}
	if (normalizeBuckets === true) {
		settings.axisTitleY = "Density";
		settings.axisTicksY = 3;
	} else {
		settings.axisTitleY = "Number of Patients";
		settings.axisTicksY = 10;
	}
	settings.funcMax = function(d) { 
		var mx = d3.max(d, settings.funcExtractor);
		var dg = String(mx).length - 1;
		return Math.ceil(mx / Math.pow(10, dg)) * Math.pow(10, dg);
	};
	i2b2.HealthcareSystemDynamics.visulizations.FactHist.process(settings);
	// render the display
	i2b2.HealthcareSystemDynamics.visulizations.FactHist.render(normalizeBuckets);


	// hide GUI stuff
	d3.select(".HealthcareSystemDynamics-MainContent .results-working").style('display', 'none');

	// display all GUI elements
	jQuery('#HealthcareSystemDynamics-mainDiv .hsd-tabs').css('display', '');
	jQuery('#HealthcareSystemDynamics-mainDiv .results-legend').css('display', '');
	jQuery('#HealthcareSystemDynamics-mainDiv .results-legend-frame').css('display', '');
	d3.select(".HealthcareSystemDynamics-MainContent .results-finished").style('display', '');
};


i2b2.HealthcareSystemDynamics.Unload = function() {
	// purge old data
	i2b2.HealthcareSystemDynamics.dirtyData();
	delete i2b2.HealthcareSystemDynamics.model.prsRecords;
	return true;
};


i2b2.HealthcareSystemDynamics.dirtyData = function() {
	i2b2.HealthcareSystemDynamics.model.dirtyResultsData = true;
	delete i2b2.HealthcareSystemDynamics.model.sumCounts;
	delete i2b2.HealthcareSystemDynamics.model.attribNames;
};


i2b2.HealthcareSystemDynamics.prsDroppedControl = function(sdxData) {
	sdxData = sdxData[0];	// only interested in first record
	i2b2.HealthcareSystemDynamics.model.prsControl = sdxData;
	jQuery("#HealthcareSystemDynamics-prsDropControl").empty();
	jQuery("#"+sdxData.renderData.htmlID).clone().attr('data-prsid',sdxData.sdxInfo.sdxKeyValue).appendTo("#HealthcareSystemDynamics-prsDropControl");
	i2b2.HealthcareSystemDynamics.dirtyData();
};


i2b2.HealthcareSystemDynamics.prsDeleteExperiment = function(a) {
	var prsID = jQuery(this)[0].getAttribute('data-prsid');
	if (prsID !== null) {
		i2b2.HealthcareSystemDynamics.model.prsExperiment = i2b2.HealthcareSystemDynamics.model.prsExperiment.filter(function(d) { return (d.sdxInfo.sdxKeyValue != this)}, prsID);
		jQuery(this).remove();
		// add drop instructions again?
		if (jQuery("#HealthcareSystemDynamics-prsDropExperiment")[0].children.length == 0) {
			jQuery("#HealthcareSystemDynamics-prsDropExperiment").html(i2b2.HealthcareSystemDynamics.cfg.config.dropMsg);
		}
	}
};


i2b2.HealthcareSystemDynamics.prsDroppedExperiment = function(sdxData) {
	sdxData = sdxData[0];	// only interested in first record
	if (i2b2.HealthcareSystemDynamics.model.prsExperiment.length == 0) { jQuery("#HealthcareSystemDynamics-prsDropExperiment").empty(); }

	var tmp = i2b2.HealthcareSystemDynamics.model.prsExperiment.filter(
		function(d) { 
			if (d.sdxInfo.sdxKeyValue == sdxData.sdxInfo.sdxKeyValue) { 
				return true; 
			} else { 
				return false; 
			}
		}
	);
	if (tmp.length > 0) { return; }
	i2b2.HealthcareSystemDynamics.model.prsExperiment.push(sdxData);
	jQuery("#"+sdxData.renderData.htmlID).clone().attr('data-prsID',sdxData.sdxInfo.sdxKeyValue).appendTo("#HealthcareSystemDynamics-prsDropExperiment");
	i2b2.HealthcareSystemDynamics.dirtyData();
	// setup delete of patientset from experiment list when clicked
	jQuery("#HealthcareSystemDynamics-prsDropExperiment div").on("click", i2b2.HealthcareSystemDynamics.prsDeleteExperiment);
};


i2b2.HealthcareSystemDynamics.getPrsRecord = function(JoiningMutexThreadReference, prsData) {

	var msg_filter = '<input_list>\n' +
		'	<patient_list max="99999" min="0">\n' +
		'		<patient_set_coll_id>'+prsData.prsKey+'</patient_set_coll_id>\n'+
		'	</patient_list>\n'+
		'</input_list>\n'+
		'<filter_list />\n'+
		'<output_option><patient_set select="using_input_list" onlykeys="false"/></output_option>\n';

	// callback processor
	var scopedCallback = new i2b2_scopedCallback();
	scopedCallback.scope = JoiningMutexThreadReference;
	scopedCallback.callback = function(results) {
		// THIS function is used to process the AJAX results of the getChild call
		//		results data object contains the following attributes:
		//			refXML: xmlDomObject <--- for data processing
		//			msgRequest: xml (string)
		//			msgResponse: xml (string)
		//			error: boolean
		//			errorStatus: string [only with error=true]
		//			errorMsg: string [only with error=true]
		
		// check for errors
		if (results.error) {
			alert('The results from the server could not be understood.  Press F12 for more information.');
			console.error("Bad Results from Cell Communicator: ",results);
			return false;
		}

		if (typeof i2b2.HealthcareSystemDynamics.model.attribNames === 'undefined') { i2b2.HealthcareSystemDynamics.model.attribNames = {}; }

		// get all the patient records
		var pData = i2b2.h.XPath(results.refXML, 'descendant::patient/param[@column]/text()/..');
		var hData = new Hash();
		for (var i1=0; i1<pData.length; i1++) {
			var n = pData[i1].getAttribute('column');
			if (typeof i2b2.HealthcareSystemDynamics.model.attribNames[n] === 'undefined') {
				if (pData[i1].getAttribute('column_descriptor') !== null) {
					i2b2.HealthcareSystemDynamics.model.attribNames[n] = pData[i1].getAttribute('column_descriptor');
				} else {
					i2b2.HealthcareSystemDynamics.model.attribNames[n] = n;
				}
			}
			var t1 = hData.get(n);
			if (!t1) { t1 = new Hash(); }
			var v = pData[i1].firstChild.nodeValue;
			if (n=="birth_date") {
				v = v.substring(0, v.indexOf("T"));
			}
			var t2 = t1.get(v);
			if (!t2) {
				t2 = 1;
			} else {
				t2++;
			}
			t1.set(v, t2);
			hData.set(n, t1);
		}
			
		// collapse the hash objects to regular objects and save to the Plugin's data model
		if (typeof i2b2.HealthcareSystemDynamics.model.sumCounts == 'undefined') { i2b2.HealthcareSystemDynamics.model.sumCounts = {} }
		if (typeof i2b2.HealthcareSystemDynamics.model.attribNames == 'undefined') { i2b2.HealthcareSystemDynamics.model.attribNames = {} }
		i2b2.HealthcareSystemDynamics.model.sumCounts[prsData.prsKey] = eval("(" + Object.toJSON(hData) +")"); 

		// remove the topics that are to be ignored
		var keys = d3.keys(i2b2.HealthcareSystemDynamics.cfg.displayData.ignore);
		while (keys.length) {
			try {
				var t = keys.pop();
				delete i2b2.HealthcareSystemDynamics.model.attribNames[t];
				delete i2b2.HealthcareSystemDynamics.model.sumCounts[prsData.prsKey][t];
			} catch (e) {}
		}

		// Indicate to the JoiningMutex that this thread is finished
		this.ThreadFinished();
	};
				
	// AJAX CALL USING THE EXISTING CRC CELL COMMUNICATOR
	i2b2.CRC.ajax.getPDO_fromInputList("Plugin:HealthcareSystemDynamics", {PDO_Request: msg_filter}, scopedCallback);	
};


i2b2.HealthcareSystemDynamics.DataRetreved = function() {
	// optimization - only requery when the input data is changed
	i2b2.HealthcareSystemDynamics.model.dirtyResultsData = false;


	// generate a list of attributes from all the datasets
	var t1 = d3.keys(i2b2.HealthcareSystemDynamics.model.attribNames);
	while (t1.length) {
		var t2 = t1.pop();
		if (typeof i2b2.HealthcareSystemDynamics.cfg.displayData.translate[t2] == 'undefined') { i2b2.HealthcareSystemDynamics.cfg.displayData.translate[t2] = t2; }
	}
	var outputKeys = d3.keys(i2b2.HealthcareSystemDynamics.cfg.displayData.translate);


	// generate the data structure as it's used in the D3js example [http://bl.ocks.org/erikvullings/51cc5332439939f1f292]
	var outputData =  {
		labels: outputKeys.map(function(idx){return i2b2.HealthcareSystemDynamics.cfg.displayData.translate[idx]}), // DO NOT ASSUME that the return of d3.values/d3.keys will be in the same order!!
		series: []
	};

	// Bucketize the dimensions as defined in the configuration file
	var t1 = d3.keys(i2b2.HealthcareSystemDynamics.cfg.displayData.bucketize);
	while(t1.length) {
		var t2 = t1.pop();
		i2b2.HealthcareSystemDynamics.Bucketizer(t2);
	}



	// dump the values for display stuff [TODO Rework]
	var t1 = d3.keys(i2b2.HealthcareSystemDynamics.model.sumCounts);
	while (t1.length) {
		var t2 = t1.pop();
		var t3 = {
			label:	i2b2.HealthcareSystemDynamics.model.prsRecords[t2].sdxInfo.sdxDisplayName,
			values: outputKeys.map(function(idx){return i2b2.HealthcareSystemDynamics.model.sumCounts[t2][idx]})
		}
		outputData.series.push(t3);
	}

	// add the display SVG elements for each data dimension
	var root = d3.select('.HealthcareSystemDynamics-MainContent .results-finished');
	var svgs = root.selectAll('svg')
//			.data(d3.keys(i2b2.HealthcareSystemDynamics.model.prsRecords).map(function(idx) {return i2b2.HealthcareSystemDynamics.model.prsRecords[idx].sdxInfo}))
			.data(outputKeys)
			.enter()
				.append("svg")
				.classed("HealthcareSystemDynamics-SVG", true)
				.style({"border-top": "1px solid #000"})
				.each(function(dimension_key) {
					// ralph the data into the correct format for visualization
					var subvizdata = i2b2.HealthcareSystemDynamics.DataRalpher(dimension_key);
					// visualize the subgraph
					i2b2.HealthcareSystemDynamics.SubVisualize(this, subvizdata, dimension_key);
				});


	// show the SVGs
	root.style({display:''});
};

i2b2.HealthcareSystemDynamics.Bucketizer = function(dimension) { 
//return true;
	// check the configuration file to determine functional operation
	switch (typeof i2b2.HealthcareSystemDynamics.cfg.displayData.bucketize[dimension]) {
		case 'number':
			// bucketize into a fixed set of equal sized buckets between min(X) and max(X)
			var min = [];
			var max = [];
			var prsList = d3.keys(i2b2.HealthcareSystemDynamics.model.prsRecords);
			while (prsList.length) {
				var prs = prsList.pop();
				min.push(Math.min.apply(null, d3.keys(i2b2.HealthcareSystemDynamics.model.sumCounts[prs][dimension])));
				max.push(Math.max.apply(null, d3.keys(i2b2.HealthcareSystemDynamics.model.sumCounts[prs][dimension])));
			}
			// global min and max of all PRS
			min = Math.min.apply(null, min);
			max = Math.max.apply(null, max);
			// calculate bucket size
			var l = parseInt(i2b2.HealthcareSystemDynamics.cfg.displayData.bucketize[dimension]);
			var bucket_size = (max - min) / l;

			// generate the buckets
			var buckets = {};
			var prsList = d3.keys(i2b2.HealthcareSystemDynamics.model.prsRecords);
			while (prsList.length) {
				var prs = prsList.pop();
				if (typeof buckets[prs] === 'undefined') { buckets[prs] = []; }
				var vectors = d3.keys(i2b2.HealthcareSystemDynamics.model.sumCounts[prs][dimension]);
				for (var i2=0; i2<vectors.length; i2++) {
					var bucket_num = Math.floor((vectors[i2] - min) / bucket_size);
					if (typeof buckets[prs][bucket_num] === 'undefined') { buckets[prs][bucket_num] = 0; }
					buckets[prs][bucket_num] = buckets[prs][bucket_num] + i2b2.HealthcareSystemDynamics.model.sumCounts[prs][dimension][vectors[i2]];
				}
			}
			
			// save the new bucket aggregations
			var prsList = d3.keys(i2b2.HealthcareSystemDynamics.model.prsRecords);
			while (prsList.length) {
				var prs = prsList.pop();
				i2b2.HealthcareSystemDynamics.model.sumCounts[prs][dimension] = {};
				for (var i=0; i < buckets[prs].length; i++) {
					var key = d3.format(".2f")((bucket_size*i) + min) + "-" + d3.format(".2f")((bucket_size*(i+1)) + min);
					i2b2.HealthcareSystemDynamics.model.sumCounts[prs][dimension][key] = buckets[prs][i];
				}
			}
			delete buckets;
			break;
		case 'object':
			// bucketize items into the config-defined buckets
			var buckets = {};
			var prsList = d3.keys(i2b2.HealthcareSystemDynamics.model.prsRecords);
			while (prsList.length) {
				var prs = prsList.pop();
				var l = i2b2.HealthcareSystemDynamics.cfg.displayData.bucketize[dimension].length;
				for (var i=0; i<l; i++) {
					var start = i2b2.HealthcareSystemDynamics.cfg.displayData.bucketize[dimension][i][0];
					var end = i2b2.HealthcareSystemDynamics.cfg.displayData.bucketize[dimension][i][1];
					var key = String(start)+"-"+String(end);
					if (typeof buckets[prs] === 'undefined') { buckets[prs] = {}; }
					if (typeof buckets[prs][key] === 'undefined') { buckets[prs][key] = 0; }
					var vectors = d3.keys(i2b2.HealthcareSystemDynamics.model.sumCounts[prs][dimension]);
					for (var i2=0; i2<vectors.length; i2++) {
						if (start <= vectors[i2] && vectors[i2] <= end) {
							buckets[prs][key] = buckets[prs][key] + i2b2.HealthcareSystemDynamics.model.sumCounts[prs][dimension][vectors[i2]];
						}
					}
				}
			}
			// save the new bucket aggregations
			var prsList = d3.keys(i2b2.HealthcareSystemDynamics.model.prsRecords);
			while (prsList.length) {
				var prs = prsList.pop();
				i2b2.HealthcareSystemDynamics.model.sumCounts[prs][dimension] = buckets[prs];
			}
			delete buckets;
			break;
	}	
};

