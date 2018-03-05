---
layout: post
title:  "Ultrafast NVMe Sampler"
date:   2018-03-02 14:05:00 +0200
author: Bartłomiej Romański <bartlomiej.romanski@rtbhouse.com>
image: "img/home-bg.jpg"

subtitle:    "Random batch generation at 6 GB/s (or 5M records/s)."
description: "Random batch generation at 6 GB/s (or 5M records/s)."
excerpt:     "Random batch generation at 6 GB/s (or 5M records/s)."
---

Tired of shuffling your learning data each and every epoch? You really need to check this out!

Paweł from our <a href="/jobs/">data science team</a> just open-sourced his <a href="https://github.com/RTBHOUSE/nvme_sampler">NVMe Sampler</a> – a library we use at RTB House while training our <a href="http://pytorch.org/">PyTorch</a> models. With a bunch of NVMe drives, libaio and some black performance magic this little tool can generate random batches for you with the astonishing speed – over **6 GB/s** (or **5M records/s**).

See <a href="https://github.com/RTBHOUSE/nvme_sampler">README</a> for all the details. Here's just a little architecture preview:

<img src="/img/sampler.svg" style="width: 80%">

Never wait for data shuffling again!

