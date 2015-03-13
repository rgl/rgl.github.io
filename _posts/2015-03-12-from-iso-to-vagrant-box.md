---
layout: post
---

This is my recipe on how to automatically create an up-to-date Ubuntu Vagrant box file from an iso.

You need the following ingredients:

* [Ubuntu minimal ISO](https://help.ubuntu.com/community/Installation/MinimalCD)
* [Packer](https://packer.io/) 
* [Vagrant](https://www.vagrantup.com/)
* [VirtualBox](https://www.virtualbox.org/)

I use the minimal ISO because the regular ISO does not always contains the latest package versions, so you'll not end up having to update your system just right after you install it. This is because the mini ISO installs the latest packages right of the internet; it is also much smaller than the regular ISO. 

Packer is used to install Ubuntu into a Vagrant box file. Packer uses a [template file](https://packer.io/docs/basics/terminology.html#Templates) to describe that process. The template uses a [preseed](https://wiki.debian.org/DebianInstaller/Preseed) file to drive the Debian installer (aka *d-i*) to automatically install Ubuntu in a VirtualBox Virtual Machine, which will be later exported into a Vagrant box file.

Vagrant is used to automatically create and setup (or provision) a development environment inside a Virtual Machine. Vagrant uses a [Vagrantfile](http://docs.vagrantup.com/v2/vagrantfile/) script to describe that process.

VirtualBox is used to actually run the Virtual Machine.

<!--MORE--> 

The following sections assume that you already have Packer, Vagrant and VirtualBox installed and available on your `PATH`.

## Packer Template

Create the template:

{% highlight js %}
{% raw %}
cat<<"EOF">ubuntu-14.10.json
{
  "variables": {
    "disk_size": 8192
  },
  "builders": [
    {
      "name": "amd64-virtualbox",
      "type": "virtualbox-iso",
      "guest_os_type": "Ubuntu_64",
      "guest_additions_mode": "attach",
      "headless": false,
      "http_directory": ".",
      "vboxmanage": [
        ["modifyvm", "{{.Name}}", "--memory", "2048"],
        ["modifyvm", "{{.Name}}", "--cpus", "2"],
        ["modifyvm", "{{.Name}}", "--vram", "32"]
      ],
      "disk_size": "{{user `disk_size`}}",
      "hard_drive_interface": "sata",
      "iso_url": "http://archive.ubuntu.com/ubuntu/dists/utopic/main/installer-amd64/current/images/netboot/mini.iso",
      "iso_checksum": "4f783f3917ed4c663c9a983f4ee046fc",
      "iso_checksum_type": "md5",
      "ssh_username": "vagrant",
      "ssh_password": "vagrant",
      "ssh_wait_timeout": "60m",
      "boot_wait": "5s",
      "boot_command": [
        "<esc><wait>",
        "/linux initrd=/initrd.gz",
        " nofb",
        " fb=false",
        " auto=true",
        " url=http://{{.HTTPIP}}:{{.HTTPPort}}/preseed.txt",
        " hostname=vagrant",
        " DEBCONF_DEBUG=5",
        " --",
        " nofb",
        "<enter>"
      ],
      "shutdown_command": "echo vagrant | sudo -S poweroff"
    }
  ],

  "provisioners": [
    {
      "type": "shell",
      "execute_command": "echo vagrant | sudo -S bash {{.Path}}",
      "scripts": ["setup.sh"]
    }
  ],

  "post-processors": [
    {
      "type": "vagrant",
      "output": "ubuntu-14.10-{{.BuildName}}.box"
    }
  ]
}
EOF
{% endraw %}
{% endhighlight %}

### Notes

* To known the available boot options open the `boot/grub/grub.cfg` file inside the `mini.iso` file.

* While d-i is installing Ubuntu you can press `alt+f2` to open a shell and inspect the environment. e.g. `cat /proc/cmdline ; env ; ls -l /target`

* You can also press `alt+f4` to see what is going on (its a console running `tail -f /var/log/syslog`). Press `alt+f1` to return to the d-i.

* The `DEBCONF_DEBUG=5` was added into the [kernel command line](https://github.com/torvalds/linux/blob/master/Documentation/kernel-parameters.txt) to aid us in debugging the preseed installation. At install time, when d-i asks a question, look at the last debconf variable that is mentioned on syslog (press `alt+f4`), its probably the one you need to set to answer the question.

* At a console, to change the keyboard map, type e.g. `loadkeys pt`.

* You only have the Nano text editor on the install console. To search text inside it press `ctrl+w`. To repeat the search press `alt+w`. To search backwards press `alt+b`.


## Preseed

Create the preseed:

{% highlight bash %}
{% raw %}
cat<<"EOF">preseed.txt
# save the log for debugging purposes.
d-i preseed/late_command string cp /var/log/syslog /target/home/vagrant/preseed.log

d-i debian-installer/locale string en_US.UTF-8
d-i localechooser/supported-locales multiselect en_US.UTF-8, pt_PT.UTF-8

d-i keyboard-configuration/layoutcode string pt
d-i console-setup/ask_detect boolean false

d-i mirror/country string manual
d-i mirror/http/hostname string nl.archive.ubuntu.com
d-i mirror/http/directory string /ubuntu
d-i mirror/http/proxy string

d-i clock-setup/utc boolean true
d-i time/zone string Europe/Lisbon

d-i partman-auto/method string regular
d-i partman-auto/choose_recipe select atomic
d-i partman-partitioning/confirm_write_new_label boolean true
d-i partman/choose_partition select finish
d-i partman/confirm boolean true
d-i partman/confirm_nooverwrite boolean true

d-i grub-installer/only_debian boolean true
d-i finish-install/reboot_in_progress note

d-i passwd/user-fullname string vagrant
d-i passwd/username string vagrant
d-i passwd/user-password password vagrant
d-i passwd/user-password-again password vagrant
d-i user-setup/allow-password-weak boolean true
d-i user-setup/encrypt-home boolean false

tasksel tasksel/first multiselect
d-i pkgsel/include string openssh-server
d-i pkgsel/upgrade select full-upgrade
d-i pkgsel/update-policy select none
EOF
{% endraw %}
{% endhighlight %}

### Notes

* Also see the [example preseed](https://help.ubuntu.com/14.10/installation-guide/example-preseed.txt) at the Ubuntu Installation Guide.

* A `preseed/late_command` was added to aid in debugging the preseed; it creates a `preseed.log` file with what happened at preseed.

* `keyboard-configuration/layoutcode` accepts similar values as [loadkeys(1)](http://manpages.ubuntu.com/manpages/utopic/en/man1/loadkeys.1.html), e.g. `us`, `pt`, etc.

* `time/zone` accepts a filename relative to the `/usr/share/zoneinfo/` directory.

* `tasksel/first` is a comma separated list, .e.g. `ubuntu-server, xubuntu-desktop`.

* You can later add support for other locales. e.g. I like to use [ConEmu](https://code.google.com/p/conemu-maximus5/) and it does not support UTF-8 at all, so I do:

{% highlight bash %}
sudo sh -c 'echo en_US.ISO-8859-15 ISO-8859-15 >> /var/lib/locales/supported.d/local'
sudo sudo dpkg-reconfigure locales
export LANG=en_US.ISO-8859-15 LANGUAGE=en_US
#sudo sh -c "echo 'LANG=$LANG' > /etc/default/locale" # optional. maybe just do this on your .bashrc
{% endhighlight %}


## Provisioning script

Create the provisioning script:

{% highlight bash %}
{% raw %}
cat<<"ENDSETUP">setup.sh
#!/bin/bash
# abort this script when a command fails or a unset variable is used.
set -eu
# echo all the executed commands.
set -x

# let our user use root permissions without sudo asking for a password (because
# d-i adds us into the sudo group, but we must be on the admin group instead).
# alternatively: echo 'vagrant ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/vagrant
groupadd -r admin
usermod -a -G admin vagrant
gpasswd -d vagrant sudo
sed -i -e 's,%admin ALL=(ALL) ALL,%admin ALL=(ALL) NOPASSWD:ALL,g' /etc/sudoers

# installing the vagrant public key.
# NB vagrant will replace it on the first run.
install -d -m 700 /home/vagrant/.ssh
pushd /home/vagrant/.ssh
wget --no-check-certificate https://raw.github.com/mitchellh/vagrant/master/keys/vagrant.pub -O authorized_keys
chmod 600 ~/.ssh/authorized_keys
chown -R vagrant:vagrant .

# install the VirtualBox Guest Additions.
# this will be installed at /opt/VBoxGuestAdditions-VERSION.
# REMOVE_INSTALLATION_DIR=0 is to fix a bug in VBoxLinuxAdditions.run.
# See http://stackoverflow.com/a/25943638.
apt-get -y -q install gcc dkms
mkdir -p /mnt
mount /dev/sr1 /mnt
while [ ! -f /mnt/VBoxLinuxAdditions.run ]; do sleep 1; done
REMOVE_INSTALLATION_DIR=0 /mnt/VBoxLinuxAdditions.run --target /tmp/VBoxGuestAdditions
rm -rf /tmp/VBoxGuestAdditions
umount /mnt

# disable the DNS reverse lookup on the SSH server. this stops it from
# trying to resolve the client IP address into a DNS domain name, which
# is kinda slow and does not normally work when running inside VB.
echo UseDNS no >> /etc/ssh/sshd_config

# disable the graphical terminal. its kinda slow and useless on a VM.
sed -i -E 's,#(GRUB_TERMINAL\s*=).*,\1console,g' /etc/default/grub
update-grub

# use the up/down arrows to navigate the bash history.
# NB to get these codes, press ctrl+v then the key combination you want.
cat<<"EOF">>/etc/inputrc
"\e[A": history-search-backward
"\e[B": history-search-forward
set show-all-if-ambiguous on
set completion-ignore-case on
EOF

# clean packages.
apt-get -y autoremove
apt-get -y clean

# zero the free disk space -- for better compression of the box file.
#dd if=/dev/zero of=/EMPTY bs=1M ; rm -f /EMPTY
ENDSETUP
{% endraw %}
{% endhighlight %}


## Build

Build it:

{% highlight bash %}
packer validate ubuntu-14.10.json
packer inspect ubuntu-14.10.json
#time packer build -var disk_size=81920 ubuntu-14.10.json
time packer build ubuntu-14.10.json
{% endhighlight %}

**NB** you can also modify the disk size with the `disk_size` [user variable](https://www.packer.io/docs/templates/user-variables.html). e.g. for 80GB, build with: `packer build -var disk_size=81920 ubuntu-14.10.json`.

**NB** the box will compress to about 720MB (with 1.2G of used space).

**NB** in my machine, the build took about 15 minutes to create the final box file.

Add the box to vagrant:

    vagrant box add ubuntu-14.10-amd64 ubuntu-14.10-amd64-virtualbox.box


## Test

Create a test VM based on our created box:

{% highlight bash %}
mkdir -p test && cd test
vagrant init ubuntu-14.10-amd64
time vagrant up
{% endhighlight %}

**NB** in my machine, this takes about 45 seconds to boot.

Connect to the console, and kick the tires:

{% highlight bash %}
vagrant ssh
uname -a
id
df -h
less preseed.log
cat /proc/cmdline
dmesg
exit
{% endhighlight %}

Poweroff the VM, and destroy it:

{% highlight bash %}
vagrant halt
vagrant destroy
cd ..
rm -rf test
{% endhighlight %}

When you no longer need the box in vagrant, you can also remove it with:

{% highlight bash %}
vagrant box remove ubuntu-14.10-amd64
{% endhighlight %}


And that's it!

You could now proceed on how to [bootstrap a GitHub Pages blog inside a Xubuntu desktop]({% post_url 2015-03-13-bootstrapping-your-github-pages-blog-with-vagrant %}).