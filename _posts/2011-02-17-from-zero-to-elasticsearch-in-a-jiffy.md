---
layout: post
title: from zero to elasticsearch in a jiffy
date: '2011-02-17T16:39:00+00:00'
tags:
- elasticsearch
- lucene
- search
tumblr_url: http://blog.ruilopes.com/post/3345958088/from-zero-to-elasticsearch-in-a-jiffy
---
In this article I will cut to the chase on how to start using [elasticsearch](http://www.elasticsearch.org/), a distributed search engine that just works, _You known, for Search_!

<!--MORE-->

Elasticsearch (ES) is based on [Lucene](http://lucene.apache.org/), as so, you first need to [download the Java Runtime Environment](http://www.oracle.com/technetwork/java/javase/downloads/index.html). I'll assume you have installed it at `C:\Dev\Java\jre6`.

Next, download elasticsearch from:

  http://www.elasticsearch.org/download/

And decompress it, eg., at `C:\Dev\elasticsearch-0.14.4`.

Open a Windows Command Prompt window, go into ES directory, and launch it:

<pre>
cd c:\Dev\elasticsearch-0.14.4
set JAVA_HOME=C:\Dev\Java\jre6
bin\elasticsearch.bat -f
</pre>

In a new Windows Command Prompt window, verify that ES is responding correctly. First check the [cluster status](http://www.elasticsearch.org/guide/reference/api/admin-cluster-health.html) by opening the following URL:

  http://localhost:9200/_cluster/health

You should see something like:

{% highlight js %}
{
  cluster_name: "elasticsearch"
  status: "green"
  timed_out: false
  number_of_nodes: 1
  number_of_data_nodes: 1
  active_primary_shards: 0
  active_shards: 0
  relocating_shards: 0
  initializing_shards: 0
  unassigned_shards: 0
}
{% endhighlight %}

And also check the [cluster state](http://www.elasticsearch.org/guide/reference/api/admin-cluster-state.html) at:

  http://localhost:9200/_cluster/state

Which should return something like:

{% highlight js %}
{
  cluster_name: "elasticsearch",
  master_node: "Sz86lynqSAKwb1X_NHsrIQ",
  blocks: {},
  nodes: {
    Sz86lynqSAKwb1X_NHsrIQ: {
      name: "Dredmund Druid",
      transport_address: "inet[/192.168.1.245:9300]",
      attributes: {}
    }
  },
  metadata: {
    templates: {},
    indices: {}
  },
  routing_table: {
    indices: {}
  },
  routing_nodes: {
    unassigned: [],
    nodes: {}
  },
  allocations: []
}
{% endhighlight %}

As ES seems to be working fine, we are now ready to index some documents; I'm going to use a tweet as an example.

Open a Bash shell window (I'm assuming you already have it installed as described at [Sane shell environment on Windows](http://blog.ruilopes.com/post/2143557964/sane-shell-environment-on-windows)).

You also need [curl](http://curl.haxx.se/download.html) on your `PATH`, you can install it from:

  http://curl.haxx.se/download/libcurl-7.19.3-win32-ssl-msvc.zip

Download a tweet:

<pre>
curl -o 19529810560688128.json 'http://api.twitter.com/1/statuses/show/19529810560688128.json?include_entities=1'
</pre>

And check its overall structure:

    cat 19529810560688128.json

{% highlight js %}
{
  "text": "why marking an operation as idempotent is important: http:\/\/www.zeroc.com\/faq\/whyIdempotent.html"
...
{% endhighlight %}

NB I'm just showing the attribute that is relevant to the search we are going to make. The actual tweet has much more attributes.

Lets index it:

<pre>
curl -XPUT -d@19529810560688128.json http://localhost:9200/tweets/tweet/19529810560688128
</pre>

ES should return something like:

{% highlight js %}
{
  "_id": "19529810560688128",
  "_index": "tweets",
  "_type": "tweet",
  "ok": true
}
{% endhighlight %}

We are now ready for our first search! Lets [search for tweets](http://www.elasticsearch.org/guide/reference/api/search/uri-request.html) that have the "idempotent" word. For this we use the `q` parameter like:

<pre>
curl 'http://localhost:9200/tweets/_search?pretty=true&q=idempotent'
</pre>

Which returns something like:

{% highlight js %}
{
  "_shards": {
    "failed": 0,
    "successful": 5,
    "total": 5
  },
  "hits": {
    "hits": [
      {
        "_id": "19529810560688128",
        "_index": "tweets",
        "_score": 0.023731936,
        "_source": {
          "text": "why marking an operation as idempotent is important: http:\/\/www.zeroc.com\/faq\/whyIdempotent.html"
          ...
        },
        "_type": "tweet"
      }
    ],
    "max_score": 0.023731936,
    "total": 1
  },
  "took": 1
}
{% endhighlight %}

The most important attribute in this result set is the `hits.hits` array, it contains all matched documents hits.

The previous search looked inside all tweet attributes. We can also search inside a particular attribute, for example, "text" attribute:

<pre>
curl 'http://localhost:9200/tweets/_search?pretty=true&q=text:idempotent'
</pre>

Which should return the same document as before, but this time, with a higher [score](http://lucene.apache.org/java/3_0_0/scoring.html).

ES lets us do much more advanced searches; we can use the simple [Lucene Query Parser Syntax](http://lucene.apache.org/java/3_0_0/queryparsersyntax.html) (as we did) and we can also use the [JSON based search query DSL](http://www.elasticsearch.org/guide/reference/query-dsl/).

And that's it! As you can see, the out-of-box experience is quite simple and strait forward! Of course, this was just the tip of the iceberg. elasticsearch [has many tricks up its sleeve](http://www.elasticsearch.org/), my favorites are: simplicity, automatically distributed (just keep launching nodes, one or several, its the same; its really elastic), highly available (data is replicated; if a node fails, the data will come from another node) and [thrift transport](http://www.elasticsearch.org/guide/reference/modules/thrift) (at least one order of magnitude faster than HTTP).

You should read the [documentation](http://www.elasticsearch.org/guide/) and [join the community](http://www.elasticsearch.org/community/)!

Also checkout the various [client libraries](http://www.elasticsearch.org/guide/appendix/clients.html), and the [source code](https://github.com/elasticsearch/elasticsearch).

Oh, and in case you were wondering, the node names that appear on the logs are based on marvel characters, e.g.:

[2011-02-17 11:13:47,427][INFO ][node                     ] [[D-Man](http://en.wikipedia.org/wiki/Demolition_Man_(comics))] {elasticsearch/0.14.4}[6212]: stopping ...

[2011-02-17 11:13:53,516][INFO ][node                     ] [[Sublime, John](http://en.wikipedia.org/wiki/Sublime_(comics))] {elasticsearch/0.14.4}[5520]: initializing ...

-- RGL
