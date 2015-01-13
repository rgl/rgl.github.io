---
layout: post
title: Taking web application screenshots with CasperJS
date: '2014-04-20T16:51:00+01:00'
tags: []
tumblr_url: http://blog.ruilopes.com/post/83310747361/taking-web-application-screenshots-with-casperjs
---
When you need to take screenshots of a web application, the normal route is to navigate to a page, fill in the forms with sample data, use the [Print screen](http://en.wikipedia.org/wiki/Print_screen) (or `Alt+Print screen`) key to take the screenshot, then crop and export it with a normal application like [GIMP](http://www.gimp.org/)... which is quite time consuming... and god forbid if you need to do it again, with a slightly different data or page design...

A better route would be to automate the whole process. Let me show you how to do it with [CasperJS](http://casperjs.org/)!

<!--MORE-->

Lets start!

**NB** if you need some help installing CasperJS, see the end of this article.

I'll be using my [home page](http://ruilopes.com) as an example.

Create a simple casper test script that captures the entire page inside the file `example.js`:

{% highlight js %}
// set the viewport size to include all our page content.
casper.options.viewportSize = {width: 700, height: 600};

casper.test.begin("test", function(test) {
  // step 1: open the page.
  casper.start("http://ruilopes.com", function() {
    // do an example test.
    test.assertTitle("rui lopes home");
  });

  // step 2: take some screenshots.
  casper.then(function() {
    // capture the entire page.
    casper.capture("page.png");

    // capture the nav element.
    casper.captureSelector("selector.png", "nav");
  });

  // actually run the steps we defined before.
  casper.run(function() {
    test.done();
  });
});
{% endhighlight %}

**NB** As you can see its quite self-explanatory; but you should really read [The Fine Manual](http://docs.casperjs.org/en/latest/modules/casper.html#capture).

Run casper:

    casperjs test example.js

Should output something like:

{% highlight sh %}
Test file: example.js
# test
PASS Page title is: "rui lopes home"
PASS 1 test executed in 0.087s, 1 passed, 0 failed, 0 dubious, 0 skipped.
{% endhighlight %}

And look at the generated screenshots.

### the entire page

![](https://bytebucket.org/rgl/casperjs-screenshooter/raw/7c27e3474fb264ca84daeb71e6c3794ac548892b/page.png)

### the nav element

![](https://bytebucket.org/rgl/casperjs-screenshooter/raw/7c27e3474fb264ca84daeb71e6c3794ac548892b/selector.png)


## Mouse Cursor

CasperJS uses [PhantomJS](http://phantomjs.org/) uses [QtWebKit](https://qt-project.org/wiki/QtWebKit) in headless mode. But, unfortunately, this combo does not seem to support the mouse cursor. So I had to roll my own solution by creating [casperjs-screenshooter](https://bitbucket.org/rgl/casperjs-screenshooter). It simulates the mouse cursor by adding an `img` element with id `screenshooterCursor` to the page DOM and the `hover` class into a element to simulate the hover effect.

Lets see how we can use it:

{% highlight sh %}
// step 3: take some screenshots with the mouse over a element.
screenshooter.thenMoveCursor("pointer", "a[href='http://blog.ruilopes.com/']", function() {
    // capture the area taken by the h1 and mouse cursor elements.
    screenshooter.capture("multiple-selector-with-mouse-cursor.png", "h1, #screenshooterCursor");
});
{% endhighlight %}

**NB** by default, you can use the following cursor names: `default`, `pointer`, `text`, `help` or `none`. You can add more yourself by using [cur2png or png2json](https://bitbucket.org/rgl/cur2png) (you can [download the binaries](https://bitbucket.org/rgl/cur2png/downloads) too).

**NB** the default cursors come from the excellent [Ubuntu Human theme](http://nordlicht.deviantart.com/art/Ubuntu-quot-Human-quot-Cursors-35930998).

**NB** with `screenshooter.capture` (instead of `casper.capture`) you can capture the area taken by several elements, each selected by a different selector separated by a comma.

And the resulting screenshot image:

![](https://bytebucket.org/rgl/casperjs-screenshooter/raw/7c27e3474fb264ca84daeb71e6c3794ac548892b/multiple-selector-with-mouse-cursor.png)

And thats it... see the [full source](https://bitbucket.org/rgl/casperjs-screenshooter/src/7c27e3474fb264ca84daeb71e6c3794ac548892b/example.js?at=default) and let me known what you think!

-- RGL

- - -

## Install on Ubuntu

**NB** I'm using Ubuntu 14.04; but it should be the same on other versions.

Run the following commands:

<pre>
sudo add-apt-repository ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install nodejs
sudo npm install -g casperjs
</pre>

## Install on Windows

On Windows (I'm using 8.1), we need to jump through some hoops... download the installer (e.g. [node-v0.10.26-x86.msi](http://nodejs.org/dist/v0.10.26/node-v0.10.26-x86.msi)) from:

    http://nodejs.org/download/

And install it (I've installed mine at `C:\Development\nodejs`).

Next, open a Command Prompt, and make sure you can run node. If you didn't let the installer modify your `PATH`, you need to add the directories manually with:

<pre>
set PATH=%PATH%;C:\Development\nodejs;%APPDATA%\npm
</pre>

**NB** `%APPDATA%` should expand to something like `C:\Users\rgl\AppData\Roaming`.

Check the installed node version:

    node --version

Should output something like:

    v0.10.26

Check the installed npm version:

    npm --version

Should output something like:

    1.4.3

Install CasperJS with:

    npm install -g casperjs

And check its version:

    casperjs --version

Should output something like:

<pre>
'python' is not recognized as an internal or external command,
operable program or batch file.
</pre>

Errr what? needs python? Oh well... as I found out its possible to run without it, lets add the needed directories into the PATH:

<pre>
set PATH=%APPDATA%\npm\node_modules\casperjs\bin;%APPDATA%\npm\node_modules\casperjs\node_modules\phantomjs\lib\phantom;%PATH%
</pre>

**NB** You need to add the `caspjerjs\bin` directories before the ones we've set before.

**NB** If this sounds too hackish, install [python](https://www.python.org/downloads/) and add it into your `PATH`.

And try again:

    casperjs --version

Should finally output something like:

    1.1.0-beta3
