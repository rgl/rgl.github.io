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

# install gitg. a gnome gui for git.
#apt-add-repository -y ppa:thomir/gitg
#apt-get update
#apt-get -y install gitg

# install ungit. a web-based gui for git.
npm install -g ungit

# install retext. a Markdown editor.
apt-get -y install retext

# install ruby. Jekyll is a ruby application.
apt-get -y install ruby-dev ruby

# install dependencies needed for the gems.
apt-get -y install zlib1g-dev

# install Jekyll -- the version that is currently hosted by GitHub.
gem install --verbose github-pages

# install vim because I like it.
apt-get -y install vim

# enable automatic login.
mkdir -p /etc/lightdm/lightdm.conf.d
bash -c 'printf "[SeatDefaults]\nautologin-user=vagrant\n" > /etc/lightdm/lightdm.conf.d/50-autologin.conf'
service lightdm restart
ROOT_PROVISION_SCRIPT

$vagrant_provision_script = <<'VAGRANT_PROVISION_SCRIPT'
#!/bin/bash
# abort this script on errors.
set -eux

# setup the Desktop.
# wait for the xfsettingsd daemon to create the database.
while [ ! -s ~/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml ]; do sleep 2; done

# set the window manager theme.
# NB this is equivalent of doing: xfconf-query -c xfwm4 -p /general/theme -s Moheli
#    BUT I didn't figure out how to make it run inside this provision script...
sed -i -E 's,("theme" )(.+),\1type="string" value="Moheli"/>,g' ~/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml

sudo service lightdm restart

# setup the shell.
cat<<"EOF" > ~/.bashrc
if [[ $- != *i* ]] ; then
  # bail if the shell is non-interactive.
  return
fi

export EDITOR=vim
export PAGER=less

alias l='ls -lF --color'
alias ll='l -a'
alias h='history 25'
alias j='jobs -l'
EOF

cat<<"EOF" > ~/.inputrc
"\e[A": history-search-backward
"\e[B": history-search-forward
"\eOD": backward-word
"\eOC": forward-word
set show-all-if-ambiguous on
set completion-ignore-case on
EOF

# setup vim.
cat<<"EOF" > ~/.vimrc
syntax on
set background=dark
set esckeys
set ruler
set laststatus=2
set nobackup

autocmd BufNewFile,BufRead Vagrantfile set ft=ruby
autocmd BufNewFile,BufRead *.config set ft=xml

" Usefull setting for working with Ruby files.
autocmd FileType ruby set tabstop=2 shiftwidth=2 smarttab expandtab softtabstop=2 autoindent
autocmd FileType ruby set smartindent cinwords=if,elsif,else,for,while,try,rescue,ensure,def,class,module

" Usefull setting for working with Python files.
autocmd FileType python set tabstop=4 shiftwidth=4 smarttab expandtab softtabstop=4 autoindent
" Automatically indent a line that starts with the following words (after we press ENTER).
autocmd FileType python set smartindent cinwords=if,elif,else,for,while,try,except,finally,def,class

" Usefull setting for working with Go files.
autocmd FileType go set tabstop=4 shiftwidth=4 smarttab expandtab softtabstop=4 autoindent
" Automatically indent a line that starts with the following words (after we press ENTER).
autocmd FileType go set smartindent cinwords=if,else,switch,for,func
EOF

# setup git.
git config --global user.name 'Rui Lopes'
git config --global user.email rgl@ruilopes.com
git config --global push.default simple

# create SSH keypair and dump the public key.
ssh-keygen -f ~/.ssh/id_rsa -t rsa -N ""
echo 'Add the following SSH public key to the github page'
echo '################'
cat ~/.ssh/id_rsa.pub
echo '################'
echo 'Then, inside the VM, clone the repo as:'
echo 'git clone git@github.com:rgl/rgl.github.io.git'
VAGRANT_PROVISION_SCRIPT

Vagrant.configure(2) do |config|
  config.vm.box = "xubuntu-14.10-amd64"

  config.vm.hostname = "pages"

  config.vm.provider "virtualbox" do |vb|
    vb.gui = true
  end

  config.vm.provision "shell", inline: $root_provision_script
  config.vm.provision "shell", inline: $vagrant_provision_script, privileged: false
end
