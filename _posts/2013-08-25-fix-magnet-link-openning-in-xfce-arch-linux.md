---
layout: post
title: Fix magnet link openning in Xfce / Arch Linux
date: '2013-08-25T19:18:00+01:00'
tags: []
tumblr_url: http://blog.ruilopes.com/post/59317477948/fix-magnet-link-openning-in-xfce-arch-linux
---
The current Xfce (4.10) that ships with Arch Linux has an annoying bug of not correctly opening [Magnet](http://en.wikipedia.org/wiki/Magnet_URI_scheme) URIs (e.g. when you click a magnet link from within Chromium). So I had to have that fixed, but doing it took longer that I expected... so I'm creating this recipe for helping you solving the problem more easily.

<!--MORE-->

Chromium handles unknown [URI schemes](http://en.wikipedia.org/wiki/URI_scheme) by delegating them to the [xdg-open command](https://wiki.archlinux.org/index.php/Xdg-open). Which in turn, detects it's running under the Xfce desktop and delegates the control the [exo-open command](https://wiki.archlinux.org/index.php/Xdg-open). Which fails to open the magnet URIs.

In these instructions you'll patch the [exo package](https://www.archlinux.org/packages/?name=exo) and re-install it with a little [patch](http://git.xfce.org/xfce/exo/commit/?id=05848bb) that fixes that annoying problem.

So let's get to it! Open a terminal and issue the following commands.

Configure `xdg-open` to open magnet URIs with the [Transmission application](http://www.transmissionbt.com/):

<pre>
xdg-mime default transmission-gtk.desktop x-scheme-handler/magnet
</pre>

NB: this modifies the `~/.local/share/applications/mimeapps.list` file.

Get the `exo` package (contains the `exo-open` command):

<pre>
sudo pacman -S abs
sudo abs extra/exo
cd /tmp
cp -R /var/abs/extra/exo .
cd exo
</pre>

Add the [patch](http://git.xfce.org/xfce/exo/commit/?id=05848bb) into a file:

{% highlight diff %}
cat<<"EOF">fix-exo_str_looks_like_an_uri-bug-10098.patch
diff --git a/exo/exo-string.c b/exo/exo-string.c
index 33f86f9..056b36a 100644
--- a/exo/exo-string.c
+++ b/exo/exo-string.c
@@ -429,7 +429,7 @@ exo_str_looks_like_an_uri (const gchar *str)
       for (++s; g_ascii_isalnum (*s) || *s == '+' || *s == '-' || *s == '.'; ++s);

       /* <scheme> must be followed by ":" */
-      return (*s == ':' && *(s+1) == '/');
+      return (*s == ':' && *(s+1) != '\0');
     }

   return FALSE;
EOF
{% endhighlight %}

Modify the [PKGBUILD](https://wiki.archlinux.org/index.php/PKGBUILD) file to patch the source by adding the `prepare` function above the existing `build` function:

{% highlight sh %}
prepare() {
  cd "$srcdir/$pkgname-$pkgver"
  patch -p1 &lt; "$startdir/fix-exo_str_looks_like_an_uri-bug-10098.patch"
}
{% endhighlight %}

NB to properly finish the package you should also add the patch file name into the `source` array and its sha256 checksum into the `sha256sums` array... but I'll not bother.

And finally build and install the package:

<pre>
makepkg -s
sudo pacman -U *.pkg*
</pre>

And that should be it! Try to click on a magnet file link now!

-- RGL
