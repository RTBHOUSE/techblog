---
layout: post
title:  "FastEmbedding"
date:   2018-09-19 14:05:00 +0200
author: Bartłomiej Romański <bartlomiej.romanski@rtbhouse.com>
image: "img/deeplearning-bg.jpg"

subtitle:    "PyTorch embeddings up to 35x faster."
description: "PyTorch embeddings up to 35x faster."
excerpt:     "PyTorch embeddings up to 35x faster."
---

Training of your neural network still strangely slow? **Better check out your embeddings!**

Believe or not, but implementations of **embedding layers** built-in the most popular deep learning frameworks (including Torch, PyTorch and TensorFlow) are **terribly inefficient**. All because their strict focus on providing full determinism. While it's good thing in general, it often make things not very CUDA-friendly. **That's what's slowing you down!**

If you're ready to accept some nondeterminism in your training process (and admit it, you don't really care), make sure to check the new lib from our colleague, Darek: <a href="https://github.com/RTBHOUSE/pytorch-fast-embedding">pytorch-fast-embedding</a> – the **drop-in replacement** for PyTorch embeddings that gives you **up to 35x speed up**.

That's 5 hours instead of 7 days. How cool is that?!

<img src="/img/fast_embeddings.png">

