---
layout: post
title: Sane shell environment on Windows
date: '2010-12-08T14:44:00+00:00'
tags:
- shell
- console
- MinGW
- msys
tumblr_url: http://blog.ruilopes.com/post/2143557964/sane-shell-environment-on-windows
---
One thing I really hate on Windows is its horrible shell application window, fortunately there is [ConEmu](https://code.google.com/p/conemu-maximus5/) (and [Console](http://console.sourceforge.net/))! couple it with [MinGW](http://www.mingw.org/) and [Bash](http://www.gnu.org/software/bash/) and you'll have a saner command line environment. Here's how I do it.

<!--MORE-->

Using the [MinGW Installation Manager Setup Tool](http://sourceforge.net/projects/mingw/files/) (get the file named like mingw-get-setup.exe; its normally the first link on the page) install [MinGW](http://www.mingw.org/wiki/MinGW) and [MSYS](http://www.mingw.org/wiki/MSYS) into <code>C:\Dev\MinGW</code>.

You can install MinGW and MSYS by selecting the <code>mingw32-base</code> and <code>msys-base</code> packages, then select <code>Apply Changes</code> from the <code>Installation</code> menu.

**NB** you only really need to install the <code>mingw32-base</code> package if you need the gcc C/C++ compiler toolchain. And even then, you might be better served by [tdm-gcc](http://tdm-gcc.tdragon.net/), which has 64-bit compilers.

## ConEmu

ConEmu is what the default Windows Command Prompt window should have been. It has at least on feature that I really like, a resizable window!

Install it, then create a Task on the ConEmu settings:

 * Select ConEmu settings
 * Go to the `Startup`, `Tasks` node
 * Click the + button to add a new task
 * Call the task MSYS
 * Set Task parameters to:
   <pre>
   /icon "C:\Dev\MinGW\msys\1.0\msys.ico"
   </pre>
 * Add the command to start bash:
   <pre>
   C:\Dev\MinGW\msys\1.0\bin\bash -c "HOME=/c/Users/rgl exec /c/Dev/MinGW/msys/1.0/bin/bash"
   </pre>
   **NB** replace `/C/Users/rgl` with your actual home directory.

   **NB** I've set the HOME environment variable too. You might want to set it to $USERPROFILE instead.

   **NB** You should use a directory without spaces. You can create it as a _link_ with the command <code>cd /c/Users; junction rgl "Rui Lopes"</code> (you must install [junction](http://technet.microsoft.com/en-us/sysinternals/bb896768.aspx) first).

 * Goto to the Startup node on the ConEmu settings and select the MSYS has the specified named task, so ConEmu uses it by default.


## Console

Alternatively to ConEmu, you can use [Console](http://sourceforge.net/projects/console/). To do that, install it, then edit its settings to use same command to start bash as we did with ConEmu.

While you are at it, change the font to [Consolas](http://en.wikipedia.org/wiki/Consolas) 11pt too.


## Bash

Setup Bash by creating the [.bashrc](http://www.gnu.org/software/bash/manual/bash.html#Bash-Startup-Files) file (inside your `$HOME` directory) with the following contents:

{% highlight sh %}
# set the window title to our liking; this is run before the prompt is displayed (PS1).
# See http://tldp.org/HOWTO/Xterm-Title-4.html#ss4.3
PROMPT_COMMAND='echo -ne "\033]0;${PWD} - Bash\007"'

# start the shell at home
cd

export EDITOR=vim
export PAGER=less
export PS1='\u@\h \w \$ '
export TERM=cygwin

alias l='ls -lF --color'
alias ll='l -a'
alias h='history 25'
alias j='jobs -l'

# add our own paths before all others defined on the system.
PATH_ORIG=$PATH

export PATH=""
export PATH="$PATH:/c/Dev/MinGW/bin"
export PATH="$PATH:/c/Dev/MinGW/msys/1.0/bin"
# feel free to add more of these PATH modifications here

# finally add the original PATH contents after our own.
export PATH="$PATH:$PATH_ORIG"
{% endhighlight %}

Tidy vim settings by creating the [.vimrc](http://vimdoc.sourceforge.net/htmldoc/starting.html#vimrc) file with the following contents:

{% highlight vim %}
syntax on
set background=dark
set esckeys
set ruler
set laststatus=2
set nobackup

" Usefull setting for working with Ruby files.
autocmd FileType ruby set tabstop=2 shiftwidth=2 smarttab expandtab softtabstop=2 autoindent
autocmd FileType ruby set smartindent cinwords=if,elsif,else,for,while,try,rescue,ensure,def,class,module

" Usefull setting for working with Python files.
autocmd FileType python set tabstop=4 shiftwidth=4 smarttab expandtab softtabstop=4 autoindent
" Automatically indent a line that starts with the following words (after we press ENTER).
autocmd FileType python set smartindent cinwords=if,elif,else,for,while,try,except,finally,def,class
{% endhighlight %}

To easily search the command history using your keyboard cursor keys, create the [.inputrc](http://tiswww.case.edu/php/chet/readline/rluserman.html#SEC9) file (inside your home directory) with the following contents:

{% highlight js %}
"\e[A": history-search-backward
"\e[B": history-search-forward
{% endhighlight %}

Finally, launch ConEmu and install some useful packages:

<pre>
mingw-get install msys-vim
mingw-get install msys-unzip
mingw-get install msys-wget
</pre>

You can also get a list of available package with:

<pre>
mingw-get list | grep Package:
</pre>

You can later upgrade all the installed packages:

<pre>
mingw-get update
mingw-get upgrade
</pre>

Thats it, enjoy!

-- RGL
