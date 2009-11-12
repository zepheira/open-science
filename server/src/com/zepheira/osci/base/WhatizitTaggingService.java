/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci.base;

import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.net.MalformedURLException;
import java.nio.CharBuffer;

import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Produces;
import javax.ws.rs.WebApplicationException;
import javax.xml.parsers.ParserConfigurationException;

import org.apache.abdera.i18n.iri.IRI;
import org.apache.abdera.model.Entry;
import org.apache.abdera.model.Content.Type;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.xml.sax.SAXException;

import com.sun.jersey.api.client.Client;
import com.sun.jersey.api.client.UniformInterfaceException;
import com.sun.jersey.api.client.WebResource;
import com.sun.jersey.api.client.WebResource.Builder;
import com.zepheira.osci.helper.ReadHTMLAsText;
import com.zepheira.osci.helper.TagMap;

public abstract class WhatizitTaggingService {
	private static final String WHATIZIT = "http://www.ebi.ac.uk/webservices/whatizit/pipe";
	private static final String[] ACCEPT = { "text/plain", "text/html",
			"application/xhtml+xml", "application/xml" };

	private Logger logger = LoggerFactory
			.getLogger(WhatizitTaggingService.class);

	private Client client = Client.create();
	private Builder whatizit = client.resource(WHATIZIT).accept(
			"application/xml").type("text/plain");

	public abstract String getProcessingPipeline();

	public abstract String getTagRel();

	@POST
	@Consumes("application/atom+xml")
	@Produces("application/atom+xml")
	public Entry post(Entry entry) throws SAXException, IOException,
			ParserConfigurationException {
		IRI location = entry.getContentSrc();
		String content = entry.getContent();
		Type contentType = entry.getContentType();
		if (content == null && location == null)
			return entry;
		Reader reader = getContentReader(content, location);
		try {
			Readable text = asText(contentType, reader);
			TagMap tags = whatizit.post(TagMap.class, new WhatIzItReader(text));
			for (String tag : tags.keySet()) {
				entry.addLink(tag, getTagRel()).setTitle(tags.get(tag));
			}
		} finally {
			reader.close();
		}
		return entry;
	}

	private Reader getContentReader(String content, IRI location)
			throws MalformedURLException, IOException {
		if (location == null)
			return new StringReader(content);
		WebResource web = client.resource(location.toASCIIString());
		try {
			return web.accept(ACCEPT).get(Reader.class);
		} catch (UniformInterfaceException e) {
			int status = e.getResponse().getStatus();
			logger.warn("GET {} returned a response status of {}", web, status);
			throw new WebApplicationException(status);
		}
	}

	private Readable asText(Type contentType, Reader reader) {
		if (Type.TEXT.equals(contentType))
			return reader;
		return new ReadHTMLAsText(reader);
	}

	private class WhatIzItReader implements Readable {
		private Readable content;
		private boolean headerPrinted;
		private boolean footerPrinted;

		public WhatIzItReader(Readable content) {
			this.content = content;
		}

		@Override
		public int read(CharBuffer cb) throws IOException {
			if (!headerPrinted) {
				headerPrinted = true;
				String header = getPipelineHeader();
				cb.append(header);
				return header.length();
			} else {
				int read = content.read(cb);
				if (read == -1 && !footerPrinted) {
					footerPrinted = true;
					String footer = getPipelineFooter();
					cb.append(footer);
					return footer.length();
				}
				return read;
			}
		}

		private String getPipelineHeader() {
			return getProcessingPipeline()
					+ "\n<document xmlns:xlink='http://www.w3.org/1999/xlink' xmlns:z='http://www.ebi.ac.uk/z' source='Whatizit'><text>";
		}

		private String getPipelineFooter() {
			return "</text></document>";
		}
	}

}
