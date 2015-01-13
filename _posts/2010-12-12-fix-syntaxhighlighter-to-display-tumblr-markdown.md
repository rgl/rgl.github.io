---
layout: post
title: Fix SyntaxHighlighter to display tumblr Markdown URLs
date: '2010-12-12T20:30:00+00:00'
tags:
- SyntaxHighlighter
- tumblr
- url
tumblr_url: http://blog.ruilopes.com/post/2189683544/fix-syntaxhighlighter-to-display-tumblr-markdown
---
I write these tumblr blog posts using the [Markdown](http://daringfireball.net/projects/markdown/syntax) syntax, which automatically detects and transforms URLs into proper HTML links. Though, things get messed up when I syntax highlight them with [SyntaxHighlighter](http://alexgorbatchev.com/SyntaxHighlighter/).

<!--MORE-->

I see something like (as displayed by the browser):

  <a href="http://example.com">http://example.com</a>

instead of the expected:

  http://example.com

So I dug into the code, and come up with this patch (apply into revision [b7578b438a69](http://bitbucket.org/alexg/syntaxhighlighter/src/b7578b438a69/scripts/shCore.js)):

{% highlight diff %}
--- a/scripts/shCore.js
+++ b/scripts/shCore.js
@@ -286,7 +286,6 @@
  highlight: function(globalParams, element)
  {
    var elements = this.findElements(globalParams, element),
-     propertyName = 'innerHTML', 
      highlighter = null,
      conf = sh.config
      ;
@@ -322,7 +321,7 @@
          continue;
      }
      
-     code = target[propertyName];
+     code = target.innerText || target.textContent;
      
      // remove CDATA from <SCRIPT/> tags if it's present
      if (conf.useScriptTags)
{% endhighlight %}

The text to highlight is now obtained from the [innerText](http://msdn.microsoft.com/en-us/library/ms533899) (works on IE / Chrome) or the [textContent](https://developer.mozilla.org/en/dom:element.textcontent) (works on Firefox / Chrome) property.

I'm left wondering why [innerHTML](https://developer.mozilla.org/en/dom:element.innerhtml) was used in the first place... anyway, it now works as I expected!

-- RGL
