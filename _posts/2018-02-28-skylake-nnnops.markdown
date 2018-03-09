---
layout: post
title:  "Skylake's AVX-512 support for NNNOps"
date:   2018-02-28 14:05:00 +0200
author: Bartłomiej Romański <bartlomiej.romanski@rtbhouse.com>
image: "img/home-bg.jpg"

subtitle:    "Intel MKL nearly 2.5x faster then OpenBLAS on the newest CPUs."
description: "Intel MKL nearly 2.5x faster then OpenBLAS on the newest CPUs."
excerpt:     "Intel MKL nearly 2.5x faster then OpenBLAS on the newest CPUs."
---

I'm happy to announce that our <a href="https://github.com/RTBHOUSE/neural-network-native-ops">neural-network-native-ops</a> (aka NNNOps) – a simple, yet powerful wrapper for common numerical operations typically used in deep neural networks – now supports <a href="https://software.intel.com/en-us/mkl">Intel MKL</a> as its backend.

Intel MKL fully utilizes newest CPUs (including **Skylake**) with all their bells and whistles (including **AVX-512**). In our scenario this means up to **2.5x faster inference** (single-threaded 512x512 matrix multiplication on a Skylake Gold CPU).

But, as always, your mileage may vary, so go test your case – with the newest NNNOps you can easily switch backends.

