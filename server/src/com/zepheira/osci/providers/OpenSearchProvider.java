/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci.providers;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.annotation.Annotation;
import java.lang.reflect.Type;

import javax.ws.rs.Consumes;
import javax.ws.rs.Produces;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.ext.MessageBodyReader;
import javax.ws.rs.ext.MessageBodyWriter;

import org.apache.abdera.Abdera;
import org.apache.abdera.ext.opensearch.model.OpenSearchDescription;
import org.apache.abdera.model.Document;
import org.apache.abdera.parser.Parser;

/**
 * <p>
 * JAX-RS Provider for an Atom {@link OpenSearchDescription} Document instance.
 * </p>
 */
@Consumes( { "application/opensearchdescription+xml", "application/xml",
		"text/xml", "application/atom+json", "application/json" })
@Produces( { "application/opensearchdescription+xml", "application/xml",
		"text/xml", "application/atom+json", "application/json" })
public class OpenSearchProvider implements
		MessageBodyReader<OpenSearchDescription>,
		MessageBodyWriter<OpenSearchDescription> {

	@Override
	public long getSize(OpenSearchDescription desc, Class<?> type,
			Type genericType, Annotation[] annotations, MediaType mediaType) {
		return -1;
	}

	@Override
	public boolean isReadable(Class<?> type, Type genericType,
			Annotation[] annotations, MediaType mediaType) {
		return OpenSearchDescription.class.isAssignableFrom(type);
	}

	@Override
	public boolean isWriteable(Class<?> type, Type genericType,
			Annotation[] annotations, MediaType mediaType) {
		return OpenSearchDescription.class.isAssignableFrom(type);
	}

	@Override
	public OpenSearchDescription readFrom(Class<OpenSearchDescription> type,
			Type genericType, Annotation[] annotations, MediaType mediaType,
			MultivaluedMap<String, String> headers, InputStream stream)
			throws IOException, WebApplicationException {
		Parser parser = null;
		if (mediaType.equals(MediaType.APPLICATION_JSON_TYPE)
				|| mediaType.getSubtype().endsWith("+json")) {
			parser = Abdera.getInstance().getParserFactory().getParser("json");
		} else {
			parser = Abdera.getInstance().getParser();
		}
		Document<OpenSearchDescription> document = parser.parse(stream);
		return document.getRoot();
	}

	@Override
	public void writeTo(OpenSearchDescription desc, Class<?> type,
			Type genericType, Annotation[] annotations, MediaType mediaType,
			MultivaluedMap<String, Object> headers, OutputStream stream)
			throws IOException, WebApplicationException {
		if (mediaType.equals(MediaType.APPLICATION_JSON_TYPE)
				|| mediaType.getSubtype().endsWith("+json")) {
			desc.writeTo("json", stream);
		} else {
			desc.writeTo(stream);
		}
	}

}