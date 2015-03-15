---
layout: post
title: Testing the Elasticsearch cluster behavior under network failure
---

[Elasticsearch](https://www.elastic.co/products/elasticsearch) is a distributed system that depends heavily on the network, as such, you need to known how it behaves under different failures scenarios. This post shows a way of mounting these scenarios with Linux containers.

You can simulate a couple of failure scenarios:

 * Node network loss
 * Packet delay and/or loss

This setup should also be generally useful when you want to known how Elasticsearch behaves. For example: 

 * Expand or shrink the cluster
 * Node maintenance
 * Backup/Restore
 * Shard re-allocation
 * Near disk full behavior 

The setup will be created with the help of: [VirtualBox](https://www.virtualbox.org/), [Vagrant](https://www.vagrantup.com/), [CoreOS](https://coreos.com/) and [Docker](https://www.docker.com/).

<!--MORE-->

## Preparation

Make sure you install VirtualBox, Vagrant, and Git. And have them available on your `$PATH`.

Check the tools versions.

VirtualBox:

	VBoxManage --version

	4.3.24r98716

Vagrant:

	vagrant version

	Installed Version: 1.7.2

Git:

	git --version

	git version 1.9.5.msysgit.0


### CoreOS and Docker

CoreOS will be running inside a VirtualBox Virtual Machine. It will be used as our Docker host. Docker will be used to create a Linux container for each Elasticsearch node.

Install and start CoreOS:

	git clone https://github.com/coreos/coreos-vagrant test-elasticsearch
	cd test-elasticsearch
	vagrant up


Open a shell:

	vagrant ssh


Check the Docker version:

	docker version

	Client version: 1.5.0
	Client API version: 1.17
	Go version (client): go1.3.3
	Git commit (client): a8a31ef-dirty
	OS/Arch (client): linux/amd64
	Server version: 1.5.0
	Server API version: 1.17
	Go version (server): go1.3.3
	Git commit (server): a8a31ef-dirty


Check the Docker info:

	docker info

	Containers: 0
	Images: 0
	Storage Driver: overlay
	 Backing Filesystem: extfs
	Execution Driver: native-0.2
	Kernel Version: 3.19.0
	Operating System: CoreOS 618.0.0
	CPUs: 1
	Total Memory: 998 MiB
	Name: core-01
	ID: QLVN:NP7B:SZDN:D7PM:DWNF:364W:O4XA:3JLG:MNJ4:2NFS:L5YU:GUOO


## Setup

We test the different scenarios in a three node Elasticsearch cluster.

Each node is run in a Docker container that is based on the [dockerfile/elasticsearch](https://registry.hub.docker.com/u/dockerfile/elasticsearch/) image.

Docker manages the network between the nodes. It does so by creating a pair of veth (virtual Ethernet) interfaces for each container. These form a point-to-point link between the container the host. The host side will be connected to a bridge, which allows the communication between nodes:

    +-- docker0 bridge --+        +-- node0 container --+
    |                    |        |                     |  
    |      +-----> $node0_veth <----> eth1 interface    |
    |      |             |        |                     |
    |      |             |        +---------------------+
    |      |             |
    |      |             |        +-- node1 container --+
    |      |             |        |                     |
    |      +-----> $node1_veth <----> eth1 interface    |
    |      |             |        |                     |
    |      |             |        +---------------------+
    |      |             |
    |      |             |        +-- node2 container --+
    |      |             |        |                     |
    |      +-----> $node2_veth <----> eth1 interface    |
    |                    |        |                     |
    +--------------------+        +---------------------+

**NB** This setup allows for multicast, so you don't have to do anything more for having a working Elasticsearch cluster.

**NB** For more details read the [Docker Network Configuration documentation](https://docs.docker.com/articles/networking/). 

The interface name of each container is saved in a environment variable, e.g., `node0_veth`. This will later let us easily fiddle with a node network interface. 

Each container will get its data from a [volume](https://docs.docker.com/userguide/dockervolumes/) that is stored on the host. This will let us easily see the logs and index data.

Each container will also have the normal Elasticsearch 9200 port forwarded to the host, e.g. node 1 will be available at `http://localhost:9201`.

Before you can start the nodes you need the [docker-native-inspect](https://bitbucket.org/rgl/docker-native-inspect) tool. Build it with:

{% highlight bash %}
{% raw %}
curl -o docker-native-inspect.tar.bz2 https://bitbucket.org/rgl/docker-native-inspect/get/default.tar.bz2
mkdir docker-native-inspect
sudo mkdir -p /opt/bin
tar xf docker-native-inspect.tar.bz2 --strip-components=1 -C docker-native-inspect
docker build -t docker-native-inspect docker-native-inspect
docker run --rm docker-native-inspect tar czf - docker-native-inspect | tar vxzf - -C /opt/bin
docker-native-inspect -h
{% endraw %}
{% endhighlight %}

And start the Elasticsearch nodes with:

{% highlight bash %}
{% raw %}
for i in 0 1 2; do
  mkdir -p node$i/{data,work,logs,plugins}
  docker run -d \
    --name=node$i \
    --hostname=node$i \
    -p 920$i:9200 \
    -v "$PWD/node$i:/data" \
    dockerfile/elasticsearch \
    /elasticsearch/bin/elasticsearch \
    -Des.node.name=node$i \
    -Des.path.data=/data/data \
    -Des.path.work=/data/work \
    -Des.path.logs=/data/logs \
    -Des.path.plugins=/data/plugins \
    -Des.logger.level=DEBUG
  declare "node${i}_veth=`sudo docker-native-inspect -format '{{.network_state.veth_host}}' state node$i`"
done
{% endraw %}
{% endhighlight %}

Install some plugins:

{% highlight bash %}
{% raw %}
for i in 0 1 2; do
  docker exec -it node$i /elasticsearch/bin/plugin --install mobz/elasticsearch-head       # /_plugin/head
  docker exec -it node$i /elasticsearch/bin/plugin --install royrusso/elasticsearch-HQ     # /_plugin/HQ
  #docker exec -it node$i /elasticsearch/bin/plugin --install lmenezes/elasticsearch-kopf  # /_plugin/kopf
done
{% endraw %}
{% endhighlight %}

**NB** Access them at [http://localhost:9200/_plugin/head](http://localhost:9200/_plugin/head) or [HQ](http://localhost:9200/_plugin/HQ).


If you need to access the node, e.g. to inspect something, you can use:

	docker exec -it node0 bash


Create a basic `hello` index:

{% highlight bash %}
{% raw %}
curl -XPUT http://localhost:9200/hello -d '
index:
    number_of_shards: 3
    number_of_replicas: 1
'
{% endraw %}
{% endhighlight %}

Index some documents:

{% highlight bash %}
{% raw %}
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -XPUT http://localhost:9200/hello/message/$i -d "{\"message\":\"hello $i\"}"
done
{% endraw %}
{% endhighlight %}

To see how things are going, open a different shell, and tail the logs:

	tail -f node*/logs/elasticsearch.log

Also open the head and HQ pages:

	http://localhost:9200/_plugin/head
	http://localhost:9200/_plugin/HQ

You are now ready to test the several scenarios!


## Test

### Node network loss

To simulate a network loss we simply bring the node container veth interface down:

{% highlight bash %}
{% raw %}
sudo ip link set dev $node1_veth down
{% endraw %}
{% endhighlight %}

If you now try to refresh the cluster state in the head plugin, you should see it does not really work. After a while, the Elasticsearch logs should starting to display a lot of activity.

For example, at the master node (in my case this was `node2`), things like:

{% highlight text %}
{% raw %}
[2015-03-14 14:50:55,265][DEBUG][action.admin.cluster.node.stats] [node2] failed to execute on node [gDtJuVYCQ5qHiU-aSKnj7g]
org.elasticsearch.transport.ReceiveTimeoutTransportException: [node1][inet[/10.1.0.12:9300]][cluster:monitor/nodes/stats[n]] request_id [289] timed out after [15002ms]
        at org.elasticsearch.transport.TransportService$TimeoutHandler.run(TransportService.java:366)
        at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1142)
        at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:617)
        at java.lang.Thread.run(Thread.java:745)

[2015-03-14 14:51:25,263][DEBUG][action.admin.cluster.node.stats] [node2] failed to execute on node [gDtJuVYCQ5qHiU-aSKnj7g]
org.elasticsearch.transport.ReceiveTimeoutTransportException: [node1][inet[/10.1.0.12:9300]][cluster:monitor/nodes/stats[n]] request_id [326] timed out after [15000ms]
        at org.elasticsearch.transport.TransportService$TimeoutHandler.run(TransportService.java:366)
        at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1142)
        at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:617)
        at java.lang.Thread.run(Thread.java:745)

[2015-03-14 14:51:55,265][DEBUG][action.admin.cluster.node.stats] [node2] failed to execute on node [gDtJuVYCQ5qHiU-aSKnj7g]
org.elasticsearch.transport.ReceiveTimeoutTransportException: [node1][inet[/10.1.0.12:9300]][cluster:monitor/nodes/stats[n]] request_id [363] timed out after [15001ms]
        at org.elasticsearch.transport.TransportService$TimeoutHandler.run(TransportService.java:366)
        at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1142)
        at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:617)
        at java.lang.Thread.run(Thread.java:745)

[2015-03-14 14:51:58,692][DEBUG][discovery.zen.fd         ] [node2] [node  ] failed to ping [[node1][gDtJuVYCQ5qHiU-aSKnj7g][node1][inet[/10.1.0.12:9300]]], tried [3] times, each with  maximum [30s] timeout

[2015-03-14 14:51:58,700][DEBUG][cluster.service          ] [node2] processing [zen-disco-node_failed([node1][gDtJuVYCQ5qHiU-aSKnj7g][node1][inet[/10.1.0.12:9300]]), reason failed to ping, tried [3] times, each with maximum [30s] timeout]: execute

[2015-03-14 14:51:58,726][DEBUG][cluster.service          ] [node2] cluster state updated, version [11], source [zen-disco-node_failed([node1][gDtJuVYCQ5qHiU-aSKnj7g][node1][inet[/10.1.0.12:9300]]), reason failed to ping, tried [3] times, each with maximum [30s] timeout]

[2015-03-14 14:51:58,732][INFO ][cluster.service          ] [node2] removed {[node1][gDtJuVYCQ5qHiU-aSKnj7g][node1][inet[/10.1.0.12:9300]],}, reason: zen-disco-node_failed([node1][gDtJuVYCQ5qHiU-aSKnj7g][node1][inet[/10.1.0.12:9300]]), reason failed to ping, tried [3] times, each with maximum [30s] timeout

[2015-03-14 14:51:58,732][DEBUG][cluster.service          ] [node2] publishing cluster state version 11
{% endraw %}
{% endhighlight %}

After which the cluster will scramble to recover the lost shards in the remaining nodes.

And on `node1` (the one we cut the network cable) will have something like:

{% highlight text %}
{% raw %}
[2015-03-14 14:51:58,847][DEBUG][discovery.zen.fd         ] [node1] [master] failed to ping [[node2][E3MoSOWDSDW_8AdCPznakg][node2][inet[/10.1.0.13:9300]]], tried [3] times, each with maximum [30s] timeout

[2015-03-14 14:51:58,851][DEBUG][discovery.zen.fd         ] [node1] [master] stopping fault detection against master [[node2][E3MoSOWDSDW_8AdCPznakg][node2][inet[/10.1.0.13:9300]]], reason [master failure, failed to ping, tried [3] times, each with  maximum [30s] timeout]

[2015-03-14 14:51:58,854][INFO ][discovery.zen            ] [node1] master_left [[node2][E3MoSOWDSDW_8AdCPznakg][node2][inet[/10.1.0.13:9300]]], reason [failed to ping, tried [3] times, each with  maximum [30s] timeout]

[2015-03-14 14:51:58,868][DEBUG][cluster.service          ] [node1] processing [zen-disco-master_failed ([node2][E3MoSOWDSDW_8AdCPznakg][node2][inet[/10.1.0.13:9300]])]: execute

[2015-03-14 14:51:58,870][WARN ][discovery.zen            ] [node1] master left (reason = failed to ping, tried [3] times, each with  maximum [30s] timeout), current nodes: {[node0][tu2reCtdT2Shekx0gitB1g][node0][inet[/10.1.0.11:9300]],[node1][gDtJuVYCQ5qHiU-aSKnj7g][node1][inet[/10.1.0.12:9300]],}

[2015-03-14 14:51:58,898][DEBUG][cluster.service          ] [node1] cluster state updated, version [10], source [zen-disco-master_failed ([node2][E3MoSOWDSDW_8AdCPznakg][node2][inet[/10.1.0.13:9300]])]

[2015-03-14 14:51:58,903][INFO ][cluster.service          ] [node1] removed {[node2][E3MoSOWDSDW_8AdCPznakg][node2][inet[/10.1.0.13:9300]],}, reason: zen-disco-master_failed ([node2][E3MoSOWDSDW_8AdCPznakg][node2][inet[/10.1.0.13:9300]])

[2015-03-14 14:51:58,918][DEBUG][cluster.service          ] [node1] set local cluster state to version 10

[2015-03-14 14:51:58,968][DEBUG][cluster.service          ] [node1] processing [zen-disco-master_failed ([node2][E3MoSOWDSDW_8AdCPznakg][node2][inet[/10.1.0.13:9300]])]: done applying updated cluster_state (version: 10)
{% endraw %}
{% endhighlight %}

After a while `node1` will be marked as failed by `node2` and will no longer be pinged. Which means, it has to manually re-join the cluster. 


After a while `node1` will elect itself as a master:

{% highlight bash %}
{% raw %}
[2015-03-14 14:53:03,491][DEBUG][cluster.service          ] [node1] cluster state updated, version [11], source [zen-disco-join (elected_as_master)]

[2015-03-14 14:53:03,491][INFO ][cluster.service          ] [node1] new_master [node1][gDtJuVYCQ5qHiU-aSKnj7g][node1][inet[/10.1.0.12:9300]], reason: zen-disco-join (elected_as_master)

[2015-03-14 14:53:03,492][DEBUG][cluster.service          ] [node1] publishing cluster state version 11

[2015-03-14 14:53:33,504][WARN ][discovery.zen.publish    ] [node1] timed out waiting for all nodes to process published state [11] (timeout [30s], pending nodes: [[node0][tu2reCtdT2Shekx0gitB1g][node0][inet[/10.1.0.11:9300]]])
{% endraw %}
{% endhighlight %}

Which is somewhat odd. But this happens because the [`discovery.zen.minimum_master_nodes`](http://www.elastic.co/guide/en/elasticsearch/reference/current/modules-discovery-zen.html#master-election) key was not changed from the default of `1`. You should probably increase that value.


Bring the interface back up to the network:

{% highlight bash %}
{% raw %}
sudo ip link set dev $node1_veth up
{% endraw %}
{% endhighlight %}

You'll notice that the node will not re-join the other nodes in the cluster. You have to manually restart it:

{% highlight bash %}
{% raw %}
docker stop node1
docker start node1
declare "node1_veth=`sudo docker-native-inspect -format '{{.network_state.veth_host}}' state node1`"
{% endraw %}
{% endhighlight %}

And it should now join the cluster.


### Packet delay and/or loss

Linux lets you fiddle with the network stack in several ways. One of them lets you delay or discard packets. 

You can influence the entire communication between all nodes by changing the `bridge0` interface. You can also do it for a single node by changing the corresponding veth interface. 

For example, to add 100ms+-10ms delay to all packets:

	sudo tc qdisc add dev docker0 root netem delay 100ms 10ms

To change it to have 25% pseudo-correlation:

	sudo tc qdisc change dev docker0 root netem delay 100ms 10ms 25%

To change it to have 1% of packet loss:

	sudo tc qdisc change dev docker0 root netem loss 1%

To change it to combine delay and loss:

	sudo tc qdisc change dev docker0 root netem delay 100ms 10ms 25% loss 1%

To see all rules:

	sudo tc qdisc show dev docker0

To remove all rules:

	sudo tc qdisc del dev docker0 root

To apply the above examples to a specific node, instead of the `docker0` device use the corresponding veth device, e.g. `$node2_veth`.

For more information see:

 * [Linux Network Emulation](http://www.linuxfoundation.org/collaborate/workgroups/networking/netem)
 * [Linux Traffic Control](https://wiki.archlinux.org/index.php/Advanced_traffic_control)
 * [Docker networking](https://docs.docker.com/articles/networking/)
