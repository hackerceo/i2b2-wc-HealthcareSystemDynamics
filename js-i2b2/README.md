To install the HSD plugins into your i2b2 instance without entirely replacing the `i2b2_loader.js` file, copy the following section of code into the configuration definition area of your local `i2b2_loader.js` file.


```javascript
// -------------------------------------------		
		{ code:	"HSDIntro",
		   forceLoading: true,
		   forceConfigMsg: { params: [] },
		   roles: [ "DATA_LDS", "DATA_DEID", "DATA_PROT" ],
		   forceDir: "cells/plugins/community"
		},
		{ code:	"HSDFactCounts",
		   forceLoading: true,
		   forceConfigMsg: { params: [] },
		   roles: [ "DATA_LDS", "DATA_DEID", "DATA_PROT" ],
		   forceDir: "cells/plugins/community"
		},
		{ code:	"HSDLabTests",
		   forceLoading: true,
		   forceConfigMsg: { params: [] },
		   roles: [ "DATA_LDS", "DATA_DEID", "DATA_PROT" ],
		   forceDir: "cells/plugins/community"
		},
		{ code:	"HSDFactCountsSvr",
		   forceLoading: true,
		   forceConfigMsg: { params: [] },
		   roles: [ "DATA_LDS", "DATA_DEID", "DATA_PROT" ],
		   forceDir: "cells/plugins/community"
		},
		{ code:	"HSDLabTestsSvr",
		   forceLoading: true,
		   forceConfigMsg: { params: [] },
		   roles: [ "DATA_LDS", "DATA_DEID", "DATA_PROT" ],
		   forceDir: "cells/plugins/community"
		}
// -------------------------------------------		
```