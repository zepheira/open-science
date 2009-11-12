/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci;

import static javax.ws.rs.core.HttpHeaders.IF_MODIFIED_SINCE;
import static javax.ws.rs.core.HttpHeaders.IF_NONE_MATCH;
import static org.apache.abdera.ext.opensearch.OpenSearchConstants.TOTAL_RESULTS;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import javax.activation.MimeType;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.Encoded;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.Request;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import javax.ws.rs.core.Response.ResponseBuilder;

import org.apache.abdera.Abdera;
import org.apache.abdera.ext.opensearch.model.OpenSearchDescription;
import org.apache.abdera.ext.opensearch.model.Url;
import org.apache.abdera.model.Element;
import org.apache.abdera.model.Entry;
import org.apache.abdera.model.Feed;
import org.apache.abdera.model.Link;
import org.apache.abdera.parser.ParseException;
import org.apache.commons.codec.binary.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.sun.jersey.api.client.Client;
import com.sun.jersey.api.client.ClientHandlerException;
import com.sun.jersey.api.client.ClientResponse;
import com.sun.jersey.api.client.UniformInterfaceException;
import com.sun.jersey.api.client.WebResource.Builder;
import com.zepheira.osci.helper.EntryEnhancer;

public class SearchResource {
	private static final String PARAM_TEMPLATE = "?q={searchTerms?}&start-index={startIndex?}&max-results={count?}"
			+ "&language={language?}&inputEncoding={inputEncoding?}&outputEncoding={outputEncoding?}";
	private static final String ATOM_TYPE = "application/atom+xml";
	private static final String OPENSEARCH_TYPE = "application/opensearchdescription+xml";
	private static Abdera abdera = Abdera.getInstance();
	private static EntryEnhancer enhancer = new EntryEnhancer();
	private Logger logger = LoggerFactory.getLogger(SearchResource.class);
	private Request request;
	private UriInfo info;
	private Client client = Client.create();
	private Builder search;
	private String searchURL;
	private Url template;

	public SearchResource(Request request, UriInfo info, String search,
			Url template) {
		this.request = request;
		this.info = info;
		this.template = template;
		if (search != null) {
			try {
				if (!new URI(search).isAbsolute())
					throw new WebApplicationException(502);
				this.searchURL = search;
				this.search = resource(search, OPENSEARCH_TYPE);
			} catch (URISyntaxException e) {
				logger.error("Bad syntax: {} in {}", search, info
						.getAbsolutePath());
				throw new WebApplicationException(502);
			}
		}
	}

	@GET
	@Produces(OPENSEARCH_TYPE)
	public Response describe(@Context HttpHeaders headers) throws IOException {
		Date lastModified;
		OpenSearchDescription desc;
		if (search == null) {
			lastModified = new Date();
			desc = new OpenSearchDescription(abdera);
		} else {
			try {
				ClientResponse proxy = proxy(headers, search);
				lastModified = proxy.getLastModified();
				desc = proxy.getEntity(OpenSearchDescription.class);
			} catch (ParseException e) {
				logger.warn("GET {} could not be parsed {}", searchURL, e
						.getMessage());
				throw new WebApplicationException(502);
			} catch (ClientHandlerException e) {
				logger.warn("GET {} could not connect {}", searchURL, e
						.getMessage());
				throw new WebApplicationException(502);
			}
			for (Url url : desc.getUrls()) {
				if (isSearchResults(url)) {
					url.discard();
				}
			}
		}
		Url url = new Url(abdera);
		url.setType(ATOM_TYPE);
		String self = info.getAbsolutePathBuilder().build().toASCIIString();
		url.setTemplate(self + PARAM_TEMPLATE);
		desc.addUrls(url);
		return Response.ok().lastModified(lastModified).entity(desc).build();
	}

	@GET
	@Produces(ATOM_TYPE)
	public Response search(
			@Context HttpHeaders headers,
			@Encoded @DefaultValue("") @QueryParam("q") String q,
			@DefaultValue("1") @QueryParam("start-index") int startIndex,
			@DefaultValue("10") @QueryParam("max-results") int count,
			@DefaultValue("*") @QueryParam("language") String language,
			@DefaultValue("UTF-8") @QueryParam("inputEncoding") String inputEncoding,
			@DefaultValue("UTF-8") @QueryParam("outputEncoding") String outputEncoding)
			throws IOException {
		Url template = getTemplate();
		String url = getURL(template, q, startIndex, count, language,
				inputEncoding, outputEncoding);
		try {
			Builder web = resource(url, ATOM_TYPE);
			ClientResponse proxy = proxy(headers, web);
			Date lastModified = proxy.getLastModified();
			Feed feed = proxy.getEntity(Feed.class);
			String search = info.getAbsolutePath().toASCIIString();
			proxyNavigationLinks(search, feed, q, startIndex, count, language,
					inputEncoding, outputEncoding);
			List<Feed> feeds = new ServiceResource(request, info).getFeeds();
			for (Entry entry : feed.getEntries()) {
				if (entry.getId() == null)
					throw new WebApplicationException(502);
				String id = enhancer.enhanceEntry(entry, feeds);
				URI self = info.getAbsolutePathBuilder().path(id).build();
				proxySelfLinks(entry, self);
			}
			return Response.ok().lastModified(lastModified).entity(feed)
					.build();
		} catch (ParseException e) {
			logger.warn("GET {} could not be parsed {}", url, e.getMessage());
			throw new WebApplicationException(502);
		} catch (ClientHandlerException e) {
			logger.warn("GET {} could not connect {}", url, e.getMessage());
			throw new WebApplicationException(502);
		}
	}

	@GET
	@Path("/{id}")
	@Produces(ATOM_TYPE)
	public Response entry(@PathParam("id") String id) throws IOException,
			InterruptedException {
		Entry entry = enhancer.getEnhancedEntry(id);
		Date pub = entry.getPublished();
		ResponseBuilder rb = request.evaluatePreconditions(pub);
		if (rb != null)
			return rb.build();
		URI self = info.getAbsolutePath();
		proxySelfLinks(entry, self);
		return Response.ok().lastModified(pub).entity(entry).build();
	}

	@DELETE
	@Path("/{id}")
	public void delete(@PathParam("id") String id) throws IOException,
			InterruptedException {
		enhancer.abort(id);
	}

	public void validate() {
		String template = getTemplate().getTemplate();
		if (!template.contains("{searchTerms"))
			throw new WebApplicationException(400);
	}

	private Builder resource(String uri, String type) {
		Builder web = client.resource(uri).accept(type);
		if (uri.matches("https?://[^/:@]*:[^/:@]*@[^/:@]*/.*")) {
			int start = uri.indexOf("://") + 3;
			int at = uri.indexOf('@', start);
			String credentials = uri.substring(start, at);
			byte[] unencoded = credentials.getBytes(Charset.forName("UTF-8"));
			byte[] cred = new Base64().encode(unencoded);
			return web.header("Authorization", "Basic " + new String(cred));
		}
		return web;
	}

	private ClientResponse proxy(HttpHeaders headers, Builder web) {
		List<String> since = headers.getRequestHeader(IF_MODIFIED_SINCE);
		if (since != null && !since.isEmpty()) {
			web = web.header(IF_MODIFIED_SINCE, since.get(0));
		}
		List<String> match = headers.getRequestHeader(IF_NONE_MATCH);
		if (match != null && !match.isEmpty()) {
			web = web.header(IF_NONE_MATCH, match.get(0));
		}
		try {
			ClientResponse response = web.get(ClientResponse.class);
			if (response.getStatus() == 200)
				return response;
			throw new WebApplicationException(response.getStatus());
		} catch (UniformInterfaceException e) {
			int status = e.getResponse().getStatus();
			if (status >= 400) {
				logger.warn("GET {} returned a response status of {}", web,
						status);
			}
			throw new WebApplicationException(status);
		}
	}

	private Url getTemplate() {
		if (template != null)
			return template;
		try {
			OpenSearchDescription desc;
			desc = search.get(OpenSearchDescription.class);
			for (Url url : desc.getUrls()) {
				if (isSearchResults(url)) {
					return url;
				}
			}
			throw new WebApplicationException(502);
		} catch (UniformInterfaceException e) {
			int status = e.getResponse().getStatus();
			logger.warn("GET {} returned a response status of {}", searchURL,
					status);
			throw new WebApplicationException(status);
		} catch (ParseException e) {
			logger
					.warn("GET {} could not be parsed {}", searchURL, e
							.getMessage());
			throw new WebApplicationException(502);
		} catch (ClientHandlerException e) {
			logger.warn("GET {} could not connect {}", searchURL, e.getMessage());
			throw new WebApplicationException(502);
		}
	}

	private boolean isSearchResults(Url url) {
		String type = url.getType();
		String rel = url.getAttributeValue("rel");
		return type.equals(ATOM_TYPE) && (rel == null || rel.equals("results"));
	}

	private void proxyNavigationLinks(String search, Feed feed, String q,
			int startIndex, int count, String language, String inputEncoding,
			String outputEncoding) {
		String template = search + PARAM_TEMPLATE;
		Integer total = getTotalResults(feed);
		for (Link link : new ArrayList<Link>(feed.getLinks())) {
			if (link.getMimeType() != null
					&& !link.getMimeType().getBaseType().equals(ATOM_TYPE)
					&& !link.getMimeType().getBaseType()
							.equals(OPENSEARCH_TYPE))
				continue;
			if ("search".equals(link.getRel())) {
				link.discard();
				feed.addLink(search, "search").setMimeType(OPENSEARCH_TYPE);
			} else if ("self".equals(link.getRel())) {
				link.discard();
				String href = getURL(template, q, startIndex, count, language,
						inputEncoding, outputEncoding);
				feed.addLink(href, "self").setMimeType(ATOM_TYPE);
			} else if ("next".equals(link.getRel())) {
				link.discard();
				String href = getURL(template, q, startIndex + count, count,
						language, inputEncoding, outputEncoding);
				feed.addLink(href, "next").setMimeType(ATOM_TYPE);
			} else if ("previous".equals(link.getRel())) {
				link.discard();
				String href = getURL(template, q, startIndex - count, count,
						language, inputEncoding, outputEncoding);
				feed.addLink(href, "previous").setMimeType(ATOM_TYPE);
			} else if ("first".equals(link.getRel())) {
				link.discard();
				String href = getURL(template, q, 0, count, language,
						inputEncoding, outputEncoding);
				feed.addLink(href, "first").setMimeType(ATOM_TYPE);
			} else if ("last".equals(link.getRel())) {
				link.discard();
				if (total != null) {
					int lastCount = ((total - 1) % count) + 1;
					String href = getURL(template, q, total - lastCount + 1,
							count, language, inputEncoding, outputEncoding);
					feed.addLink(href, "last").setMimeType(ATOM_TYPE);
				}
			}
		}
	}

	private Integer getTotalResults(Feed feed) {
		Element extension = feed.getExtension(TOTAL_RESULTS);
		if (extension == null)
			return null;
		return Integer.valueOf(extension.getText());
	}

	private String getURL(Url template, String q, int startIndex, int count,
			String language, String inputEncoding, String outputEncoding) {
		int index = startIndex + template.getIndexOffset() - 1;
		int page = ((index - 1) / count) + template.getPageOffset();
		return getURL(template.getTemplate(), q, index, page, count, language,
				inputEncoding, outputEncoding);
	}

	private String getURL(String template, String q, int index, int count,
			String language, String inputEncoding, String outputEncoding) {
		int page = ((index - 1) / count) + 1;
		return getURL(template, q, index, page, count, language, inputEncoding,
				outputEncoding);
	}

	private String getURL(String template, String q, int index, int page,
			int count, String language, String inputEncoding,
			String outputEncoding) {
		String url = template;
		url = url.replaceAll("\\{searchTerms\\??\\}", q);
		url = url.replaceAll("\\{startIndex\\??\\}", String.valueOf(index));
		url = url.replaceAll("\\{startPage\\??\\}", String.valueOf(page));
		url = url.replaceAll("\\{count\\??\\}", String.valueOf(count));
		url = url.replaceAll("\\{language\\??\\}", language);
		url = url.replaceAll("\\{inputEncoding\\?\\}", inputEncoding);
		url = url.replaceAll("\\{outputEncoding\\?\\}", outputEncoding);
		url = url.replaceAll("\\{[^\\}]+\\?\\}", "");
		return url;
	}

	private void proxySelfLinks(Entry entry, URI self) {
		for (Link link : entry.getLinks("self")) {
			MimeType type = link.getMimeType();
			if (type == null || type.getBaseType().equals(ATOM_TYPE)) {
				link.discard();
			}
		}
		entry.addLink(self.toASCIIString(), "self").setMimeType(ATOM_TYPE);
	}
}
