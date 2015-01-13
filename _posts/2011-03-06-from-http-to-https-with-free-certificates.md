---
layout: post
title: from http to https with free certificates
date: '2011-03-06T14:51:00+00:00'
tags:
- https
- tls
- ssl
- nginx
- openssl
tumblr_url: http://blog.ruilopes.com/post/3678866680/from-http-to-https-with-free-certificates
---
Recently I've noticed that [StartCom](http://www.startcom.org/) gives away free certificates through theirs [StartSSL](http://www.startssl.com/) site. In this post I will explain how I managed to configure [nginx](http://nginx.org/en/) to host two of my domains, on the same IP address, using [HTTPS](http://en.wikipedia.org/wiki/HTTP_Secure).

<!--MORE-->

# TL;DR summary

This is the recipe to create an RSA keypair, a Certificate Signing Request (CSR), install and configure nginx.

Create the RSA keypair:

<pre>
cd /etc/ssl/private
openssl req -newkey rsa:2048 -nodes -keyout ruilopes.com.key -out ruilopes.com.csr && chmod 400 ruilopes.com.key
</pre>

Set Common Name (eg, YOUR name) field to: ruilopes.com

Paste the contents of the `ruilopes.com.csr` file into the StartCom form, let'm generate the certificate, copy it into the `ruilopes.com.crt` file.

Append the StartCom intermediate CA certificate to our own:

<pre>
curl -O https://www.startssl.com/certs/sub.class1.server.ca.pem
cat sub.class1.server.ca.pem >> ruilopes.com.crt
</pre>

Install and configure nginx:

<pre>
add-apt-repository ppa:nginx/stable
apt-get update
apt-get install nginx-full

mkdir /var/www/ruilopes.com
</pre>


    cat<<"EOF">/var/www/ruilopes.com/index.html
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Hello World</title>
    </head>
    <body>
      <h1>Hello World!</h1>
    </body>
    </html>
    EOF


    cat<<"EOF">/etc/nginx/sites-available/ruilopes.com.conf
    server {
      server_name ruilopes.com www.ruilopes.com;

      listen 80 default;
      listen 443 default ssl;

      ssl_certificate      /etc/ssl/private/ruilopes.com.crt;
      ssl_certificate_key  /etc/ssl/private/ruilopes.com.key;

      root /var/www/ruilopes.com;
      access_log /var/log/nginx/ruilopes.com.access.log;

      index index.html;
    }
    EOF

<pre>
ln -s /etc/nginx/sites-available/ruilopes.com.conf /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

service nginx restart
</pre>

Test with openssl:

<pre>
openssl s_client -connect ruilopes.com:443 -servername ruilopes.com
</pre>
  
Test by opening the following address:

    https://ruilopes.com/

That's it!

But really, keep reading! I'll explain how this works and also add a second domain to the same IP address... this is a somewhat lengthy post... so bear with me! In the end, I hope you'll understand what is going on.

# From http to HTTPS

Roughly, we'll follow this plan:

 1. create a [RSA](http://en.wikipedia.org/wiki/RSA) keypair (two keys: a private and a public key).
 1. create a [Certificate Signing Request](http://en.wikipedia.org/wiki/Certificate_signing_request) (CSR).
 1. submit the CSR to StartCom; they will create and sign a certificate that binds our public key and domain name to their Certification Authority (CA).
 1. configure nginx to use our private key and the certificate signed by StartCom.

I'll use Ubuntu 10.04, so the nginx install and file-system paths are tied to this particular Linux flavor.

All the commands displayed here should be run inside a shell with root privileges.

Lets start by installing nginx:

<pre>
apt-get install nginx
</pre>

And a plain nginx configuration (no certificates involved) for my primary domain `ruilopes.com`:

    cat<<"EOF">/etc/nginx/sites-available/ruilopes.com.conf
    server {
      server_name ruilopes.com www.ruilopes.com;

      listen 80;

      root /var/www/ruilopes.com;
      access_log /var/log/nginx/ruilopes.com.access.log;

      index index.html;
    }
    EOF

Create a simple index page:

<pre>
mkdir /var/www/ruilopes.com
</pre>

    cat<<"EOF">/var/www/ruilopes.com/index.html
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Hello World</title>
    </head>
    <body>
      <h1>Hello World!</h1>
    </body>
    </html>
    EOF


Enable the new site, remove the default site (which ships by default with Ubuntu), and notify nginx to reload its configuration:

<pre>
ln -s /etc/nginx/sites-available/ruilopes.com.conf /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
service nginx reload
</pre>

Try to access the site, to see if its working:

<pre>
curl --silent --dump - http://ruilopes.com/
</pre>

You should see something like:

    HTTP/1.1 200 OK
    Server: nginx/0.7.65
    Date: Mon, 31 Jan 2011 21:54:22 GMT
    Content-Type: text/html
    Content-Length: 141
    Last-Modified: Sun, 30 Jan 2011 20:26:43 GMT
    Connection: keep-alive
    Vary: Accept-Encoding
    Accept-Ranges: bytes

    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Hello World</title>
    </head>
    <body>
      <h1>Hello World!</h1>
    </body>
    </html>

Now that we have the baseline working, lets add some crypto to the mix.

Using [openssl(1)](http://www.openssl.org/docs/apps/openssl.html) [genrsa(1)](http://www.openssl.org/docs/apps/genrsa.html) create an 2048-bit RSA keypair (without password protection; use `-des3` for password protection):

<pre>
cd /etc/ssl/private
openssl genrsa -out ruilopes.com.key 2048
chmod 400 ruilopes.com.key
</pre>

NB You can later password protect a key with:

<pre>
openssl rsa -des3 -in ruilopes.com.key -out ruilopes.com.key.new && mv ruilopes.com.key.new ruilopes.com.key
</pre>

You can inspect the private and public key components with:

<pre>
openssl rsa -noout -text -in ruilopes.com.key
</pre>

It looks something like:

<pre>
Private-Key: (2048 bit)
modulus:
    00:11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:
    ...
publicExponent: 65537 (0x10001)
privateExponent:
    ...
prime1:
    ...
prime2:
    ...
exponent1:
    ...
exponent2:
    ...
coefficient:
    ...
</pre>
  
Or just inspect the public content:

<pre>
openssl rsa -pubout -in ruilopes.com.key 2>/dev/null | openssl rsa -noout -text -pubin
</pre>

Which should look something like:

<pre>
Modulus (2048 bit):
    00:11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:
    ...
Exponent: 65537 (0x10001)
</pre>

Using [openssl req(1)](http://www.openssl.org/docs/apps/req.html) create the Certificate Signing Request (CSR):

<pre>
openssl req -new -key ruilopes.com.key -out ruilopes.com.csr
</pre>

NB You can also generate the keypair and CSR with a single command:

<pre>
openssl req -newkey rsa:2048 -nodes -keyout ruilopes.com.key -out ruilopes.com.csr
</pre>

This step will ask you for information to include in the CSR, in our case, StartCom level 1 certificates only need the domain name (aka [X.509](http://en.wikipedia.org/wiki/X.509) Common Name or CN; NB all the other information is ignored by StartCom), here's how openssl req asks for this information:

<pre>
Country Name (2 letter code) [AU]:.
State or Province Name (full name) [Some-State]:.
Locality Name (eg, city) []:.
Organization Name (eg, company) [Internet Widgits Pty Ltd]:.
Organizational Unit Name (eg, section) []:.
Common Name (eg, YOUR name) []:ruilopes.com
Email Address []:.

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:
</pre>

NB "." is an openssl convention that means the field should be empty/omitted.


You can inspect the certificate signing request using:

<pre>
openssl req -noout -text -in ruilopes.com.csr
</pre>

It looks something like:

<pre>
Certificate Request:
    Data:
        Version: 0 (0x0)
        Subject: CN=ruilopes.com
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
            RSA Public Key: (2048 bit)
                Modulus (2048 bit):
                    00:11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:
                    ...
                Exponent: 65537 (0x10001)
        Attributes:
            a0:00
    Signature Algorithm: sha1WithRSAEncryption
        47:98:bd:ee:41:cb:29:de:29:54:f9:0d:d7:ff:6d:00:55:ec:
        ...
</pre>

You are now ready to send the CSR to StartCom... just copy&paste its contents to the StartCom control panel and let them generate our certificate.

NB: They also let you add one sub-domain, I've choosen "www" (for `www.ruilopes.com`).

After the certificate is generated, copy&paste it into the `ruilopes.com.crt` file, and inspect the certificate with:

<pre>
openssl x509 -noout -text -in ruilopes.com.crt
</pre>

It will look something like:

<pre>
Certificate:
...
        Issuer: C=IL, O=StartCom Ltd., OU=Secure Digital Certificate Signing, CN=StartCom Class 1 Primary Intermediate Server CA
        Validity
            Not Before: Jan 29 17:45:36 2011 GMT
            Not After : Jan 30 19:25:11 2012 GMT
        Subject: description=345115-eJ9Q0A1Uk83j6dMv, C=PT, O=Persona Not Validated, OU=StartCom Free Certificate Member, CN=www.ruilopes.com/emailAddress=me@example.com
...
            X509v3 Subject Alternative Name:
                DNS:www.ruilopes.com, DNS:ruilopes.com
</pre>


You are now ready to configure nginx with the private keypair (inside `ruilopes.com.key` file) and the certificate (inside `ruilopes.com.crt` file). So lets do that:

    cat<<"EOF">/etc/nginx/sites-available/ruilopes.com.conf
    server {
      server_name ruilopes.com www.ruilopes.com;

      listen 80 default;
      listen 443 default ssl;

      ssl_certificate      /etc/ssl/private/ruilopes.com.crt;
      ssl_certificate_key  /etc/ssl/private/ruilopes.com.key;

      root /var/www/ruilopes.com;
      access_log /var/log/nginx/ruilopes.com.access.log;

      index index.html;
    }
    EOF

NB We've just added the `listen 443`, `ssl_certificate` and `ssl_certificate_key` lines.

Notify nginx to reload the configuration:

<pre>
service nginx reload
</pre>


And try to access our shinny HTTPS server! This time using [openssl s_client(1)](http://www.openssl.org/docs/apps/s_client.html):

<pre>
openssl s_client -connect ruilopes.com:443 -servername ruilopes.com
</pre>

The output should look something like:

<pre>
CONNECTED(00000003)
depth=0 /description=345115-eJ9Q0A1Uk83j6dMv/C=PT/O=Persona Not Validated/OU=StartCom Free Certificate Member/CN=www.ruilopes.com/emailAddress=me@example.com
verify error:num=20:unable to get local issuer certificate
verify return:1
depth=0 /description=345115-eJ9Q0A1Uk83j6dMv/C=PT/O=Persona Not Validated/OU=StartCom Free Certificate Member/CN=www.ruilopes.com/emailAddress=me@example.com
verify error:num=27:certificate not trusted
verify return:1
depth=0 /description=345115-eJ9Q0A1Uk83j6dMv/C=PT/O=Persona Not Validated/OU=StartCom Free Certificate Member/CN=www.ruilopes.com/emailAddress=me@example.com
verify error:num=21:unable to verify the first certificate
verify return:1
---
Certificate chain
 0 s:/description=345115-eJ9Q0A1Uk83j6dMv/C=PT/O=Persona Not Validated/OU=StartCom Free Certificate Member/CN=www.ruilopes.com/emailAddress=me@example.com
   i:/C=IL/O=StartCom Ltd./OU=Secure Digital Certificate Signing/CN=StartCom Class 1 Primary Intermediate Server CA
---
Server certificate
-----BEGIN CERTIFICATE-----
... omitted ...
-----END CERTIFICATE-----
subject=/description=345115-eJ9Q0A1Uk83j6dMv/C=PT/O=Persona Not Validated/OU=StartCom Free Certificate Member/CN=www.ruilopes.com/emailAddress=me@example.com
issuer=/C=IL/O=StartCom Ltd./OU=Secure Digital Certificate Signing/CN=StartCom Class 1 Primary Intermediate Server CA
---
</pre>

**NB** for now, ignore the errors that are displayed in this output.


Lets try with curl:

<pre>
curl --silent --dump - https://ruilopes.com/
</pre>

And you'll notice that something is not right, as no text output is displayed... lets see whats is going on by removing the `--silent` switch, and try again. This time the output should be something like:

<pre>
curl: (60) SSL certificate problem, verify that the CA cert is OK. Details:
error:14090086:SSL routines:SSL3_GET_SERVER_CERTIFICATE:certificate verify failed
More details here: http://curl.haxx.se/docs/sslcerts.html

curl performs SSL certificate verification by default, using a "bundle"
 of Certificate Authority (CA) public keys (CA certs). If the default
 bundle file isn't adequate, you can specify an alternate file
 using the --cacert option.
If this HTTPS server uses a certificate signed by a CA represented in
 the bundle, the certificate verification probably failed due to a
 problem with the certificate (it might be expired, or the name might
 not match the domain name in the URL).
If you'd like to turn off curl's verification of the certificate, use
 the -k (or --insecure) option.
</pre>

This happens because curl, by default, does not even try to validate intermediate CA certificates. Recall this piece of information from openssl s_client output:

<pre>
---
Certificate chain
 0 s:/description=345115-eJ9Q0A1Uk83j6dMv/C=PT/O=Persona Not Validated/OU=StartCom Free Certificate Member/CN=www.ruilopes.com/emailAddress=me@example.com
   i:/C=IL/O=StartCom Ltd./OU=Secure Digital Certificate Signing/CN=StartCom Class 1 Primary Intermediate Server CA
---
</pre>

This means that our HTTPS server is returning a single certificate, issued by the Certification Authority (CA) that has the Common Name (CN) `StartCom Class 1 Primary Intermediate Server CA`. Lets see if Ubuntu ships with a certificate that has that CN:

<pre>
ls -F /etc/ssl/certs | grep -i startcom
</pre>

It outputs something like:

<pre>
StartCom_Certification_Authority.pem
StartCom_Ltd..pem
</pre>

Lets see the CN:

<pre>
openssl x509 -noout -text -in /etc/ssl/certs/StartCom_Certification_Authority.pem
</pre>

It should look something like (we are only interested in the Issuer and Subject fields):

<pre>
Issuer:  C=IL, O=StartCom Ltd., OU=Secure Digital Certificate Signing, CN=StartCom Certification Authority
Subject: C=IL, O=StartCom Ltd., OU=Secure Digital Certificate Signing, CN=StartCom Certification Authority
</pre>

As you can see, the Subject CN is not the CN we are looking for... lets try the other certificate:

<pre>
openssl x509 -noout -text -in /etc/ssl/certs/StartCom_Ltd..pem
</pre>

It should look something like:

<pre>
Issuer:  C=IL, ST=Israel, L=Eilat, O=StartCom Ltd., OU=CA Authority Dep., CN=Free SSL Certification Authority/emailAddress=admin@startcom.org
Subject: C=IL, ST=Israel, L=Eilat, O=StartCom Ltd., OU=CA Authority Dep., CN=Free SSL Certification Authority/emailAddress=admin@startcom.org
</pre>

So neither certificate Subject has the CN we are looking for... so Ubuntu does not ship with the `StartCom Class 1 Primary Intermediate Server CA` certificate.

NB This is a simplification of the certificate resolution algorithm; eg. they are not matched just by their CN, but by their Distinguished Name (DN) and public key value/fingerprint (and other details I'm omitting here).

Lets download it from StartCom site, and see its contents:

<pre>
curl -O https://www.startssl.com/certs/sub.class1.server.ca.pem
openssl x509 -noout -text -in sub.class1.server.ca.pem
</pre>

It should look something like:

<pre>
Issuer:  C=IL, O=StartCom Ltd., OU=Secure Digital Certificate Signing, CN=StartCom Certification Authority
Subject: C=IL, O=StartCom Ltd., OU=Secure Digital Certificate Signing, CN=StartCom Class 1 Primary Intermediate Server CA
</pre>

So, the Subject we were looking for is here! Also notice that the Subject is different than the Issuer... this means this is an intermediate certificate; the ones that have the Issuer equal to Subject are called root certificates (aka self-signed certificates).

Also notice that the Issuer CN is the same has the one inside the `/etc/ssl/certs/StartCom_Certification_Authority.pem` file! So, Ubuntu ships with that root certificate. So, we are missing a link in the certificate chain we return in our HTTPS server... lets fix that by appending it there:

<pre>
cat sub.class1.server.ca.pem >> ruilopes.com.crt
</pre>

Notify nginx to reload the configuration:

<pre>
service nginx reload
</pre>

See how the certificate chain is now returned:

<pre>
openssl s_client -connect ruilopes.com:443 -servername ruilopes.com
</pre>

The output should look something like:

<pre>
---
Certificate chain
 0 s:/description=345115-eJ9Q0A1Uk83j6dMv/C=PT/O=Persona Not Validated/OU=StartCom Free Certificate Member/CN=www.ruilopes.com/emailAddress=me@example.com
   i:/C=IL/O=StartCom Ltd./OU=Secure Digital Certificate Signing/CN=StartCom Class 1 Primary Intermediate Server CA
 1 s:/C=IL/O=StartCom Ltd./OU=Secure Digital Certificate Signing/CN=StartCom Class 1 Primary Intermediate Server CA
   i:/C=IL/O=StartCom Ltd./OU=Secure Digital Certificate Signing/CN=StartCom Certification Authority
---
</pre>

So, now the chain is composed by two links:

  1. Subject with CN=www.ruilopes.com; issued by Issuer with CN=StartCom Class 1 Primary Intermediate Server CA
  1. Subject with CN=StartCom Class 1 Primary Intermediate Server CA; issued by Issuer with CN=StartCom Certification Authority

See how the first certificate Issuer is the same has the second certificate Subject? That's how the first certificate is validated by the second, which in turn is validated by the root certificate installed on our local Ubuntu. You see, a chain is formed, starting on our certificate till the root certificate installed on our machine.

OK, looks good... lets see if it actually works by trying again with curl:

<pre>
curl --silent --dump - https://ruilopes.com/
</pre>

You should see something like:

    HTTP/1.1 200 OK
    Server: nginx/0.7.65
    Date: Mon, 31 Jan 2011 21:54:22 GMT
    Content-Type: text/html
    Content-Length: 141
    Last-Modified: Sun, 30 Jan 2011 20:26:43 GMT
    Connection: keep-alive
    Vary: Accept-Encoding
    Accept-Ranges: bytes

    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Hello World</title>
    </head>
    <body>
      <h1>Hello World!</h1>
    </body>
    </html>

So it worked!

Finally... lets try with a browser! Using Google Chrome you should see something like:

<img src="/images/from-http-to-https-with-free-certificates-ruilopes.com-https-crt.jpeg"/>

NB the window with the certificate information appears after you click the green padlock on the address bar.

So, that's it! Our first domain is ready to use!

Now on to the other domain... well, now it much easier, just repeat everything, but with a different domain name and configuration file!

Create the configuration file:

    cat<<"EOF">/etc/nginx/sites-available/statica.info.conf
    server {
      server_name statica.info;

      listen 80 default;
      listen 443 default ssl;

      ssl_certificate      /etc/ssl/private/statica.info.crt;
      ssl_certificate_key  /etc/ssl/private/statica.info.key;

      root /var/www/statica.info;
      access_log /var/log/nginx/statica.info.access.log;

      index index.html;
    }
    EOF

<pre>
ln -s /etc/nginx/sites-available/statica.info.conf /etc/nginx/sites-enabled/
</pre>

Notify nginx to reload the configuration:

<pre>
service nginx reload
</pre>

And... it fails with:

<pre>
Restarting nginx: [emerg]: a duplicate default server for 0.0.0.0:80 in /etc/nginx/sites-enabled/ruilopes.com.conf:4
configuration file /etc/nginx/nginx.conf test failed
</pre>

This happens because we already had a default domain (`ruilopes.com`); so, remove the "`default`" word from the "`listen`" configuration lines:

    cat<<"EOF">/etc/nginx/sites-available/statica.info.conf
    server {
      server_name statica.info;

      listen 80;
      listen 443 ssl;

      ssl_certificate      /etc/ssl/private/statica.info.crt;
      ssl_certificate_key  /etc/ssl/private/statica.info.key;

      root /var/www/statica.info;
      access_log /var/log/nginx/statica.info.access.log;

      index index.html;
    }
    EOF

And try again:

<pre>
service nginx reload
</pre>

Now it fails with a different error:

<pre>
Restarting nginx: [emerg]: "ssl" parameter can be specified for the default "listen" directive only in /etc/nginx/sites-enabled/statica.info.conf:5
configuration file /etc/nginx/nginx.conf test failed
</pre>

It turns out we need a newer version of nginx... fortunately, there is a PPA at https://launchpad.net/nginx Lets, remove the old nginx, and add the new version to our system:

<pre>
service nginx stop
add-apt-repository ppa:nginx/stable
apt-get update
apt-get remove nginx        # remove 0.7.65
apt-get install nginx-full  # add 0.8.54
</pre>

And start it:

<pre>
service nginx start
</pre>

It should now work fine!

If you are still with me, you might be wondering how it possible to have two (or more) certificates on the same IP address? This is possible because nginx has support for [Server Name Indication](http://en.wikipedia.org/wiki/Server_Name_Indication) (SNI), which you can see with:

<pre>
nginx -V
</pre>

Which will output something like:

<pre>
nginx version: nginx/0.8.54
TLS SNI support enabled
</pre>

For this to work, the browser also has to support SNI. When it does, the browser will send the domain name (aka server name) that its trying to access in the initial TLS handshake.

This also means that older browsers (without SNI) will not be able to access our site...

And that's it! I hope you now understand a bit more how certificates work!

-- RGL
