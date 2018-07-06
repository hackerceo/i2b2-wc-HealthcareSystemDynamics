/**
 * @projectDescription	Visualizes locally computed Healthcare System Dynamics information.
 * @inherits	i2b2
 * @namespace	i2b2.HSDFactCountsSvr
 * @author		Nick Benik
 * @version 	1.0
 * ----------------------------------------------------------------------------------------
 * 2016-06-08:  Initial Launch [Nick Benik]
 */


i2b2.HSDFactCountsSvr.config = {
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
i2b2.HSDFactCountsSvr.cfg.config.d3 = {
	colors: 		d3.scale.category20(),
	chartWidth:		300,
	barHeight:		20,
	gapBetweenGroups:	10,
	spaceForLabels:	150,
    	spaceForLegend: 	150
};



i2b2.HSDFactCountsSvr.Init = function(loadedDiv) {
	// This plugin uses a server-side plugin hosted by the CRC cell. We need to copy data over to make our custom communication calls work
    i2b2.HSDFactCountsSvr.cfg.cellURL = i2b2.CRC.cfg.cellURL;

	// allow multiple experiments to be dropped into the visualization
	i2b2.HSDFactCountsSvr.model.prsExperiment = [];

	// register DIV as valid DragDrop target for Patient Record Sets (PRS) objects
	var op_trgt = {dropTarget:true};
	i2b2.sdx.Master.AttachType("HSDFactCountsSvr-prsDropExperiment", "PRS", op_trgt);
	i2b2.sdx.Master.AttachType("HSDFactCountsSvr-prsDropControl", "PRS", op_trgt);

	// drop event handlers used by this plugin
	i2b2.sdx.Master.setHandlerCustom("HSDFactCountsSvr-prsDropExperiment", "PRS", "DropHandler", i2b2.HSDFactCountsSvr.prsDroppedExperiment);
	i2b2.sdx.Master.setHandlerCustom("HSDFactCountsSvr-prsDropControl", "PRS", "DropHandler", i2b2.HSDFactCountsSvr.prsDroppedControl);


// hack to preload the server-side data
//jQuery.get("js-i2b2/cells/plugins/community/HSDFactCountsSvr/assets/HSD_AGE_FACTS.xml", function(data) {
//	i2b2.HSDFactCountsSvr.model.serverSide = data;
//});

	// manage YUI tabs
	this.yuiTabs = new YAHOO.widget.TabView("HSDFactCountsSvr-TABS", {activeIndex:0});
	this.yuiTabs.on('activeTabChange', function(ev) {
		//Tabs have changed
		if (ev.newValue.get('id')=="HSDFactCountsSvr-TAB1") {
			// user switched to Results tab
			
			if (i2b2.HSDFactCountsSvr.model.dirtyResultsData != true) { return true; }

			if (typeof i2b2.HSDFactCountsSvr.model.prsControl == "object" && i2b2.HSDFactCountsSvr.model.prsExperiment.length > 0) {

				// save are visualization parameters
				if (i2b2.h.isBadObjPath('i2b2.HSDFactCountsSvr.model.options')) { i2b2.HSDFactCountsSvr.model.options = {}; }
				i2b2.HSDFactCountsSvr.model.options.ScaleY = document.querySelector('input[name="YAxisScale"]:checked').value;
				i2b2.HSDFactCountsSvr.model.options.BucketSizeAge = document.querySelector('input[name="AgeBucketSize"]:checked').value;
				i2b2.HSDFactCountsSvr.model.options.BucketSizeFactCount = document.querySelector('input[name="FactCountBuckets"]:checked').value;
				i2b2.HSDFactCountsSvr.model.options.ShowStDev = document.querySelector('input[name="ShowStDev"]').checked;
				i2b2.HSDFactCountsSvr.model.options.NormalizeHistograms = document.querySelector('input[name="HistogramValues"]:checked').value;

				i2b2.HSDFactCountsSvr.model.options.SmoothLines = document.querySelector('input[name="SmoothLines"]').checked;
				i2b2.HSDFactCountsSvr.model.options.ShowPatients = document.querySelector('input[name="ShowPatients"]').checked;
				i2b2.HSDFactCountsSvr.model.options.ShowMean = document.querySelector('input[name="ShowMean"]').checked;
				i2b2.HSDFactCountsSvr.model.options.ShowStDev = document.querySelector('input[name="ShowStDev"]').checked;

				// REFACTOR: This is class encapsulates the multi-step process that needs to be performed on each
				// PatientRecordSet to calculate and extract/retreve the server-side calculated statistics
				function classPrsProcessingPipeline(sdxPRS_data, refSelf, callback) {
					if (typeof refSelf === "undefined") {
						throw "function classPrsProcessingPipeline() expects a valid refSelf parameter in its constructor!";
					}
					this.refSelf = refSelf;
					this.sdx = sdxPRS_data;
					this.FSM_State = 0;
					this.FSM_Max_State = 4;
					this.callback = callback;
                    this.percentFinished = 0;
                    this.error = false;
                    this.done = false;
                    // ----------------------------------------------------------------
					var doCallback = (function () {
						if (typeof this.callback === "function") {
                            this.callback(this.error, this);
                        } else {
							throw "Callback not defined!";
						}
                    }).bind(this);
                    // ----------------------------------------------------------------
					this.run = function(AJAX_results) {
						if (this.done || this.error) return false;
                        this.percentFinished = Math.ceil(((this.FSM_State) / this.FSM_Max_State) * 100);
						console.info("FSM State:" + this.FSM_State);

                        switch(this.FSM_State) {
                            case 0: // State: Initialization
                                this.idPRS = this.sdx.origData.PRS_id;
                                this.idQI = this.sdx.origData.QI_id;
                                this.idQM = this.sdx.origData.QM_id;
                                delete this.hsdQM;
                                delete this.hsdQRI;
                                delete this.refSelf.statisticsXML;
                                delete this.refSelf.hsdQRI;
                                this.FSM_State++;
                                // run the first CRC call
                                this.run();
                                break;
                            case 1: // State: Run HSD Calculation
								try {
                                    // fire off the request for the Control patient set
                                    i2b2.HSDFactCountsSvr.ajax.getFactCountSummary("PLUGIN:HSDFactCountsSvr", {"result_instance_id": +this.idPRS}, this.run.bind(this));
	                                this.FSM_State++;
    	            	        } catch(e) {
        	    	                this.error = true;
                                    doCallback();
            	        	    }
                                break;
							case 2: // State: Hide the HSD node in the UI query list, Get QueryResultInstanceList for the PRS given in SDX data
                                try {
                                    // delete the QueryMaster generated by the server-side analysis plugin (cleans up GUI display)
                                    this.hsdQM = i2b2.h.XPath(AJAX_results.refXML, 'descendant::query_instance/query_master_id/text()/..')[0].firstChild.nodeValue;

                                    // AJAX: delete generated HSD query master from GUI
									i2b2.CRC.ajax.deleteQueryMaster("PLUGIN:HSDFactCountsSvr", {result_wait_time: 180, qm_key_value: this.hsdQM});
                                    // AJAX: Get the refreshed Query Results Instance list, it now contains an entry for HSD data
                                    i2b2.CRC.ajax.getQueryResultInstanceList_fromQueryInstanceId("PLUGIN:HSDFactCountsSvr", {qi_key_value: this.idQI}, this.run.bind(this));
        	                        this.FSM_State++;
								} catch(e) {
									this.error = true;
                                    doCallback();
								}
                                break;
                            case 3: // State: Find the HSD Calculation data in the returned QRI listing and retrieve the HSD data
                                try {
                                    this.refSelf.hsdQRI = i2b2.h.XPath(AJAX_results.refXML, 'descendant::query_result_instance/query_result_type/name[text()="HSD_AGE_FACTS_XML"]/../../result_instance_id')[0].firstChild.nodeValue;
                                    // retreve calculated statistics from the server
                                    i2b2.CRC.ajax.getQueryResultInstanceList_fromQueryResultInstanceId("Plugin:HSDFactCountsSvr", {qr_key_value: this.refSelf.hsdQRI}, this.run.bind(this));
                                    this.FSM_State++;
								} catch(e) {
									this.error = true;
                                    doCallback();
								}
								break;
							case 4: // State: HSD statistics data returned, Inject the extracted/cleaned HSD data into the plugin's global data
								try {
                                    var resultEnvelopeXml = i2b2.h.XPath(AJAX_results.refXML, 'descendant::xml_value/text()/..')[0].firstChild.nodeValue;
                                    resultEnvelopeXml = resultEnvelopeXml.replace((new RegExp('&lt;', 'g')), '<');
                                    resultEnvelopeXml = resultEnvelopeXml.replace((new RegExp('&gt;', 'g')), '>');
                                    // save results to global scope
                                    this.refSelf.ajaxRet = AJAX_results;
                                    this.refSelf.ajaxRet.statisticsXML = i2b2.h.parseXml(resultEnvelopeXml);
                                    this.done = true;
                                    doCallback();
								} catch(e) {
                            		this.error = true;
                                    doCallback();
								}
                                break;
						}
						return true;
					};
				};

				// helper object used to process records sequentially or in parallel
				var pipelinePump = function(prsArray, finished_callback) {
					this.pipelines = [];
					this.callback = finished_callback;
					this.serial = false;
					this.percentFinished = 0;
					this.errors = false;

                    // ----------------------------------------------------------------
					this._internalCB = (function(error) {
						if (typeof error === "boolean" && error === true) {
							this.errors = true;
						}
						if (this.serial === true) {
							var nextExec = this.pipelines.find(function(v){
								if (!v.done && !v.error) return true;
                            });
							if (typeof nextExec === "undefined") {
								// no unexecuted pipelines found
                                this.percentFinished = 100;
								this.callback(this.pipelines);
							} else {
								// run the first unexecuted pipeline found
								var success = nextExec.run();
								if (success === false) {
									this.errors = true;
                                }
							}
						}
					}).bind(this);
                    // ----------------------------------------------------------------
					this.run = function(serial) {
                        this.serial = serial;
                        if (this.serial === true) {
                        	// serial calculation of PRSs
                        	this._internalCB();
                        } else {
                        	// parallel calculations of PRSs
							this.pipelines.forEach(function(prsPipeline){
                                prsPipeline.run();
							});
						}
					};

					// ----------------------------------------------------------------
					this.getProgress = function() {
                        if (this.pipelines.length == 0) {
                            this.percentFinished = 0;
	                    } else {
                            var t1 = this.pipelines.reduce(function (acc, val) {
                            	if (typeof acc === "object") {
                            		if (acc.error || acc.finished) {
                            			acc = 100;
                                    } else {
                                        acc = acc.percentFinished;
									}
                                }
                                if (val.error || val.finished) {
                                    return acc + 100;
                                } else {
                                    return acc + val.percentFinished;
                                }
                            });
                            this.percentFinished = Math.ceil((t1 / this.pipelines.length) * 100) / 100;
                        }
                        return this.percentFinished;
					};
                    // ----------------------------------------------------------------


                    // build the pipelines array using prsArray parameter
                    for (var i=0; i<prsArray.length; i++) {
                        this.pipelines.push(new classPrsProcessingPipeline(prsArray[i], prsArray[i], this._internalCB));
                    }
				};

                // helper object to display the processing status at regular interval
                var uiProcessingUpdater = function(PipePump) {
                    this.percentComplete = 0;
                    this.pipepump = PipePump;
                    // ----------------------------------------------------------------
                    this.tick = (function() {
                        this.percentComplete = this.pipepump.getProgress();
						var val = this.percentComplete + "%";

                        jQuery(".results-working-bar")
							.text(val)
							.css("width",val);

                        if (this.pipepump.errors) {
                        	// red progress bar if an error occured
                            jQuery(".results-working-bar").css("backgroundColor", "#cc1d1d");
						}

                        if (this.percentComplete >= 100) {
                            clearInterval(this.hdl_interval);
                        }
                    }).bind(this);
                    // ----------------------------------------------------------------
                    this.start = (function(msec) {
                        this.tick();
                        this.hdl_interval = setInterval((function(){this.tick()}).bind(this), msec);
                    }).bind(this);
                };

                // create an array of PRS to feed to the pipelinePump helper object
                var prsData = [];
                prsData.push(i2b2.HSDFactCountsSvr.model.prsControl);
                for (var i=0; i<i2b2.HSDFactCountsSvr.model.prsExperiment.length; i++) {
                    prsData.push(i2b2.HSDFactCountsSvr.model.prsExperiment[i]);
                }
                // create an instance of pipelinePump using list of all PRSs
                var prsPipePump = new pipelinePump(prsData, i2b2.HSDFactCountsSvr.dataReturned);
                // create an instance
                var uiUpdateTimer = new uiProcessingUpdater(prsPipePump);
                // start the updater and then the processing pipeline for all PRS objects specified in visualization
                uiUpdateTimer.start(1000);
				prsPipePump.run(true);  // run in serial mode


			}

			// temp display stuff
			d3.selectAll('.HSDFactCountsSvr-MainContent .results-finished svg').remove();
			d3.select(".HSDFactCountsSvr-MainContent .results-directions").style('display', 'none');
			d3.select(".HSDFactCountsSvr-MainContent .results-legend").style('display', 'none');
			d3.select(".HSDFactCountsSvr-MainContent .hsd-tabs").style('display', 'none');
			d3.select(".HSDFactCountsSvr-MainContent .results-working").style('display', '');
			jQuery('#HSDFactCountsSvr-mainDiv .results-finished').css('display', 'none');
		}
	});
	
	// setup inital visual state
	jQuery('#HSDFactCountsSvr-mainDiv .results-finished').css('display', 'none');
	jQuery('#HSDFactCountsSvr-mainDiv .results-legend').css('display', 'none');
	jQuery('#HSDFactCountsSvr-mainDiv .results-legend-frame').css('display', 'none');
	jQuery('#HSDFactCountsSvr-mainDiv .hsd-tabs').css('display', 'none');

	z = $('anaPluginViewFrame').getHeight() - 34;
	$$('DIV#HSDFactCountsSvr-TABS DIV.HSDFactCountsSvr-MainContent')[0].style.height = z;
	$$('DIV#HSDFactCountsSvr-TABS DIV.HSDFactCountsSvr-MainContent')[1].style.height = z;
	$$('DIV#HSDFactCountsSvr-TABS DIV.HSDFactCountsSvr-MainContent')[2].style.height = z;

	// connect click controllers to the results display tabs
	jQuery('#HSDFactCountsSvr-mainDiv .hsd-tabs li.tab').on('click', function(e) {
		// handling hiding/showing of display elements
		jQuery('#HSDFactCountsSvr-mainDiv .hsd-tabs li.tab').removeClass("selected");
		jQuery('#HSDFactCountsSvr-mainDiv .hsd-tabs li.tab[data-tabnum="'+this.dataset.tabnum+'"]').addClass("selected");
		jQuery('#HSDFactCountsSvr-mainDiv .results-finished').css('display', 'none');
		jQuery('#HSDFactCountsSvr-mainDiv .results-finished[data-results-disp="'+this.dataset.tabnum+'"]').css('display', '');
	})
	
};


i2b2.HSDFactCountsSvr.dataReturned = function() {
	i2b2.HSDFactCountsSvr.visulizations = {};


// hack for now... replace the data with server-side precalculated data
//i2b2.HSDFactCountsSvr.model.prsControl.ajaxRet.refXML = i2b2.HSDFactCountsSvr.model.serverSide;
//for (var i=0; i<i2b2.HSDFactCountsSvr.model.prsExperiment.length; i++) {
//	i2b2.HSDFactCountsSvr.model.prsExperiment[i].ajaxRet.refXML = i2b2.HSDFactCountsSvr.model.serverSide;
//}


	// default to the first tab display
	jQuery('#HSDFactCountsSvr-mainDiv .hsd-tabs li.tab').removeClass("selected");
	jQuery('#HSDFactCountsSvr-mainDiv .hsd-tabs li.tab[data-tabnum="1"]').addClass("selected");
	jQuery('#HSDFactCountsSvr-mainDiv .hsd-tabs').css('display', '');
	jQuery('#HSDFactCountsSvr-mainDiv .results-finished').css('display', 'none');
	jQuery('#HSDFactCountsSvr-mainDiv .results-finished[data-results-disp="1"]').css('display', '');

	// delete all SVG elements
	d3.selectAll('.HSDFactCountsSvr-MainContent .results-finished svg').remove();

	// visualization size
	var svgSize = {
		width: i2b2.HSDFactCountsSvr.config.width,
		height: i2b2.HSDFactCountsSvr.config.height
	};

	// normalize the histogram data?
	switch(i2b2.HSDFactCountsSvr.model.options.NormalizeHistograms) {
		case "Actual":
			var normalizeBuckets = false;
			break;
		case "Normalize":
			var normalizeBuckets = true;
			break;
	}



	// ============================================================================================
    // build "Age Histogram" visualization (Bucket Range should be 0yr to 100yrs)
    // figure out how many buckets we need depending on the age resolution option
	switch(i2b2.HSDFactCountsSvr.model.options.BucketSizeAge) {
		case "10yrs":
			var numOfBuckets = 10;
			var xpath_selector = "//AgeBreakdown10YearBins/data";
			break;
		case "1yrs":
			var numOfBuckets = 100;
			var xpath_selector = "//AgeBreakdown1YearBins/data";
			break;
	}
	var settings = {
		bucketCnt: numOfBuckets,
		funcExtractor: function(d) { return +i2b2.h.XPath(d, "@AgeInYears")[0].value; },
		funcValueExtractor: function(d) { return +i2b2.h.XPath(d, "@NumPatients")[0].value; },
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

	// build the datasets for Age histogram
	var datasets = [];
	if (typeof i2b2.HSDFactCountsSvr.model.prsControl.ajaxRet === "undefined") {
		// if the control set has failed then we cannot recover from this error
        jQuery('#HSDFactCountsSvr-mainDiv .hsd-tabs').css('display', 'none');
        jQuery('#HSDFactCountsSvr-mainDiv .results-finished').css('display', '');
        return false;
	}
	datasets[0] = i2b2.h.XPath(i2b2.HSDFactCountsSvr.model.prsControl.ajaxRet.statisticsXML, xpath_selector);
	for (var i=0; i<i2b2.HSDFactCountsSvr.model.prsExperiment.length; i++) {
		// we can recover from errors on the experiment sets by not displaying them
        if (typeof i2b2.HSDFactCountsSvr.model.prsControl.ajaxRet !== "undefined") {
            datasets[i + 1] = i2b2.h.XPath(i2b2.HSDFactCountsSvr.model.prsExperiment[i].ajaxRet.statisticsXML, xpath_selector);
        }
	}

	i2b2.HSDFactCountsSvr.visulizations.AgeHist = new i2b2.HSDFactCountsSvr.classes.Histogram(datasets);
	i2b2.HSDFactCountsSvr.visulizations.AgeHist.configureVisual(i2b2.HSDFactCountsSvr.config);
	i2b2.HSDFactCountsSvr.visulizations.AgeHist.setProcessorLib(i2b2.HSDFactCountsSvr.calcEngine.AgeCalcServer);
	i2b2.HSDFactCountsSvr.visulizations.AgeHist.setSVG(
		d3.select('.HSDFactCountsSvr-MainContent .results-finished[data-results-disp="1"]')
		  .append('svg')
		    .attr('width', svgSize.width)
		    .attr('height', svgSize.height).node()
	);


	// process the data
	i2b2.HSDFactCountsSvr.visulizations.AgeHist.process(settings);
	// wait to render - refactors have not fully separated color set origins [BUG]


	// ============================================================================================
	// build "Fact Count Histogram" vizualization (Bucket Range should be 0 to patientset.max)
	var settings = {
		bucketCnt: i2b2.HSDFactCountsSvr.model.options.BucketSizeFactCount,
		funcExtractor: function(d) { return +i2b2.h.XPath(d, "@Facts")[0].value; },
		funcValueExtractor: function(d) { return +i2b2.h.XPath(d, "@NumPatients")[0].value; },
		min: 0,
		max: 0, // to be set later
		axisTitleX: "Patient Fact Count",
		axisFormatY: ",f"
	};
	if (normalizeBuckets === true) {
		settings.axisTitleY = "Density";
		settings.axisTicksY = 3;
	} else {
		settings.axisTitleY = "Number of Patients";
		settings.axisTicksY = 10;
	}

	// build the datasets for Age histogram
	var xpath_selector = "//FactCountBreakdown/data";
	
	var datasets = [];
	datasets[0] = i2b2.h.XPath(i2b2.HSDFactCountsSvr.model.prsControl.ajaxRet.statisticsXML, xpath_selector);
	settings.max = +i2b2.h.XPath(i2b2.HSDFactCountsSvr.model.prsControl.ajaxRet.statisticsXML, "//Summary/data/@FactsMax")[0].value; // be sure to convert from string to number
	for (var i=0; i<i2b2.HSDFactCountsSvr.model.prsExperiment.length; i++) {
		settings.max = Math.max(+i2b2.h.XPath(i2b2.HSDFactCountsSvr.model.prsExperiment[i].ajaxRet.statisticsXML, "//Summary/data/@FactsMax")[0].value, settings.max);
		datasets[i+1] = i2b2.h.XPath(i2b2.HSDFactCountsSvr.model.prsExperiment[i].ajaxRet.statisticsXML, xpath_selector);
	}

	i2b2.HSDFactCountsSvr.visulizations.FactHist = new i2b2.HSDFactCountsSvr.classes.Histogram(datasets);
	i2b2.HSDFactCountsSvr.visulizations.FactHist.configureVisual(i2b2.HSDFactCountsSvr.config);
	i2b2.HSDFactCountsSvr.visulizations.FactHist.setProcessorLib(i2b2.HSDFactCountsSvr.calcEngine.FactCountCalcServer);
	i2b2.HSDFactCountsSvr.visulizations.FactHist.setSVG(
		d3.select('.HSDFactCountsSvr-MainContent .results-finished[data-results-disp="2"]')
		  .append('svg')
		    .attr('width', svgSize.width)
		    .attr('height', svgSize.height).node()
	);
	settings.funcMax = function(d) { 
		var mx = d3.max(d, settings.funcExtractor);
		var dg = String(mx).length - 1;
		return Math.ceil(mx / Math.pow(10, dg)) * Math.pow(10, dg);
	};
	i2b2.HSDFactCountsSvr.visulizations.FactHist.process(settings);
	// wait to render - refactors have not fully separated color set origins [BUG]



	// ============================================================================================
	// build "Fact Count by Age" vizualization 

	// figure out how many buckets we need depending on the age resolution option
	switch(i2b2.HSDFactCountsSvr.model.options.BucketSizeAge) {
		case "10yrs":
			var numOfBuckets = 10;
			var xpath_selector = "//AgeBreakdown10YearBins/data";
			break;
		case "1yrs":
			var numOfBuckets = 100;
			var xpath_selector = "//AgeBreakdown1YearBins/data";
			break;
	}
	// build "Fact Count by Age" vizualization
	var svg = d3.select('.HSDFactCountsSvr-MainContent .results-finished[data-results-disp="3"]').append('svg')
		.attr('width',  svgSize.width)
		.attr('height', svgSize.height).node();
	// Init the visualization
	i2b2.HSDFactCountsSvr.multiIsoBar.init(svg);

	// feed the data to to the isobar visualization
	var json = i2b2.HSDFactCountsSvr.calcEngine.generate(i2b2.HSDFactCountsSvr.model.prsControl, i2b2.HSDFactCountsSvr.model.prsExperiment);

	i2b2.HSDFactCountsSvr.model.vis_json = json;
	i2b2.HSDFactCountsSvr.multiIsoBar.loadJson(json);

	// build the visualizations' legend
	var results_colors = {};
	d3.select(".HSDFactCountsSvr-MainContent .results-legend").style("display", "").selectAll("*").remove();
	d3.select(".HSDFactCountsSvr-MainContent div.results-legend").selectAll("div")
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
				return "<b>&ndash;</b> " + i2b2.HSDFactCountsSvr.model.prsControl.sdxInfo.sdxDisplayName;
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
	i2b2.HSDFactCountsSvr.config.colors = results_colors;


	// render the Histograms
	i2b2.HSDFactCountsSvr.visulizations.AgeHist.render(normalizeBuckets);
	i2b2.HSDFactCountsSvr.visulizations.FactHist.render(normalizeBuckets);


	// hide GUI stuff
	d3.select(".HSDFactCountsSvr-MainContent .results-working").style('display', 'none');

	// display all GUI elements
	jQuery('#HSDFactCountsSvr-mainDiv .hsd-tabs').css('display', '');
	jQuery('#HSDFactCountsSvr-mainDiv .results-legend').css('display', '');
	jQuery('#HSDFactCountsSvr-mainDiv .results-legend-frame').css('display', '');
	d3.select(".HSDFactCountsSvr-MainContent .results-finished").style('display', '');
};


i2b2.HSDFactCountsSvr.Unload = function() {
	// purge old data
	i2b2.HSDFactCountsSvr.dirtyData();
	delete i2b2.HSDFactCountsSvr.model.prsRecords;
	return true;
};


i2b2.HSDFactCountsSvr.dirtyData = function() {
	i2b2.HSDFactCountsSvr.model.dirtyResultsData = true;
	delete i2b2.HSDFactCountsSvr.model.sumCounts;
	delete i2b2.HSDFactCountsSvr.model.attribNames;
};


i2b2.HSDFactCountsSvr.prsDroppedControl = function(sdxData) {
	sdxData = sdxData[0];	// only interested in first record
	i2b2.HSDFactCountsSvr.model.prsControl = sdxData;
	jQuery("#HSDFactCountsSvr-prsDropControl").empty();
	jQuery("#"+sdxData.renderData.htmlID).clone().attr('data-prsid',sdxData.sdxInfo.sdxKeyValue).appendTo("#HSDFactCountsSvr-prsDropControl");
	i2b2.HSDFactCountsSvr.dirtyData();
};


i2b2.HSDFactCountsSvr.prsDeleteExperiment = function(a) {
	var prsID = jQuery(this)[0].getAttribute('data-prsid');
	if (prsID !== null) {
		i2b2.HSDFactCountsSvr.model.prsExperiment = i2b2.HSDFactCountsSvr.model.prsExperiment.filter(function(d) { return (d.sdxInfo.sdxKeyValue != this)}, prsID);
		jQuery(this).remove();
		// add drop instructions again?
		if (jQuery("#HSDFactCountsSvr-prsDropExperiment")[0].children.length == 0) {
			jQuery("#HSDFactCountsSvr-prsDropExperiment").html(i2b2.HSDFactCountsSvr.cfg.config.dropMsg);
		}
	}
};


i2b2.HSDFactCountsSvr.prsDroppedExperiment = function(sdxData) {
	sdxData = sdxData[0];	// only interested in first record
	if (i2b2.HSDFactCountsSvr.model.prsExperiment.length == 0) { jQuery("#HSDFactCountsSvr-prsDropExperiment").empty(); }

	var tmp = i2b2.HSDFactCountsSvr.model.prsExperiment.filter(
		function(d) { 
			if (d.sdxInfo.sdxKeyValue == sdxData.sdxInfo.sdxKeyValue) { 
				return true; 
			} else { 
				return false; 
			}
		}
	);
	if (tmp.length > 0) { return; }
	i2b2.HSDFactCountsSvr.model.prsExperiment.push(sdxData);
	jQuery("#"+sdxData.renderData.htmlID).clone().attr('data-prsID',sdxData.sdxInfo.sdxKeyValue).appendTo("#HSDFactCountsSvr-prsDropExperiment");
	i2b2.HSDFactCountsSvr.dirtyData();
	// setup delete of patientset from experiment list when clicked
	jQuery("#HSDFactCountsSvr-prsDropExperiment div").on("click", i2b2.HSDFactCountsSvr.prsDeleteExperiment);
};


i2b2.HSDFactCountsSvr.getPrsRecord = function(JoiningMutexThreadReference, prsData) {

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

		if (typeof i2b2.HSDFactCountsSvr.model.attribNames === 'undefined') { i2b2.HSDFactCountsSvr.model.attribNames = {}; }

		// get all the patient records
		var pData = i2b2.h.XPath(results.refXML, 'descendant::patient/param[@column]/text()/..');
		var hData = new Hash();
		for (var i1=0; i1<pData.length; i1++) {
			var n = pData[i1].getAttribute('column');
			if (typeof i2b2.HSDFactCountsSvr.model.attribNames[n] === 'undefined') {
				if (pData[i1].getAttribute('column_descriptor') !== null) {
					i2b2.HSDFactCountsSvr.model.attribNames[n] = pData[i1].getAttribute('column_descriptor');
				} else {
					i2b2.HSDFactCountsSvr.model.attribNames[n] = n;
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
		if (typeof i2b2.HSDFactCountsSvr.model.sumCounts == 'undefined') { i2b2.HSDFactCountsSvr.model.sumCounts = {} }
		if (typeof i2b2.HSDFactCountsSvr.model.attribNames == 'undefined') { i2b2.HSDFactCountsSvr.model.attribNames = {} }
		i2b2.HSDFactCountsSvr.model.sumCounts[prsData.prsKey] = eval("(" + Object.toJSON(hData) +")");

		// remove the topics that are to be ignored
		var keys = d3.keys(i2b2.HSDFactCountsSvr.cfg.displayData.ignore);
		while (keys.length) {
			try {
				var t = keys.pop();
				delete i2b2.HSDFactCountsSvr.model.attribNames[t];
				delete i2b2.HSDFactCountsSvr.model.sumCounts[prsData.prsKey][t];
			} catch (e) {}
		}

		// Indicate to the JoiningMutex that this thread is finished
		this.ThreadFinished();
	};
				
	// AJAX CALL USING THE EXISTING CRC CELL COMMUNICATOR
	i2b2.CRC.ajax.getPDO_fromInputList("Plugin:HSDFactCountsSvr", {PDO_Request: msg_filter}, scopedCallback);
};


i2b2.HSDFactCountsSvr.DataRetreved = function() {
	// optimization - only requery when the input data is changed
	i2b2.HSDFactCountsSvr.model.dirtyResultsData = false;


	// generate a list of attributes from all the datasets
	var t1 = d3.keys(i2b2.HSDFactCountsSvr.model.attribNames);
	while (t1.length) {
		var t2 = t1.pop();
		if (typeof i2b2.HSDFactCountsSvr.cfg.displayData.translate[t2] == 'undefined') { i2b2.HSDFactCountsSvr.cfg.displayData.translate[t2] = t2; }
	}
	var outputKeys = d3.keys(i2b2.HSDFactCountsSvr.cfg.displayData.translate);


	// generate the data structure as it's used in the D3js example [http://bl.ocks.org/erikvullings/51cc5332439939f1f292]
	var outputData =  {
		labels: outputKeys.map(function(idx){return i2b2.HSDFactCountsSvr.cfg.displayData.translate[idx]}), // DO NOT ASSUME that the return of d3.values/d3.keys will be in the same order!!
		series: []
	};

	// Bucketize the dimensions as defined in the configuration file
	var t1 = d3.keys(i2b2.HSDFactCountsSvr.cfg.displayData.bucketize);
	while(t1.length) {
		var t2 = t1.pop();
		i2b2.HSDFactCountsSvr.Bucketizer(t2);
	}



	// dump the values for display stuff [TODO Rework]
	var t1 = d3.keys(i2b2.HSDFactCountsSvr.model.sumCounts);
	while (t1.length) {
		var t2 = t1.pop();
		var t3 = {
			label:	i2b2.HSDFactCountsSvr.model.prsRecords[t2].sdxInfo.sdxDisplayName,
			values: outputKeys.map(function(idx){return i2b2.HSDFactCountsSvr.model.sumCounts[t2][idx]})
		}
		outputData.series.push(t3);
	}

	// add the display SVG elements for each data dimension
	var root = d3.select('.HSDFactCountsSvr-MainContent .results-finished');
	var svgs = root.selectAll('svg')
//			.data(d3.keys(i2b2.HSDFactCountsSvr.model.prsRecords).map(function(idx) {return i2b2.HSDFactCountsSvr.model.prsRecords[idx].sdxInfo}))
			.data(outputKeys)
			.enter()
				.append("svg")
				.classed("HSDFactCountsSvr-SVG", true)
				.style({"border-top": "1px solid #000"})
				.each(function(dimension_key) {
					// ralph the data into the correct format for visualization
					var subvizdata = i2b2.HSDFactCountsSvr.DataRalpher(dimension_key);
					// visualize the subgraph
					i2b2.HSDFactCountsSvr.SubVisualize(this, subvizdata, dimension_key);
				});


	// show the SVGs
	root.style({display:''});
};

i2b2.HSDFactCountsSvr.Bucketizer = function(dimension) {
//return true;
	// check the configuration file to determine functional operation
	switch (typeof i2b2.HSDFactCountsSvr.cfg.displayData.bucketize[dimension]) {
		case 'number':
			// bucketize into a fixed set of equal sized buckets between min(X) and max(X)
			var min = [];
			var max = [];
			var prsList = d3.keys(i2b2.HSDFactCountsSvr.model.prsRecords);
			while (prsList.length) {
				var prs = prsList.pop();
				min.push(Math.min.apply(null, d3.keys(i2b2.HSDFactCountsSvr.model.sumCounts[prs][dimension])));
				max.push(Math.max.apply(null, d3.keys(i2b2.HSDFactCountsSvr.model.sumCounts[prs][dimension])));
			}
			// global min and max of all PRS
			min = Math.min.apply(null, min);
			max = Math.max.apply(null, max);
			// calculate bucket size
			var l = parseInt(i2b2.HSDFactCountsSvr.cfg.displayData.bucketize[dimension]);
			var bucket_size = (max - min) / l;

			// generate the buckets
			var buckets = {};
			var prsList = d3.keys(i2b2.HSDFactCountsSvr.model.prsRecords);
			while (prsList.length) {
				var prs = prsList.pop();
				if (typeof buckets[prs] === 'undefined') { buckets[prs] = []; }
				var vectors = d3.keys(i2b2.HSDFactCountsSvr.model.sumCounts[prs][dimension]);
				for (var i2=0; i2<vectors.length; i2++) {
					var bucket_num = Math.floor((vectors[i2] - min) / bucket_size);
					if (typeof buckets[prs][bucket_num] === 'undefined') { buckets[prs][bucket_num] = 0; }
					buckets[prs][bucket_num] = buckets[prs][bucket_num] + i2b2.HSDFactCountsSvr.model.sumCounts[prs][dimension][vectors[i2]];
				}
			}
			
			// save the new bucket aggregations
			var prsList = d3.keys(i2b2.HSDFactCountsSvr.model.prsRecords);
			while (prsList.length) {
				var prs = prsList.pop();
				i2b2.HSDFactCountsSvr.model.sumCounts[prs][dimension] = {};
				for (var i=0; i < buckets[prs].length; i++) {
					var key = d3.format(".2f")((bucket_size*i) + min) + "-" + d3.format(".2f")((bucket_size*(i+1)) + min);
					i2b2.HSDFactCountsSvr.model.sumCounts[prs][dimension][key] = buckets[prs][i];
				}
			}
			delete buckets;
			break;
		case 'object':
			// bucketize items into the config-defined buckets
			var buckets = {};
			var prsList = d3.keys(i2b2.HSDFactCountsSvr.model.prsRecords);
			while (prsList.length) {
				var prs = prsList.pop();
				var l = i2b2.HSDFactCountsSvr.cfg.displayData.bucketize[dimension].length;
				for (var i=0; i<l; i++) {
					var start = i2b2.HSDFactCountsSvr.cfg.displayData.bucketize[dimension][i][0];
					var end = i2b2.HSDFactCountsSvr.cfg.displayData.bucketize[dimension][i][1];
					var key = String(start)+"-"+String(end);
					if (typeof buckets[prs] === 'undefined') { buckets[prs] = {}; }
					if (typeof buckets[prs][key] === 'undefined') { buckets[prs][key] = 0; }
					var vectors = d3.keys(i2b2.HSDFactCountsSvr.model.sumCounts[prs][dimension]);
					for (var i2=0; i2<vectors.length; i2++) {
						if (start <= vectors[i2] && vectors[i2] <= end) {
							buckets[prs][key] = buckets[prs][key] + i2b2.HSDFactCountsSvr.model.sumCounts[prs][dimension][vectors[i2]];
						}
					}
				}
			}
			// save the new bucket aggregations
			var prsList = d3.keys(i2b2.HSDFactCountsSvr.model.prsRecords);
			while (prsList.length) {
				var prs = prsList.pop();
				i2b2.HSDFactCountsSvr.model.sumCounts[prs][dimension] = buckets[prs];
			}
			delete buckets;
			break;
	}	
};

