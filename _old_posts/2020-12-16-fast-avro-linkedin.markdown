---
layout: post
title:  "Announcement regarding avro-fastserde library"
date:   2020-12-16 14:31:18 +0200
author: Piotr Jaczewski <piotr.jaczewski@rtbhouse.com>
image: "img/home-bg.jpg"

subtitle:    "The avro-fastserde library is now supported by LinkedIn."
---

We are glad to announce that our in-house developed [avro-fastserde](https://techblog.rtbhouse.com/2017/04/18/fast-avro/) library, which cleverly boosts the performance of [Apache Avro](https://avro.apache.org) (de)serialization, was [recognized](https://www.infoq.com/presentations/recommendation-massive-data/) (around 32:00) and successfully adopted by LinkedIn and from now on is maintained by them, with some cooperation from our side, as part of their [avro-util](https://github.com/linkedin/avro-util) set of libraries. LinkedIn's fork is the superset of the original implementation and provides nice features and improvements:

* improved memory footprint
* implemented object reuse during deserialization 
* compatibility layer for various Apache Avro versions
* automatic classpath resolution for generated code compile phase 

We strongly encourage users to migrate, since the original has been deprecated and will not be supported anymore. 

Happy (de)serializing! 
