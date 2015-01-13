function m(n, d) {
	var c = ":l@m";
	window.location.assign(c.charAt(3)+"a"+"i"+c.charAt(1)+"t"+"o"+c.charAt(0)+n+c.charAt(2)+d);
}

function script(url) {
	var s = document.createElement('script');
	s.async = true;
	s.src = url;
	document.documentElement.firstChild.appendChild(s);
}

(function() {
	var url = 'http://disqus.com/forums/blog-ruilopes/get_num_replies.js?';
	var links = document.getElementsByTagName('a');
	for (var i = 0; i < links.length; ++i) {
		if (links[i].href.indexOf('#disqus_thread') >= 0) {
			url += 'url' + i + '=' + encodeURIComponent(links[i].href) + '&';
		}
	}
	script(url);
})();

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-11886181-2']);
_gaq.push(['_trackPageview']);

script(('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js');
