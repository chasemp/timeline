---
title: "Cycode Product Security All Stars: Interview"
categories:
  - Blog
tags:
  - Security
  - Product Security
  - Interview
  - AI
  - DevSecOps
date: 2026-04-30T12:00:00.000Z
---

![Cycode Product Security All Stars 2026 — Chase Pettet](/assets/images/post/cycode-allstar-card.png)

I was honored to be recognized by [Cycode](https://cycode.com/) as part of their *Product Security All Stars* award. As part of that recognition, I sat down for an interview covering how I think about security work, where AI is changing the shape of the problem, and what holds up (or doesn't) in modern product security practice. The Q&A is reproduced below.

## What's the one book, podcast, or idea that fundamentally changed how you think about security, and why does it still hold up today?

I don't have a singular book or podcast. What changed how I think is more of a mental exercise I built over time. I call it the "root-end principle," inspired by something oddly specific: bagged salad. You always get those inedible root ends mixed in. And I found myself thinking, what would it actually take to remove those entirely? New machinery, oversight, process changes... real cost.

That became a way of thinking about product decisions. Not everything imperfect is worth fixing. Every control has a cost, and every decision reflects what an organization is willing to tolerate.

So in security conversations, I ask: is this a real risk to users, or just something that offends my professional sensibilities? Only one of those matters. It's a way to stay grounded and focused on actual harm, not theoretical perfection.

## What is the best piece of advice you have ever been given that you still apply to your career today?

The best advice I've ever received was that the only way to succeed is to succeed sustainably. Security work is endless. There's always more to fix, more to investigate, more to improve. If you approach it by constantly grinding, you burn out, and worse, you become ineffective.

That really shows up in incident response. The instinct is to swarm the problem, but if an incident runs long enough, exhausted responders become a liability. The right move is often to rotate people out, not pile more in.

An exhausted defender is an attacker's best friend, so you have to manage your energy like a finite resource. Progress isn't about intensity, it's about direction and consistency over time.

## In your view, what is the single most important non-technical skill an "All-Star" must possess to influence a modern organization?

Integrity. You can't fake it, and once it's gone, you don't get it back. It's what enables everything else, particularly humility and transparency.

In security, you're constantly part of risk trade-off decisions. People need to believe that you're being honest, that you don't have a hidden agenda, and that you're not trying to block progress for its own sake.

I often say: security's job isn't to stop you from jumping into the gorilla enclosure, it's to make sure you understand that you're doing it. That only works if people trust you. And trust starts with integrity.

## What is the "silent" threat at the product layer that isn't getting enough boardroom attention yet?

The biggest under-discussed risk isn't just AI itself; it's what happens when we start outsourcing judgment to it. AI systems are built to converge toward the mean, and they're excellent at producing "average" answers. But security (and decision-making in general) often depends on recognizing edge cases and applying context.

What worries me is the slow drift toward treating AI as a final decision-maker. Not just for implementation details, but for strategy and judgment. You can imagine subtle, persistent manipulations, like a long-term prompt injection that biases decisions in small ways. Would anyone notice? Maybe not.

We've seen this pattern before. Early concerns about Wikipedia weren't really about accuracy, they were about people replacing judgment with convenience. AI risks taking that even further.

If we adopt its limitations as our own, eventually that catches up with us.

## What is one widely accepted Product Security "best practice" that you believe is actually an anti-pattern in the age of AI, and what should replace it?

Static least privilege, as we often implement it, is mostly baloney. In theory, it makes sense. In practice, it's vague and constantly shifting. What does "least" actually mean? The permissions someone needs in five minutes are different from what they need in a month. It is like the loitering and jaywalking of the security world. We pull it out when it's convenient, but it has very little fixed meaning in a practical business context.

What we end up with is a compromise that feels safe but isn't clearly defined or consistently enforced. More importantly, it can actively work against what organizations say they want: innovation, collaboration, and discovery. Those things require context and exposure, not restriction to the bare minimum.

This creates a huge disadvantage in the era of AI and innovation. Discovery and collaboration cannot happen with the bare minimum of rights and context. It's pretty untenable. If you want the developer, or AI agent, to put the pieces together and come up with a working solution, you need to expose them to more than the minimum information.

I'm not arguing for "maximum privilege." But we need to be honest: what we call least privilege today is often a loose proxy, not a precise control, and sometimes it delivers more friction than value.

## Agentic AI can now autonomously write code, find vulnerabilities, and ship fixes without a human in the loop. Does that excite you, and what does it mean for the humans on your team?

It's both exciting and terrifying... but mostly exciting. This is another foundational shift. The scale of output changes, but the core problem doesn't. We still have a software factory, and it still needs assurance.

What does change is who participates. I've started using the term "software creators" instead of developers, because more people (across finance, operations, everywhere) are now generating code.

That means responsibility expands, too. If you're creating software, you're accountable for its outcomes, whether you wrote every line yourself or not.

So the future isn't about removing humans, but about redefining their role, and making sure the systems we build can operate safely at a scale we can no longer manually control.

![Pull quote from the interview](/assets/images/post/cycode-allstar-quote.png)
