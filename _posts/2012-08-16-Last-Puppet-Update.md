---
title: Bash to run for date of lastest Puppet update
categories:
  - blog
tags:
  - Puppet
  - Bash
---


### When was this host last updated via puppet?

```bash
#!/bin/bash
#prints time since last recorded puppet update
#you know...for debugging
last=`grep last_run /var/lib/puppet/state/last_run_summary.yaml | awk {'print $2'}`
now=`date +%s`
SECONDS=`expr $nowa - $last`
MIN=`expr $SECONDS / 60`
HOURS=`expr $MIN / 60`
DAYS=`expr $HOURS / 24`

echo "Since last puppet update"
echo 'seconds: '$SECONDS
echo 'minutes: '$MIN
if [ $HOURS -gt 0 ]; then
    echo 'hours: '$HOURS
fi

if [ $HOURS -gt 0 ]; then
    echo 'hours: '$HOURS
fi

if [ $DAYS -gt 0 ]; then
    echo 'days: '$DAYS
fi
```

```plaintext
Since last puppet update
seconds: 1345
minutes: 22
```

(Hours and days are only printed if present.)
