/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import javax.ws.rs.Path;

import com.zepheira.osci.base.WhatizitTaggingService;

@Path(WhatizitEBIMedService.PATH)
public class WhatizitEBIMedService extends WhatizitTaggingService {
	public static final String PATH = "/services/tagging/whatizitEBIMed/pipe";
	public static final String TAG_REL = Vocabulary.NS + "whatizitEBIMed";

	@Override
	public String getProcessingPipeline() {
		return "whatizitEBIMed";
	}

	@Override
	public String getTagRel() {
		return TAG_REL;
	}

}
