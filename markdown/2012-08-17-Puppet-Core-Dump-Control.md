---
categories:
  - blog
tags:
  - Puppet
  - Linux
---


### If you have crashes you can enable core dumps via Puppet

```puppet
file { '/var/core':
    ensure => directory,
    mode   => '1777',
}
->
# %e = executable name
# %t = timestamp
# %p = pid
sysctl { 'kernel.core_pattern': value => '/var/core/core.%e.%t.%p' }
```
