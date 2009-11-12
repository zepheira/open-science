/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci.providers;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.lang.annotation.Annotation;
import java.lang.reflect.Type;
import java.nio.CharBuffer;

import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.ext.MessageBodyReader;
import javax.ws.rs.ext.MessageBodyWriter;

public class ReadableProvider implements MessageBodyReader<Readable>,
		MessageBodyWriter<Readable> {

	@Override
	public long getSize(Readable readable, Class<?> type, Type genericType,
			Annotation[] annotations, MediaType mediaType) {
		return -1;
	}

	@Override
	public boolean isReadable(Class<?> type, Type genericType,
			Annotation[] annotations, MediaType mediaType) {
		return Readable.class.isAssignableFrom(type);
	}

	@Override
	public boolean isWriteable(Class<?> type, Type genericType,
			Annotation[] annotations, MediaType mediaType) {
		return Readable.class.isAssignableFrom(type);
	}

	@Override
	public Readable readFrom(Class<Readable> type, Type genericType,
			Annotation[] annotations, MediaType mediaType,
			MultivaluedMap<String, String> headers, InputStream stream)
			throws IOException, WebApplicationException {
		return new InputStreamReader(stream);
	}

	@Override
	public void writeTo(Readable readable, Class<?> type, Type genericType,
			Annotation[] annotations, MediaType mediaType,
			MultivaluedMap<String, Object> headers, OutputStream stream)
			throws IOException, WebApplicationException {
		int read;
		CharBuffer cb = CharBuffer.allocate(512);
		Writer writer = new OutputStreamWriter(stream);
		while ((read = readable.read(cb)) >= 0) {
			writer.write(cb.array(), 0, read);
			cb.rewind();
		}
		writer.flush();
	}
}
