/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import static com.zepheira.osci.Vocabulary.SEARCH_REL;
import junit.framework.TestCase;

import org.apache.abdera.Abdera;
import org.apache.abdera.ext.opensearch.model.OpenSearchDescription;
import org.apache.abdera.ext.opensearch.model.Url;
import org.apache.abdera.model.Entry;
import org.apache.abdera.model.Feed;

import com.sun.jersey.api.client.Client;
import com.sun.jersey.api.client.WebResource;

public class SearchResourceTest extends TestCase {
	private static final String OPENSEARCH = "application/opensearchdescription+xml";
	private static final String ATOM = "application/atom+xml";
	private static Abdera abdera = Abdera.getInstance();
	private String path = "/services/content";
	private Server server;
	private String base;
	private Client client;
	private WebResource content;

	@Override
	public void setUp() throws Exception {
		server = new Server();
		base = server.start();
		client = Client.create();
		content = client.resource(base).path(path);
	}

	@Override
	public void tearDown() throws Exception {
		server.stop();
	}

	public void testTemplate() throws Exception {
		String template = getTemplate(postContentService());
		assertNotNull(template);
	}

	public void testSearchNavigation() throws Exception {
		String template = getTemplate(postContentService());
		String url = getURL(template, "rdf", 1, 10);
		Feed feed = client.resource(url).accept(ATOM).get(Feed.class);
		String next = feed.getLinkResolvedHref("next").toASCIIString();
		feed = client.resource(next).accept(ATOM).get(Feed.class);
	}

	private String postContentService() {
		Entry entry = abdera.newEntry();
		Url url = new Url(abdera);
		url.setType(ATOM);
		url.setTemplate("http://jamesrdf.blogspot.com/feeds/posts/default?start-index={startIndex}&max-results={count}");
		entry.addExtension(url);
		entry = content.type(ATOM).accept(ATOM).post(Entry.class, entry);
		assertNotNull(entry.getLink(SEARCH_REL));
		return entry.getLink(SEARCH_REL).getHref().toASCIIString();
	}

	private String getTemplate(String search) {
		OpenSearchDescription desc;
		desc = client.resource(search).accept(OPENSEARCH).get(OpenSearchDescription.class);
		String template = null;
		for (Url u : desc.getUrls()) {
			template = u.getTemplate();
		}
		return template;
	}

	private String getURL(String template, String q, int index, int count) {
		String url = template;
		url = url.replaceAll("\\{searchTerms\\??\\}", q);
		url = url.replaceAll("\\{startIndex\\??\\}", String.valueOf(index));
		url = url.replaceAll("\\{count\\??\\}", String.valueOf(count));
		url = url.replaceAll("\\{[^\\}]+\\?\\}", "");
		return url;
	}

}
