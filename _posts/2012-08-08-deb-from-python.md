---
title: "Debian Package from Python Project using stdeb"
categories:
  - blog
tags:
  - Python
  - Debian
---


One of the things I do often is download projects from github. Pypi (py-pee-eye) is nice and so is pip, but I like to have one reference for packages on a host. If at all possible I prefer to make binaries. It is nice for reporting, and because we run our own internal repostories it affords us certain advantages for reporting and dependency handling.

### Install a few packages

> aptitude install build-essential python-dev python-setuptools python-stdeb python-support

### Download a project: https://github.com/xb95/nagios-api.git

> git clone https://github.com/xb95/nagios-api.git
> cd nagios-api/

### Making a Deb

This where with traditional disutils you would do `python setup.py install`

But we can also do…

> sudo python setup.py --command-packages=stdeb.command bdist_deb

```plaintext
running bdist_deb
running sdist_dsc
working around Debian #548392, changing XS-Python-Version: to 'current'
CALLING dpkg-source -b nagios-api-1.2.1 nagios-api_1.2.1.orig.tar.gz (in dir deb_dist)
dpkg-source: info: using source format `1.0'
dpkg-deb: building package `python-nagios-api' in `../python-nagios-api_1.2.1-1_all.deb'.
dpkg-deb: warning: ignoring 1 warning about the control file(s)
dpkg-genchanges -b >../nagios-api_1.2.1-1_amd64.changes
dpkg-genchanges: binary-only upload - not including any source code
dpkg-source --after-build nagios-api-1.2.1
dpkg-buildpackage: binary only upload (no source included)
</code></pre>
That was all it took to create a fully installable binary package:

dpkg -i deb_dist/python-nagios-api_1.2.1-1_all.deb 

<pre><code>
Selecting previously deselected package python-nagios-api.
(Reading database ... 38260 files and directories currently installed.)
Unpacking python-nagios-api (from .../python-nagios-api_1.2.1-1_all.deb) ...
Setting up python-nagios-api (1.2.1-1) ...
Processing triggers for python-support ...
```

### Changing package particulars

`stdeb` allows you to specify many options you would normally need to provide in a debian control file. For example
in order to change the name of the package we end up with from 'python-nagios-api' to just nagios-api we can do
the the following.

> cd nagios-api/
> nano stdeb.cfg #should be in the same dir as setup.py

```
[DEFAULT]
Package: nagios-api```

Some repositories will have a problem with the lack of changelog file or other particulars. Almost always this can be overcome, but if necessary then you can use:

> python setup.py dh_make

### References

[bdist_deb command for distutils](https://lists.debian.org/debian-python/2004/10/msg00017.html)
[Nagios API](https://github.com/zorkian/nagios-api)
[stdeb config](https://pypi.org/project/stdeb/#stdeb-cfg-configuration-file)
