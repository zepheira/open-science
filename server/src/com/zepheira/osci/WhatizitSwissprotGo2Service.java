/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import javax.ws.rs.Path;

import com.zepheira.osci.base.WhatizitTaggingService;

@Path(WhatizitSwissprotGo2Service.PATH)
public class WhatizitSwissprotGo2Service extends WhatizitTaggingService {
	public static final String PATH = "/services/tagging/whatizitSwissprotGo2/pipe";
	public static final String TAG_REL = Vocabulary.NS + "whatizitSwissprotGo2";

	@Override
	public String getProcessingPipeline() {
		return "whatizitSwissprotGo2";
	}

	@Override
	public String getTagRel() {
		return TAG_REL;
	}

}
