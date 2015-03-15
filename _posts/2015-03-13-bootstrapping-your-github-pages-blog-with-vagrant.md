---
layout: post
title: Bootstrapping your GitHub Pages blog with Vagrant
---

This will show you a way of creating a [Vagrant](https://www.vagrantup.com/) Virtual Machine with the tools needed for generating a blog based on the [GitHub Pages](https://pages.github.com/) stack. GitHub Pages uses the [Jekyll](http://jekyllrb.com/) static site generator. This VM will use the same version of the tools that are currently in use at GitHub.

<!--MORE-->

The base Vagrant box is based on the one created in [From Iso To Vagrant Box]({% post_url 2015-03-12-from-iso-to-vagrant-box %}) post (read it first) but with a Xubuntu desktop.

You need to modify the base box to install the `xubuntu-desktop` package. For that, modify the preseed `pkgsel/include` line to include its package name:

{% highlight bash %}
{% raw %}
  vi preseed.txt
...
d-i pkgsel/include string openssh-server, xubuntu-desktop
...
{% endraw %}
{% endhighlight %}


Build the image, and add it to Vagrant:

{% highlight bash %}
{% raw %}
packer build ubuntu-14.10.json
vagrant box add xubuntu-14.10-amd64 ubuntu-14.10-amd64-virtualbox.box
rm ubuntu-14.10-amd64-virtualbox.box
{% endraw %}
{% endhighlight %}


Create the `Vagrantfile` that provisions the GitHub Pages tools:

{% highlight ruby %}
{% raw %}
cat<<"VAGRANTFILE">Vagrantfile
# -*- mode: ruby -*-
# vi: set ft=ruby :

$root_provision_script = <<'ROOT_PROVISION_SCRIPT'
#!/bin/bash
# abort this script on errors.
set -eux

# prevent apt-get et al from opening stdin.
# NB even with this, you'll still get some warnings that you can ignore:
#     dpkg-preconfigure: unable to re-open stdin: No such file or directory
export DEBIAN_FRONTEND=noninteractive

# install javascript support for Jekyll.
# See https://github.com/sstephenson/execjs
apt-get -y install software-properties-common
apt-add-repository -y ppa:chris-lea/node.js
apt-get update
apt-get -y install nodejs

# install git. we'll use it to later push the blog to github.
apt-get -y install git

# install ruby. Jekyll is a ruby application.
apt-get -y install ruby-dev ruby

# install dependencies needed for the gems.
apt-get -y install zlib1g-dev

# install Jekyll -- the version that is currently hosted by GitHub.
gem install --verbose github-pages
ROOT_PROVISION_SCRIPT

Vagrant.configure(2) do |config|
  config.vm.box = "xubuntu-14.10-amd64"

  config.vm.hostname = "pages"

  config.vm.provider "virtualbox" do |vb|
    vb.gui = true
  end

  config.vm.provision "shell", inline: $root_provision_script
end
VAGRANTFILE
{% endraw %}
{% endhighlight %}


Enter the VM and [generate](https://help.github.com/articles/generating-ssh-keys/) a SSH key-pair:

{% highlight bash %}
{% raw %}
vagrant ssh
ssh-keygen
cat ~/.ssh/id_rsa.pub
{% endraw %}
{% endhighlight %}


Add the public key (the content of the `id_rsa.pub` file) into your GitHub account at:

  [https://github.com/settings/ssh](https://github.com/settings/ssh)

Also create a new empty repository named after your username, e.g. `example.github.io`.

**NB** From here on I'll use `example` as your username.


Setup git:

{% highlight bash %}
{% raw %}
git config --global user.name "Example Doe"
git config --global user.email example@example.com
git config --global push.default simple
git config --list
{% endraw %}
{% endhighlight %}


Test that it works:

{% highlight bash %}
{% raw %}
ssh -T git@github.com
{% endraw %}
{% endhighlight %}


Initialize the blog:

{% highlight bash %}
{% raw %}
git clone git@github.com:example/example.github.io.git
cd example.github.io
jekyll new .
{% endraw %}
{% endhighlight %}


Start the server:

{% highlight bash %}
{% raw %}
jekyll serve
{% endraw %}
{% endhighlight %}


And access the blog at:

  [http://localhost:4000](http://localhost:4000)


At another shell, open a file, edit and save it:

{% highlight bash %}
{% raw %}
vi blog/about.md
{% endraw %}
{% endhighlight %}


After you save a file Jekyll should re-generate the blog. To see the result just refresh the browser page.


When you are ready, push the changes to the world:

{% highlight bash %}
{% raw %}
git add --all
git commit -m 'Hello World!'
git push
{% endraw %}
{% endhighlight %}


After a couple of minutes the blog should be live at:

  http://example.github.io


And that's it!