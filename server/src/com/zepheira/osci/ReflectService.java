/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import static com.zepheira.osci.Vocabulary.TAG_REL;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MultivaluedMap;
import javax.xml.parsers.ParserConfigurationException;

import org.apache.abdera.i18n.iri.IRI;
import org.apache.abdera.model.Entry;
import org.apache.abdera.model.Link;
import org.xml.sax.SAXException;

import com.sun.jersey.api.client.Client;
import com.sun.jersey.api.client.WebResource.Builder;
import com.sun.jersey.core.util.MultivaluedMapImpl;

@Path(ReflectService.PATH)
public class ReflectService {
	public static final String PATH = "/services/highlighting/reflect/reflection";
	private static final String REFLECT = "http://reflect.embl.de/ReflectProxy";
	private static final List<String> SUPPORTED_TYPES = Arrays
			.asList("text/html", "application/xhtml+xml", "text/xml",
					"application/xml");
	private Client client = Client.create();
	private Builder reflect = client.resource(REFLECT).accept("text/plain")
			.type("application/x-www-form-urlencoded");

	@POST
	@Consumes("application/atom+xml")
	@Produces("application/atom+xml")
	public Entry post(Entry entry) throws SAXException, IOException,
			ParserConfigurationException {
		String src = getContentSrc(entry);
		if (src == null)
			return entry;
		MultivaluedMap<String, String> map = new MultivaluedMapImpl();
		map.putSingle("url", src);
		String link = reflect.post(String.class, map);
		entry.addLink(link, TAG_REL);
		return entry;
	}

	private String getContentSrc(Entry entry) {
		IRI location = entry.getContentSrc();
		if (location != null)
			return location.toASCIIString();
		for (Link link : entry.getLinks("alternate", null)) {
			String type = link.getMimeType().getBaseType();
			if (SUPPORTED_TYPES.contains(type)) {
				return link.getHref().toASCIIString();
			}
		}
		return null;
	}
}
