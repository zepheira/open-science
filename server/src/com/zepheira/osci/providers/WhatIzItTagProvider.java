/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci.providers;

import java.io.IOException;
import java.io.InputStream;
import java.lang.annotation.Annotation;
import java.lang.reflect.Type;

import javax.ws.rs.Consumes;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.ext.MessageBodyReader;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.parsers.SAXParserFactory;

import org.xml.sax.Attributes;
import org.xml.sax.SAXException;
import org.xml.sax.helpers.DefaultHandler;

import com.zepheira.osci.helper.TagMap;

@Consumes("text/plain")
public class WhatIzItTagProvider implements
		MessageBodyReader<TagMap> {
	private static final String TAG_NS = "http://www.ebi.ac.uk/z";
	private static SAXParserFactory factory = SAXParserFactory.newInstance();
	static {
		factory.setNamespaceAware(true);
	}

	@Override
	public boolean isReadable(Class<?> type, Type genericType,
			Annotation[] annotations, MediaType mediaType) {
		return TagMap.class.isAssignableFrom(type);
	}

	@Override
	public TagMap readFrom(Class<TagMap> type,
			Type genericType, Annotation[] annotations, MediaType mediaType,
			MultivaluedMap<String, String> headers, InputStream stream)
			throws IOException, WebApplicationException {
		final TagMap tags = new TagMap();
		try {
			factory.newSAXParser().parse(stream, new DefaultHandler() {
				private String tag;
				private StringBuilder tb;

				@Override
				public void startElement(String ns, String localName,
						String name, Attributes attr) throws SAXException {
					if (TAG_NS.equals(ns)) {
						String key;
						String id = attr.getValue("id");
						if (id == null) {
							String ids = attr.getValue("ids");
							key = ns + localName + "/@ids=" + ids;
						} else {
							key = ns + localName + "/@id=" + id;
						}
						String term = attr.getValue("term");
						if (term == null) {
							tag = key;
							tb = new StringBuilder();
						} else {
							tags.put(key, term);
						}
					}
				}

				@Override
				public void characters(char[] ch, int start, int length)
						throws SAXException {
					if (tb != null) {
						tb.append(ch, start, length);
					}
				}

				@Override
				public void endElement(String ns, String localName, String name)
						throws SAXException {
					if (tb != null && TAG_NS.equals(ns)) {
						tags.put(tag, tb.toString());
						tb = null;
					}
				}
			});
		} catch (SAXException e) {
			throw new WebApplicationException(502);
		} catch (ParserConfigurationException e) {
			throw new AssertionError(e);
		}
		return tags;
	}

}
