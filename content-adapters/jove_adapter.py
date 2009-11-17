# -*- encoding: utf-8 -*-

# Copyright 2008-2009 Zepheira LLC

'''
 Module name:: jove_adapter
 
JoVE adapter for Zepheira Open Science server
 
See: http://community.zepheira.com/wiki/open-science/
Prerequisites: simplejson, feedparser

= Defined REST entry points =

http://open-science.zepheira.com/content/jove/source (osci.jove.atom) Handles GET
http://open-science.zepheira.com/content/jove/discovery (osci.jove.discovery) Handles GET

= Configuration =

e.g.

[jove_adapter]
osci-base = http://my-open-science-server.com
admin-email = admin@my-open-science-server.com
default-max-results = 100

= Notes on security =

This adapter is to be registered with a ZOSCI server by POSTing a discovery document
with its HTTP end-points.  There is no mechanism to securely send auth details to
the OSCI server, so this server should be mounted so that auth is not required
to access. If you wish to limit access, best bet is to set a firewall or proxy rule to
restrict requestor IP to the ZOSCI server.
'''

import sys, time
import datetime
import urllib, urllib2
from itertools import *
from functools import *
from contextlib import closing

import simplejson
import feedparser

import amara
from amara import bindery
from amara.writers.struct import *
from amara.bindery.model import *
from amara.lib.util import *
from amara.bindery import html
from amara.namespaces import *
from amara.xslt import transform

from amara.tools.atomtools import feed

from akara.services import simple_service

OSCI_BASE = AKARA.module_config.get('osci-base', 'http://open-science.zepheira.com')
ID_BASE = AKARA.module_config.get('id-base', OSCI_BASE).decode('utf-8')
ADMIN_EMAIL = AKARA.module_config.get('admin-email', 'admin@my-open-science-server.com')
DEFAULT_MAX_RESULTS = int(AKARA.module_config.get('default-max-results', '100'))


ATOM_ENVELOPE = '''<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:ds="%s/jove/datamodel#" xmlns:os="http://a9.com/-/spec/opensearch/1.1/">
  <title>PubMed OSCI adapter</title>
  <id>http://example.org/CHANGE_ME</id>

</feed>
'''%OSCI_BASE

#These already don't match the latest on Jove, so this adapter needs a proper way to extract images from Jove video
MOCKUP_IMAGES = {
  u"http://feeds.feedburner.com/~r/jove/~3/523851013/Details.stp": u"523851013.png",
  u"http://feeds.feedburner.com/~r/jove/~3/521045934/Details.stp": u"521045934.png",
  u"http://feeds.feedburner.com/~r/jove/~3/519108408/Details.stp": u"519108408.png"
}

MOCKUP_ICON = u"video.png"

def get_data_from_page(entry, link):
    page = htmlparse(link)
    entry['authors'] = [ unicode(m.content) for m in page.html.head.meta if m.xml_select(u'string(@name)') == u"dc.Contributor" ]
    entry['media_code'] = amara.xml_encode(page.html.body.xml_select(u'//*[@src="http://www.jove.com//resources/VideoPlayer/AC_RunActiveContent.js"]')[0].xml_parent)
    #print [ (m, unicode(m.xml_select(u'@name'))) for m in page.html.head.meta ]
    return entry


#PFEED = "http://feeds.feedburner.com/jove"
#feed = bindery.parse(PFEED)

JOVE_NS = ID_BASE + u'content/jove/datamodel#'
OPENSEARCH_NAMESPACE = u'http://a9.com/-/spec/opensearch/1.1/'

JOVE_SEARCH_PATTERN = u"http://www.jove.com/index/Search.stp?%s"
#JOVE_ADAPTER_BASE = OSCI_BASE + u"content/jove"
JOVE_ADAPTER_BASE = u"jove"

JOVE_TAG = u"http://www.jove.com/index/browse.stp?tag="
JOVE_ARTICLE = u"http://www.jove.com/index/details.stp?ID="

ENTRY_CACHE = {}

@simple_service('GET', 'http://open-science.zepheira.com/content/jove/source', 'osci.jove.atom', 'application/atom+xml')
def jove_adapter(search=None, id=None):
    '''
    Sample queries:
    curl "http://localhost:8880/osci.jove.atom?search=stem+cells"
    curl "http://localhost:8880/osci.jove.atom?id=19358275"
    '''
    #FIXME: How do we handle no search or id param?  Just serve up the latest entries?  Or error as below?
    #assert_(not(search and id), msg="You must specify the 'search' or 'id' query parameter is mandatory.")
    if id:
        id = first_item(id)
        try:
            return ENTRY_CACHE[first_item(id)]
        except KeyError:
            search = [id]
    if search:
        search = first_item(search)
        #reldate: only search for last N days
        #query = urllib.urlencode({'db' : NCBI_DB, 'term': query, 'reldate': '60', 'datetype': 'edat', 'retmax': DEFAULT_MAX_RESULTS, 'usehistory': 'y'})
        query = urllib.urlencode({'query': search})
        search_url = JOVE_SEARCH_PATTERN%(query)
        #print >> sys.stderr, search_url
        search_terms = search
        alt_link = search_url
        self_link = JOVE_ADAPTER_BASE + '?' + urllib.urlencode({'search': search})
        doc = html.parse(search_url)

        f = feed(ATOM_ENVELOPE, title=search_terms.decode('utf-8'), id=self_link.decode('utf-8'))
        #f.source.feed.update = self_link.decode('utf-8')
        f.feed.xml_append(E((ATOM_NAMESPACE, u'link'), {u'rel': u'self', u'type': u'application/atom+xml', u'href': self_link.decode('utf-8')}))
        #FIXME use proper url resolution, not string concat
        f.feed.xml_append(E((ATOM_NAMESPACE, u'link'), {u'rel': u'search', u'type': u'application/opensearchdescription+xml', u'href': OSCI_BASE + u'/content/jove.discovery'}))
        f.feed.xml_append(E((ATOM_NAMESPACE, u'link'), {u'rel': u'alternate', u'type': u'text/xml', u'href': alt_link.decode('utf-8')}))
        f.feed.xml_append(E((OPENSEARCH_NAMESPACE, u'Query'), {u'role': u'request', u'searchTerms': search_terms.decode('utf-8')}))
        maxarticles = DEFAULT_MAX_RESULTS

        #for item in doc.xml_select(u'//*[@class="result_table"]//*[@class="article_title"]'):
        for item in islice(doc.xml_select(u'//*[@class="result_table"]//*[@class="article_title"]'), 0, maxarticles):
            row = item.xml_parent.xml_parent
            title = unicode(item)
            alt_link = item.a.href
            summary = unicode(row.xml_select(u'string(.//*[@class="summary"])'))
            updated = unicode(row.xml_select(u'string(.//*[@class="publication_date"])')).strip().partition(u'Published: ')[2]
            #updated = time.strptime(updated, "%m/%d/%Y %H:%M:%S") #2/11/2008 2:20:00 AM
            authors = [ (name.strip(), None, None) for name in unicode(row.xml_select(u'string(.//*[@class="authors"]//b)')).split(',') ]
            keywords = [ (k.strip(), JOVE_TAG) for k in unicode(row.xml_select(u'string(.//*[@class="keywords"])')).split(',') ]
            icon = first_item(row.xml_select(u'.//*[@class="thumbnail"]')).img.src
            icon = ''.join(icon.split())
            jove_id = item.a.href[len(JOVE_ARTICLE):]

            links = [
                (JOVE_ADAPTER_BASE + '?id=' + jove_id, u'self'),
                (icon, u'icon'),
                #(NCBI_HTML_ARTICLE_LINK_BASE + unicode(aid), u'alternate'),
            ]
            #print >> sys.stderr, links
            #categories = [ (unicode(k), SD_NS+u'authorKeyword') for k in authkw(article) ]
            elements = [
                E((ATOM_NAMESPACE, u'content'), {u'src': item.a.href}),
            #    E((SD_NS, u'sd:journal-cover'), unicode(article.journalCover).strip() if hasattr(article, 'journalCover') else DEFAULT_ICON),
            #    E((SD_NS, u'sd:journal-name'), unicode(article.journalName)),
            ]
            elements.extend([
#                E((ATOM_NAMESPACE, u'link'), {u'rel': u'self', u'href': JOVE_ADAPTER_BASE + '/?id=' + jove_id}),
                E((ATOM_NAMESPACE, u'link'), {u'rel': u'icon', u'href': icon}),
            ])
            f.append(
                item.a.href,
                title,
                updated=datetime.datetime.now().isoformat(),
                summary=summary,
                authors=authors,
                links=links,
                categories=keywords,
                elements=elements,
            )
            #print >> sys.stderr, article.xml_select(u'//*[contains(name(), "journal")]')
            #entry['journal_cover'] = 

        for e in f.feed.entry:
            ENTRY_CACHE[jove_id] = e.xml_encode()
        #FIXME: indent
        return f.xml_encode()
        
        #print >> sys.stderr, ids


#<os:totalResults>43000</os:totalResults>
#<os:startIndex>1</os:startIndex>
#<os:itemsPerPage>1</os:itemsPerPage>


@simple_service('GET', 'http://open-science.zepheira.com/content/jove/discovery', 'osci.jove.discovery', 'application/opensearchdescription+xml')
def discovery():
    '''
    Sample query:
        curl "http://localhost:8880/osci.jove.discovery"
    '''
    doc = '''<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:osci="%(oscibase)s/content/jove/datamodel#">
  <ShortName>JoVE</ShortName>
  <LongName>JoVE OSCI adapter</LongName>
  <Description>JoVE</Description>
  <Contact>%(admin)s</Contact>
  <Url type="application/atom+xml" rel="results" template="%(oscibase)s/content/jove?search={searchTerms}"/>
  <Url type="application/atom+xml" rel="http://purl.zepheira.com/osci/content/model#id" template="%(oscibase)s/content/jove?id={searchTerms}"/>
  <Attribution>© 2009 Zepheira, LLC</Attribution>
  <osci:metadata-profile href="%(oscibase)s/content/jove/metadata-profile"/>
</OpenSearchDescription>
'''%{'admin': ADMIN_EMAIL, 'oscibase': OSCI_BASE}
    #Check XML
    amara.parse(doc)
    return doc

# --- %< ---

    entries = []

    for it in islice(feed.rss.channel.item, 0, 3):
        entry = {}
        print >> sys.stderr, "processing", unicode(it.link)
        entry['id'] = unicode(it.link)
        entry['label'] = entry['id']
        entry['title'] = unicode(it.title)
        desc = unicode(it.description)
        entry['description'] = desc[:desc.find(u'<div class=\"feedflare\">')]
        #print htmlparse(str(it.description)) #Above hack will do for now ;)
        entry['link'] = unicode(it.origLink)
        entry['pubDate'] =time.strftime("%Y-%m-%dT%H:%M:%S", feedparser._parse_date(str(it.pubDate)))
        entry['categories'] = [ unicode(c).strip() for c in it.category ]
        entry['snapshot'] = MOCKUP_IMAGES[unicode(it.link)]
        entry['icon'] = MOCKUP_ICON
        entry = get_data_from_page(entry, str(it.origLink))
        entries.append(entry)

    print simplejson.dumps({'items': entries}, indent=4)

