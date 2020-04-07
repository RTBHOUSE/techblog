---
layout: post
title:  "Kafka Workers as an alternative to Kafka Connect"
date:   2020-03-31 20:30:00 +0200
author: Tomasz Uliński <tomasz.ulinski@rtbhouse.com>
image: "pics/tulinski1-use-case.svg"
photo: "img/home-bg.jpg"

subtitle:    "High performance and scalability."
description: "High performance and scalability."
excerpt:     "High performance and scalability."
---

In this post we would like to share our approach to a common problem of transferring data from Kafka to other systems. The most popular choice for this kind of tasks is [*Kafka Connect*](https://docs.confluent.io/current/connect/index.html) with its [*library of Connectors*](https://www.confluent.io/hub/). We will take a closer look at how well Kafka Connect scales and how to overcome some of its limitations. As an alternative solution we will use our open-source [*Kafka Workers*](https://github.com/RTBHOUSE/kafka-workers) library which was designed to increase parallelism level in Kafka consumer applications.

Let\'s start with defining a specific use case based on our production data. Our goal will be transferring data from a Kafka topic and storing them in the HDFS.

![image alt <>](/pics/tulinski1-use-case.svg)

Note that we store records in the proper directories of the HDFS based on their fields (some timestamp and a category enum). Both Kafka Connect and Kafka Workers allow us to easily implement a component responsible for partitioning output records.

Kafka Connect can be scaled up to the number of input partitions so let\'s see what throughput can be achieved for the maximum number of processing threads.

![image alt <>](/pics/tulinski1-benchmarks1.svg)

Although \~58K msgs/s seems to be enough for handling our input data rate of 20K msgs/s, it does not give enough capacity in terms of handling a processing lag. Let\'s assume our goal is to be able to catch up with one day lag in less than an hour. It sets the expected throughput at the level of 500K which is almost nine times more than Kafka Connect provides.

Should we increase the number of partitions by a factor of nine? It\'s not always a good idea. Here\'s why:

-   It is [*recommended*](https://blogs.apache.org/kafka/entry/apache-kafka-supports-more-partitions) each broker to have up to 4K partitions (up to 200K per cluster).
-   Sometimes you want to keep the same number of partitions for all topics (or within a group of topics). Then adding more partitions to one topic may require resizing others.

Wouldn\'t it be better to have an alternative mechanism allowing us to increase the parallelism level on demand without adding more partitions?

Let\'s move on to [*Kafka Workers*](https://github.com/RTBHOUSE/kafka-workers) library and give it a try with the same input data and the same number of processing threads.

![image alt <>](/pics/tulinski1-benchmarks2.svg)

It turns out that for the same number of processing threads it is three times faster than Kafka Connect. There are two main reasons for that:

-   Kafka Connect translates messages to/from its internal data format which increases overhead.
-   In Kafka Workers processing threads are separated from consumer threads.

We have to mention here that Kafka Connect HDFS Connector has a stronger delivery semantics. It provides exactly-once when Kafka Workers ensures at-least-once processing. However if you look at Kafka Connect HDFS [*write ahead log implementation*](https://github.com/confluentinc/kafka-connect-hdfs/blob/master/src/main/java/io/confluent/connect/hdfs/wal/FSWAL.java) you will see that the additional number of operations on the HDFS is negligible from our benchmarks perspective. Introducing WAL to Kafka Workers in order to achieve exactly-once processing would be more complicated than in case of Kafka Connect. Besides that we successfully build our data pipelines based on at-least-once components, applying deduplication when needed, so this feature was not critical for our internal use.

Let\'s step back and describe Kafka Connect\'s bottlenecks in more details. Kafka Connect framework has a nice design in terms of modularity. Converters are decoupled from tasks by introducing Connect API internal data format. Tasks either produce or consume records in this internal data format, whereas converters are responsible for serializing/deserializing these records to/from bytes.

![image alt <>](/pics/tulinski1-connect-internal-df.svg)

This design provides great flexibility of joining tasks with converters, but at the same time it requires additional conversions of messages to/from the internal data format. In our example Kafka Connect HDFS Connector converts messages as follows:

![image alt <>](/pics/tulinski1-msg-conversions-connect.svg)

Kafka Workers does not incorporate the idea of the central data format. Instead it provides fully generic API where tasks process records consisting of keys and values of user\'s choice (`WorkerRecord<K, V>`). In order to specify `K` and `V` data types we have to define KafkaConsumer [*deserializers*](https://kafka.apache.org/23/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html#KafkaConsumer-java.util.Map-org.apache.kafka.common.serialization.Deserializer-org.apache.kafka.common.serialization.Deserializer-) (built-in Kafka mechanism). Thanks to that the number of message conversions steps can be reduced:

![image alt <>](/pics/tulinski1-msg-conversions-workers.svg)

Different threading model is another factor having an impact on a throughput gap between Kafka Connect and Kafka Workers. In Kafka Connect messages are consumed and processed within the same thread, whereas in Kafka Workers consumers and processing tasks are decoupled. It boils down to the difference between sync and async processing.

![image alt <>](/pics/tulinski1-threading.svg)

Assuming efficient queue implementation the async approach is up to 2x faster (when fetching and processing throughputs are at the same level).

Additionally Kafka Workers allow to scale our app beyond the number of kafka partitions. The concept is simple. We have to define a Partitioner which splits messages from a single input partition into a configurable number of subpartitions. Messages from distinct subpartitions can be processed by separate threads. For more details please see kafka-worker\'s GitHub [*page*](https://github.com/RTBHOUSE/kafka-workers).

Let\'s run Kafka Workers implementation with more processing tasks then.

![image alt <>](/pics/tulinski1-benchmarks3.svg)

Cool, it looks that we have managed to go below 1h limit for catching up with 1d lag and we did it without increasing the number of partitions in the input topic. Below the same results shown as a column chart.

![image alt <>](/pics/tulinski1-benchmarks3-chart.svg)

Currently our Kafka Workers HDFS Connector is not publicly available on GitHub, but we plan to publish it soon. If you would like to use it please leave your comment in this [*issue*](https://github.com/RTBHOUSE/kafka-workers/issues/30).

Versions used in our experiments:
-   Kafka Connect Docker image
    -   `confluentinc/cp-kafka-connect-base:5.4.0`
-   Kafka Connect HDFS plugin
    -   `confluentinc/kafka-connect-hdfs:5.4.0`
-   Kafka Workers
    -   `1.0.13`
-   Kafka
    -   `2.3.0`
-   HDFS
    -   `3.1.3`
