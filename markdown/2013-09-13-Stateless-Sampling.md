
In the devops world there are a lot of reasons to want good stats, but sometimes the load for collecting those stats on every execution of a script or web page is too invasive. A/B testing is another place where we want to select a certain portion of served pages and take appropriate action. The straight forward way to select a subset is a state based system. For every page that executes you can add an id to a set in redis. If you are looking for 5% of pages then look to see if the item count is 20. If you are number 20 you can flush the list and the count starts over. This is not meant for real world usage but that is the basic idea behind selecting a portion of pages by keeping state between all executions.

If the state based system is too slow, clunky, unreliable or inelegant there has to be an alternative.

### Modulo Operation

The [modulo operation](https://en.wikipedia.org/wiki/Modulo) finds the remainder of one number divided by another.

```
>>> 1 % 1
0
>>> 2 % 1
0
>>> 5 % 2
1
>>> 9 / 4
2
```

So you take all the numbers 1 - 100 the percentage of modulus operations with a remainder of 0 for the number 10 is 10%.

### Combining stateful tracking of executions and modulus

If you want to you can combine these two ideas. In order to sample 5% of executions you could track the execution order of your scripts in redis (or somwhere) looking for a modulus operation remainder of 0 each time to identify an appropriate sample page. Exectuions 1 - 19 will not be sampled, but 20 will. So will 40, 60, 80, and 100. When script 101 queries to see where in the order it is it will be told it is 1 and the cycle starts over. This way each job would have a 5% chance of being selected as a sample.

This is not any more advantages than the simply having every page know when it's number 20.

### Using the law of averages to provide a quick sample determination

Let's say we have a simple query and we want 10% to send a stat to statsd. The pseudo code might look like

```python
import random
sample_interval = 20
start_time = time.time()
user_id = execute_mysql_query('select %s from users' % username)
total_time = time.time() - start_time
print user_id
if random.randint(0, 100) % sample_interal == 0:
    submit_to_statsd('time.to.query.userid', total_time)
```

Over time this should submit a sample of 5% of all user_id queries to statsd. The first 100 you may get 0, 5, or 8 but with a larger sample you get around 5% and it is much cheaper than trying to have each execution determine where it is in the pecking order for stats submission.

### Just how accurate is the law of averages here?

Here is a snippet to figure out the percentage of matches in a spread for a particular modulus integer. Ideally using the operation 'int % 10 == 0' will have a sample rate of 10 percent. The user passes in the top end of the range, we cycle through 10 times. The number of matches in each pass is summed and then used to calculate in the average match percentage across all tries.

```python
import sys
import random
try_match = []
tries = 10
#make 10 passes of user defined range
while tries > 0:
    match = []
    #how many times should I try to match my modulus op
    for i in range(0, int(sys.argv[1])):
        if random.randint(0, 100) % 10 == 0:
            match.append(i)

    #append the number of matches
    try_match.append(len(match))
    tries -= 1

average_sampled = sum(try_match) / 10
print average_sampled * 100 / int(sys.argv[1]) 
```

```plaintext
me@vm:~/php# python modulo.py 10
10
me@vm:~/php# python modulo.py 100
11
me@vm:~/php# python modulo.py 1000
10
me@vm:~/php# python modulo.py 10000
10
me@vm:~/php# python modulo.py 100000
10
me@vm:~/php# python modulo.py 1000000
10
me@vm:~/php# python modulo.py 10000000
10
me@vm:~/php# python modulo.py 100000000
10
```


This is almost too perfect but the idea is this the accuracy of percentage sampled gets better over the long run. In reality if you run this 10 times it won't be 10% all of the time, but if you run it against 1000 it will be most of the time.

Testing against a small range is wildly variable.

```plaintext
me@vm:~/php# python modulo.py 10
10
me@vm:~/php# python modulo.py 10
10
me@vm:~/php# python modulo.py 10
10
me@vm:~/php# python modulo.py 10
10
me@vm:~/php# python modulo.py 10
0
me@vm:~/php# python modulo.py 10
0
me@vm:~/php# python modulo.py 10
10
```

Testing against a large range is nicely consistent

```plaintext

me@vm:~/php# python modulo.py 1000
10
me@vm:~/php# python modulo.py 1000
11
me@vm:~/php# python modulo.py 1000
10
me@vm:~/php# python modulo.py 1000
11
me@vm:~/php# python modulo.py 1000
10
me@vm:~/php# python modulo.py 1000
10
```

### Using this to match 10% of PHP pages

I am going to use the following code to test this principle for PHP.

```php
$sample_rate = 10;
$total_tries = $argv[1];
$matches = array();
$nonmatches = array();
echo "$total_tries \n";
foreach (range(1, $total_tries) as $number) {

    $random_number = rand();

    if ($random_number % $sample_rate === 0) {
        $matches[] = $random_number;
        // if this were a real page you would submit your stat here
        // since it matches your sample rate
    }
    else {
        $nonmatches[] = $random_number;
    }
}

$matchcount = count($matches);
$nonmatchcount = count($nonmatches);
print "matches: $matchcount\n";
print "nonmatches: $nonmatchcount\n";
$dive = $matchcount * 100;
$prc = $dive / $total_tries;
echo "$prc" . "\n"
```


```plaintext
me@vm:~/php# php modtest.php 10  
10 
matches: 0
nonmatches: 10
0

me@vm:~/php# php modtest.php 100
100 
matches: 9
nonmatches: 91
9

me@vm:~/php# php modtest.php 1000
1000 
matches: 104
nonmatches: 896
10.4

me@vm:~/php# php modtest.php 10000
10000 
matches: 971
nonmatches: 9029
9.71

me@vm:~/php# php modtest.php 100000
100000 
matches: 10114
nonmatches: 89886
10.114

me@vm:~/php# php modtest.php 1000000
1000000 
matches: 99407
nonmatches: 900593
9.9407

me@vm:~/php# php modtest.php 1000000 
1000000 
matches: 99716
nonmatches: 900284
9.9716

me@vm:~/php# php modtest.php 10000000
10000000 
matches: 1001427
nonmatches: 8998573
10.01427
```

### Reference
[code](https://github.com/chasemp/archive/tree/master/modtest)
[WP Modulus](https://en.wikipedia.org/wiki/Modulus)
[WP Law of Averages](https://en.wikipedia.org/wiki/Law_of_averages)
[Python Random](https://docs.python.org/2/library/random.html)

