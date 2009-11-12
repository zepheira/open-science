/**
 * Copyright 2008-2009 Zepheira LLC
 */

package com.zepheira.osci.helper;

import static com.zepheira.osci.Vocabulary.LINKER_REL;
import static com.zepheira.osci.Vocabulary.LINKREL_REL;
import static java.util.Collections.synchronizedMap;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.UnsupportedEncodingException;
import java.math.BigInteger;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import javax.ws.rs.WebApplicationException;

import org.apache.abdera.Abdera;
import org.apache.abdera.i18n.iri.IRI;
import org.apache.abdera.model.Entry;
import org.apache.abdera.model.Feed;
import org.apache.abdera.model.Link;
import org.apache.abdera.parser.ParseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.sun.jersey.api.NotFoundException;
import com.sun.jersey.api.client.Client;
import com.sun.jersey.api.client.ClientHandlerException;
import com.sun.jersey.api.client.UniformInterfaceException;
import com.sun.jersey.api.client.WebResource;
import com.sun.jersey.api.client.WebResource.Builder;

public class EntryEnhancer {
	private static final String ATOM_TYPE = "application/atom+xml";
	private static final String UTF_8 = "UTF-8";
	private static Abdera abdera = Abdera.getInstance();
	private static ThreadLocal<MessageDigest> md5 = new ThreadLocal<MessageDigest>() {
		@Override
		protected MessageDigest initialValue() {
			try {
				return MessageDigest.getInstance("MD5");
			} catch (NoSuchAlgorithmException e) {
				throw new AssertionError(e);
			}
		}
	};
	private Logger logger = LoggerFactory.getLogger(EntryEnhancer.class);
	private ExecutorService executor = Executors.newFixedThreadPool(2);
	private Map<String, Future<?>> queue = synchronizedMap(new HashMap<String, Future<?>>());
	private ScheduledExecutorService timing = Executors.newScheduledThreadPool(1);
	private Client client = Client.create();
	private File enhanced = new File("enhanced");

	public String enhanceEntry(Entry entry, List<Feed> feeds)
			throws IOException {
		String id = entry.getId().toASCIIString();
		String hash = Long.toHexString(hash(md5.get(), id));
		File file = new File(enhanced, hash + ".xml");
		if (!file.exists()) {
			process(hash, entry, file, feeds);
		}
		return hash;
	}

	public Entry getEnhancedEntry(String id) throws IOException,
			InterruptedException {
		try {
			waitFor(id);
			return read(new File(enhanced, id + ".xml"));
		} catch (TimeoutException e) {
			throw new WebApplicationException(202);
		} catch (NotFoundException e) {
			return read(new File("entries", id + ".xml"));
		}
	}

	public void abort(String id) throws IOException, InterruptedException {
		Future<?> future = queue.remove(id);
		if (future != null) {
			try {
				future.get(30, TimeUnit.SECONDS);
			} catch (ExecutionException e) {
				logger.error(e.getMessage(), e);
			} catch (TimeoutException e) {
				logger.error("Cancelling Enhancement {}", id);
				future.cancel(true);
			}
		}
		File file = new File(enhanced, id + ".xml");
		if (file.exists() && !file.delete()) {
			throw new WebApplicationException(405);
		}
	}

	private void process(String id, Entry entry, File enhanced, List<Feed> feeds)
			throws IOException {
		synchronized (queue) {
			if (!enhanced.exists() && (!queue.containsKey(id) || queue.get(id).isDone())) {
				File self = new File(new File("entries"), id + ".xml");
				write(entry, self);
				queue.put(id, executor.submit(new Task(id, self, enhanced, feeds)));
			}
		}
	}

	private void waitFor(String id) throws InterruptedException, IOException, TimeoutException {
		Future<?> future = queue.get(id);
		if (future != null) {
			try {
				future.get(30, TimeUnit.SECONDS);
			} catch (ExecutionException e) {
				logger.error(e.getMessage(), e);
			}
			queue.remove(id);
		}
	}

	private long hash(MessageDigest digest, String str) {
		try {
			digest.update(str.getBytes(UTF_8));
			return new BigInteger(1, digest.digest()).longValue();
		} catch (UnsupportedEncodingException e) {
			throw new AssertionError(e);
		}
	}

	private Entry read(File file) throws IOException {
		try {
			InputStream in = new FileInputStream(file);
			try {
				Entry entry = abdera.getParser().<Entry> parse(in).getRoot();
				return entry.complete();
			} finally {
				in.close();
			}
		} catch (FileNotFoundException e) {
			throw new NotFoundException("Entry " + file.getName() + " not found");
		}
	}

	private void write(Entry entry, File file) throws FileNotFoundException,
			IOException {
		file.getParentFile().mkdirs();
		File tmp = new File(file.getParentFile(), file.getName() + ".part");
		entry.setPublished(new Date());
		OutputStream out = new FileOutputStream(tmp);
		try {
			entry.writeTo(out);
			if (!tmp.renameTo(file))
				throw new IOException("Could not create file: " + file.getName());
		} finally {
			out.close();
		}
	}

	private class Timer implements Runnable {
		private String id;

		public Timer(String id) {
			this.id = id;
		}

		@Override
		public void run() {
			try {
				abort(id);
			} catch (Exception e) {
				logger.warn(e.getMessage(), e);
			}
		}
	}

	private class Task implements Runnable {
		private String id;
		private File self;
		private File file;
		private List<Feed> feeds;

		public Task(String id, File self, File file, List<Feed> feeds) {
			this.id = id;
			this.self = self;
			this.file = file;
			this.feeds = feeds;
		}

		@Override
		public void run() {
			try {
				ScheduledFuture<?> timer = timing.schedule(new Timer(id), 5, TimeUnit.MINUTES);
				Entry entry = read(self);
				IRI href = entry.getSelfLinkResolvedHref();
				if (href != null && href.isAbsolute()) {
					try {
						WebResource web = client.resource(href.toASCIIString());
						entry = web.accept(ATOM_TYPE).get(Entry.class);
					} catch (UniformInterfaceException e) {
						int status = e.getResponse().getStatus();
						logger.warn("GET {} returned a response status of {}",
								href, status);
					} catch (ParseException e) {
						logger.warn("GET {} could not be parsed {}", href, e
								.getMessage());
					} catch (ClientHandlerException e) {
						logger.warn("GET {} could not connect {}", href, e
								.getMessage());
					}
				}
				enhance(entry);
				write(entry, file);
				timer.cancel(true);
			} catch (Exception e) {
				logger.error(e.getMessage(), e);
			} finally {
				self.delete();
			}
		}

		private void enhance(Entry entry) {
			for (Feed feed : feeds) {
				for (Entry linker : feed.getEntries()) {
					enhanceLinks(entry, linker);
				}
			}
		}

		private void enhanceLinks(Entry entry, Entry linker) {
			for (Link link : linker.getLinks(LINKER_REL)) {
				String href = link.getHref().toASCIIString();
				WebResource web = client.resource(href);
				try {
					Builder b = web.accept(ATOM_TYPE).type(ATOM_TYPE);
					Entry tags = b.post(Entry.class, entry);
					for (Link rellink : linker.getLinks(LINKREL_REL)) {
						String rel = rellink.getHref().toASCIIString();
						for (Link tag : tags.getLinks(rel)) {
							entry.addLink(tag);
						}
					}
				} catch (UniformInterfaceException e) {
					int status = e.getResponse().getStatus();
					logger.warn("POST {} returned a response status of {}",
							href, status);
				} catch (ParseException e) {
					logger.warn("POST {} could not be parsed {}", href, e
							.getMessage());
				} catch (ClientHandlerException e) {
					logger.warn("POST {} could not connect {}", href, e
							.getMessage());
				}
			}
		}

	}
}
