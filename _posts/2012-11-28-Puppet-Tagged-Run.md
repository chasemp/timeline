


Updating only relevant Puppet configuration sections

As a puppet installation grows the list of used modules can get large. Especially, if you are pulling from puppetlabs. Testing in its final stages is usually done via puppet to ensure repeatability. The test runs get longer and longer.

### A full catalog run with no expected changes

> sudo /usr/bin/puppet agent --test --logdest syslog

```plaintext
Info: Retrieving plugin

Info: Caching catalog for 

Info: Applying configuration version '1371116293'

Finished catalog run in 16.35 seconds
```

If you need to rerun this every time you tweak a config file 16 seconds can be a long time.

If you are only updating a module called 'dhcp' you can do:

> sudo /usr/bin/puppet agent --test --logdest syslog --tags dhcp

```plaintext

Info: Retrieving plugin

Info: Caching catalog for 

Info: Applying configuration version '1371116293'

Finished catalog run in 8.46 seconds
```


This cut the time in half. Doing tagged runs still compiles the entire update. That is to say, Puppet still runs in the usual way figuring out dependencies and such, but when it comes to applicable changes it only looks for changes at the specified tagged resources.

If you put `–debug` into the update command you will see a lot of:

```plaintext
Debug: /Stage[main]/Mcollective::Client/Package[mcollective-client]: Not tagged with dhcp
```

This resource does not match the tag specified, and as such will not be updated.

Tags can be explicit or implicit. That is to say you can assign them and there are some that are assigned by design. All class/module names are also tags.


### This automatically creates a tag called `hiera`

```puppet
class hiera {

}
```

### Resource types are generally given a tag as well

To update file resources only

> sudo /usr/bin/puppet agent --test --logdest syslog --tags file

```plaintext
Info: Retrieving plugin

Info: Caching catalog for 

Info: Applying configuration version '1371116293'

Finished catalog run in 12.39 seconds
```
