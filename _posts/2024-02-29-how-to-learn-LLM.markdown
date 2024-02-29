---
layout: post
title:  "How to Learn?"
date:   2024-02-29 10:00:00 +0000
author: Przemysław Iwańczak <przemyslaw.iwanczak@rtbhouse.com>
image: "img/home-bg.jpg"

subtitle: "What challenges and chances the \"LLM New World\" presents?"
---

Despite what the title may suggest, I'm not here to tell you exactly how to learn. Instead, I'd like to share my thoughts on how we learn and leave it up to you to decide whether and to what extent you agree.

Generally — as a community, we don't know how we learn. Popular knowledge/beliefs are inconsistent with scientific knowledge. In 2011, a [study](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0022757) was conducted in the U.S. to check whether the "wisdom of the crowd" understands how memory and the learning process work. TLDR: the wisdom of the crowd fell short. Our field is not particularly different—we have many of our own beliefs, a lot of knowledge, a lot of workshops, but…

## Human memory is not binary 
 
The process of acquiring knowledge (learning) resembles a "select-and-upsert" operation—we look into our knowledge and add things to what we already know. This action can strengthen, modify, or, in extreme cases, disrupt our knowledge. Another interesting aspect is "spreading activation"—a process that warms up a part of the brain rather than simply retrieving a specific memory point, a significant simplification for those more versed in neurobiochemistry. Touching on various pieces of information around a topic helps us solve "area" problems better. However, it also means our memory paths can connect unpredictably, leading to the degeneration of remembered facts (forgetting or mixing facts). This has intriguing implications. Going through a problem can help solve it—"eureka moments" during a bathroom visit, shower, or workout, or a "solution" that comes to mind after a good night's sleep. For instance, in the book "Why We Sleep" by Matthew Walker, it's mentioned that remembering is possible because we experience the REM phase during sleep.
 
## LTM and STM (cache and "long-term memory") 

In 2011, Kahneman published "Thinking, Fast and Slow," where he described two systems: System 1, which is quick, instinctive, and effortlessly accessible, and System 2, which is slow, painful, and costly but allows for thorough problem consideration. Our memory is similarly structured with a "quick cache" and "long-term memory" (LTM). The cache is great but limited in capacity, often said to be allocated at birth. In contrast, LTM has no limit but is slow. Becoming an expert involves filling the LTM, while a great cache enables quick and efficient learning. We think in chunks, limited by "cognitive load," which varies among individuals based on their "cache" size. Cognitive load comprises "intrinsic load" (IL), the necessary information for solving a task, and "extraneous load" (EL), information not directly needed but part of task execution. For example, drawing a database schema might be easier with a diagram (lower EL) than a verbal description, although the IL should be similar in both cases.

## A bit more on Kahneman

Kahneman's systems also explain why experts can solve problems faster. An expert has a well-developed System 1 in their own domain—for instance, a chess player plays well and quickly because they have an extensive memory and can reach into a specific state to make a move. A novice lacks this knowledge. Theoretically, given infinite time, they could use System 2 to make an equally good move, but it would take significantly longer. For us, knowledge of design patterns, abstractions on "how to solve a problem," and the experience of having tackled and solved problems differentiate great specialists. This is important to remember as we move on to discuss the Internet and LLMs. However, merely having years of experience is not enough. Some people may only have what is jokingly referred to as "one year of experience repeated ten times." In general, the ability to divide and simplify problems using patterns is what allows us to tackle and successfully solve more challenging problems.

## Why cramming doesn't work

During our learning journey, we've all encountered education systems and their popular fallacies, including last-minute cramming before exams. However, this approach is ineffective in professional and academic settings for two reasons: 

  - Memory consolidation occurs during sleep, specifically in the REM phase, allowing us to absorb a certain amount of information at a time. 
  - Knowledge acquisition relies on the repeated use or review of information over time. 

Unfortunately, we can't biohack or cheat these two criteria to speed up the learning process.


## Problem-solving

The belief that problem-solving is a generic skill is widespread but not entirely accurate. Indeed, we possess a capability for generic problem-solving, but it is neither comprehensive nor quick. 
Problem-solving is not a universal skill that can be learned once and applied everywhere. 
We learn to solve problems within specific domains. To improve at problem-solving, we must choose the types of problems we want to tackle. This emphasizes the importance of domain-specific learning and practice in enhancing our problem-solving abilities—a process also known as “becoming an expert.”


## Enter: the Internet revolution

For thousands of years, the approach to learning remained largely unchanged. However, the advent of the Internet has revolutionized this landscape. The running joke that, alongside domain-specific knowledge, the skill of "how to Google" is crucial masks a stark reality: our access to information and the approach we take towards learning have fundamentally shifted, requiring a completely different mindset. 
For example, the "older" approach involved dedicated sessions for writing software and structured sessions for deepening knowledge or searching for information in libraries or books. 
Today, or rather, as of "yesterday," the process is different. We engage in short, intervallic sessions of writing, Googling, synthesizing information, and then writing some more, all while being bombarded by distractions from Slack, phones, and family. 
We, as humans, are not prepared. We’ve evolved in a very stimulus-scarce environment over thousands of years. Overstimulation and rapid context switching are becoming more of a problem. To manage this, we’re developing and trying numerous techniques that aim to help us concentrate, live, get more deep work done—or manage stress. For example, one popular method for deep work sessions is the "Pomodoro" technique, which attempts to manage chaos and create space for deep focus, free from noise and distractions. While not the only method and not suitable for everyone, it's certainly worth trying.


## Enter: LLM revolution (or: GenAI revolution)

I believe we are on the cusp of another significant change—the rising importance of LLMs, which are already revolutionizing the world for both practitioners—those who "write code," office workers, creative designers, and so many others—and learners. Professionals should be considered a subset of all learners. It's crucial to prepare now and take a moment to consider how this new world will look, which skills we can delegate and lean on technology, and which we should refine. And to think about the potential threats we face.

**Invitation to discussion — opinion piece**

As an invitation to discussion, I'd like to present a few points:

- We, as IT professionals, **will rely less on the knowledge of "how to write something" and more on the awareness that something is possible**. Kahneman's "System 1" will stay with us, but its application will change. For example:

  - I can ask Copilot to generate a set of Unit Tests for a piece of code. It works well, but my System 1 needs to know what I want, roughly what to expect, and how to validate if what I received makes sense and meets my needs.

  - I can ask DuetAI to reformat a DesignDoc. It works well, but I still need the ability to read and understand what is written and to identify any inaccuracies or misunderstandings.

  - I can use ChatGPT to quickly set up the boilerplate for a new app I'm working on, but I need to know how to describe what I expect, how to validate if I receive what I need, and how to iterate over errors if they occur.

- **LLMs are just another tool that will improve productivity**. Similar to coding in VIM vs. an IDE—you can use either, but an IDE tends to dramatically improve efficiency.

- **Expertise will be increasingly valued**. Not everyone will need to use GenAI, but an expert who effectively leverages LLMs will be the proverbial "10x engineer" because there will be more time to focus on truly complex problems, as simpler ones can be handled by a few prompts.

- **"Experts recognize, beginners reason"**. Learning will be more challenging, at least significantly different from what we're used to with traditional schooling. This will be exponentially more difficult because using LLMs daily works in the opposite way to the learning we need. From academia, we know learning is more effective when working with books than when "quickly copying" from a quick search, StackOverflow, or ChatGPT.

- The ability to **divide a problem into smaller, structured components will be even more crucial**. Even today, dividing a problem into complete, independent parts is challenging. LLMs require complex problem breakdown just as much as less experienced professionals. The number of people capable of such tasks is not growing quickly enough, though.


## References

1. [Behavioural and brain responses related to Internet search and memory](https://onlinelibrary.wiley.com/doi/abs/10.1111/ejn.13039)
2. [What People Believe about How Memory Works: A Representative Survey of the U.S. Population](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0022757#:~:text=Substantial%20numbers%20of%20respondents%20agreed,can%20be%20enhanced%20through%20hypnosis)
3. [10 Things Software Developers Should Learn about Learning](https://cacm.acm.org/magazines/2024/1/278891-10-things-software-developers-should-learn-about-learning/fulltext)
4. [Automated Unit Test Improvement using Large Language Models at Meta](https://arxiv.org/abs/2402.09171)


Inspiring books and posts:

1. [Atomic Habits](https://www.amazon.com/Atomic-Habits-Paperback-%E3%80%902018%E3%80%91-Author/dp/B07L9XKGKL/) by James Clear
2. [Deep Work: Rules for Focused Success in a Distracted World](https://www.amazon.pl/Deep-Work-Focused-Success-Distracted/dp/0349411905/) by Cal Newport
3. [Learn Like a Pro](https://www.amazon.pl/Learn-Like-Pro-Science-Based-Anything/dp/1250799376/) by Barbara Oakley
4. [Why We Sleep: Unlocking the Power of Sleep and Dreams](https://www.amazon.com/Why-We-Sleep-Unlocking-Dreams/dp/1501144316) by Matthew Walker
5. [Raising children on the eve of AI](https://juliawise.net/raising-children-on-the-eve-of-ai/) by Julia Wise
