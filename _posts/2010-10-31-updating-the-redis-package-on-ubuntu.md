---
layout: post
title: Updating the redis package on Ubuntu
date: '2010-10-31T22:37:00+00:00'
tags:
- redis
- ubuntu
- recipe
tumblr_url: http://blog.ruilopes.com/post/1448755210/updating-the-redis-package-on-ubuntu
---
Latest <a href="code.google.com/p/redis/">redis</a> versions can take quite a while to appear in the official Ubuntu archives, but fortunately, updating a package is quite strait-forward. In this post I'm going to update the <a href="http://packages.ubuntu.com/lucid/redis-server">package</a> that ships with Ubuntu 10.04 from version 1.2.0 to 2.0.4.

<!--MORE-->

Before updating a package, we should check whether there is a recent version available on the archive:

<pre>
http://archive.ubuntu.com/ubuntu/pool/universe/r/redis/?C=M;O=D
</pre>

And in this case, there is 2.0.1! So we'll base our work on that version.

To build a package we need to install the standard development tools:

<pre>
sudo apt-get install build-essential patch devscripts patchutils fakeroot debhelper quilt
</pre>

Get the latest available source package:

<pre>
dget http://archive.ubuntu.com/ubuntu/pool/universe/r/redis/redis_2.0.1-2.dsc
</pre>

Get the latest redis source tarball, and unpack it:

<pre>
wget http://redis.googlecode.com/files/redis-2.0.4.tar.gz -O redis_2.0.4.orig.tar.gz
tar xf redis_2.0.4.orig.tar.gz
cd redis-2.0.4
</pre>

Unpack the debian specific files from the previous Ubuntu package:

<pre>
tar xf ../redis_2.0.1-2.debian.tar.gz
</pre>

Add new entry into the debian changelog:

<pre>
dch -i
redis (2:2.0.4-1ubuntu1) lucid; urgency=low
  * New upstream release.
-- Rui Lopes &lt;rgl@ice>  Sun, 07 Nov 2010 22:00:26 +0000
</pre>

See if the config file is more-or-less the same as it was in the previous package:

<pre>
diff -u redis.conf debian/redis.conf | vim -
</pre>

In this particular case, the configuration wasn't changed, so we have nothing to tweak.

Finally, build the source and create the package:

<pre>
dpkg-buildpackage -rfakeroot -uc -b
</pre>

Install the package with:

<pre>
sudo dpkg -i ../redis-server_2.0.4-1ubuntu1_amd64.deb
</pre>

You should now have redis up and ready for a test drive! So, lets try to connect to redis to get some basic status:

<pre>
redis-cli
redis&gt; INFO
redis_version:2.0.4
redis_git_sha1:1c145073
redis_git_dirty:0
arch_bits:64
multiplexing_api:epoll
process_id:8345
uptime_in_seconds:63
uptime_in_days:0
connected_clients:1
connected_slaves:0
blocked_clients:0
used_memory:781568
used_memory_human:763.25K
changes_since_last_save:0
bgsave_in_progress:0
last_save_time:1289167394
bgrewriteaof_in_progress:0
total_connections_received:1
total_commands_processed:0
expired_keys:0
hash_max_zipmap_entries:64
hash_max_zipmap_value:512
pubsub_channels:0
pubsub_patterns:0
vm_enabled:0
role:master
</pre>

And that's it!

-- RGL
