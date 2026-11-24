# Performance

Host: MacBook Air M4, 16 GB, headless Chrome 158, static export over loopback. Browser timings only. They do not measure keyboard or display latency, or phones.

## Startup

- Cold start: 819 ms from Start to a ready prompt. The first command takes 31 ms more.
- Cold transfer: 14.2 MiB, no HTTP compression. The Python WASM file is 9.6 MiB of it.

## Late run

- Completion: p95 33.8–34.0 ms with 594 receipts on day 26, at 5120 × 2880 pixels. Target: 50 ms.
- Overnight transition: 60 frames per second, p95 frame interval 16.7–16.8 ms, no interval over 25 ms.
- Day 30 with 499 receipts: completion p95 34.2 ms.

## Memory

- Five new runs in a row: one worker throughout and no growth in live page elements.
- Eight room switches: no removed scene nodes remained reachable.

## Not tested

Physical phones, desktop Safari and Firefox, GPU time per tab.
