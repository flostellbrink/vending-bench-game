# Release performance evidence

## Desktop baseline before the competition changes

Host: MacBook Air (Mac16,12), Apple M4 integrated GPU, 16 GB, macOS 27.2.1. Chrome for Testing 158.0.0.0 ran headless with the ANGLE Metal M4 renderer. The main display reported 5120 × 2880 pixels. The browser loaded the uncompressed static export over loopback. These figures do not predict a mobile connection or prove physical presentation timing.

- **Cold start, empty browser profile:** 190 ms to shell hydration; 2,313 ms to the first simulator result and two animation frames. Hydration uses the first worker construction as a proxy for a usable prompt. One run, 1280 × 577 at 1×.
- **Warm start, second tab in the same profile:** 68 ms to hydration; 793 ms to simulator readiness. Page resource timing reported zero transferred bytes. It does not include the worker's own transfers.
- **Cold transfer:** the document and page resources reported 1.03 MiB transferred. The worker, engine and bundled Python runtime files total another 13.26 MiB uncompressed on disk. Approximately 14.29 MiB is a payload estimate, not a network capture of worker requests. Production compression and WAN throughput were not measured.

## Late-run operation

The keyboard sequence alternated inspections, depot reports, status, supplier search and quotes. At 1440 × 900 and 2× density it produced 594 paid receipts by day 26. At 2560 × 1440 and 2× density the second run produced 454 receipts by day 24. Each viewport used four overnight transitions in off/on/on/off order. The upper timing bound for completion was a synthetic text edit to the second animation frame, with the suggestion menu present. It excludes the physical keyboard and display. Each condition had 35 edits per trial.

- **2880 × 1800 rendered pixels:** completion p95 33.7–34.4 ms; transition frame-callback p95 16.7–16.8 ms. No callback exceeded 25 ms in a transition. The Chrome process tree used 2.53–2.55 CPU-seconds with CRT off and 2.47–2.50 with it on per 3.36–3.39 seconds of observation.
- **5120 × 2880 rendered pixels:** completion p95 33.8–34.3 ms; transition callback p95 16.7 ms. Process-tree CPU time was 2.37–2.38 seconds off and 2.43–2.49 seconds on per 3.35–3.39 seconds. These measurements meet the 50 ms desktop completion target for this host.
- **Idle, 1440 × 900 at 2×:** with the prompt blurred and simulation paused, the browser process tree used 0.00 CPU-seconds off and 0.11 on in a 2.5-second sample. This was one sample per condition.
- **GPU:** the Chrome GPU process used 0.66–0.80 **CPU**-seconds during the transitions. The macOS device-wide utilization counter varied from 0% to 83% even in idle samples with other applications running. It does not isolate GPU time or compositor drops for this tab. A 60 Hz callback trace does not rule out the player-reported lag.
- **Phone-sized desktop viewport:** 390 × 844 at 3×, 459 receipts, CRT off: completion p95 33.4 ms; transition callback p95 16.7 ms. Opening completion left the prompt in view at the same vertical position. This is a layout and desktop simulation check, not a phone performance result.

## Run completion and restarts

The 599-command run ended on day 30 at €1,140. The page had 9,701 DOM elements. Main-thread JS heap was approximately 13.4 MiB; browser process-tree RSS was 807 MiB at the subsequent full-run sample. RSS adds shared pages across processes and includes browser infrastructure, not just this game.

Five successive restarts each cleared the transcript, returned to day 1 and produced 6,745 live DOM elements. Instrumentation around the native Worker constructor and terminate method counted six created workers and five terminations. Process-tree RSS ranged from 1,137 to 1,169 MiB just after these restarts, then measured 1,142 MiB after further play. The main JS heap rose to 28.1 MiB and later returned to 9.5 MiB. Worker lifetime passed this sample; shared-process RSS and live DOM counts do not establish the absence of detached DOM or long-term memory growth.

## Coverage and release decision

At native Chrome tab zoom of 200%, a 1,200-pixel CSS viewport narrowed to 600 pixels. On day 1, the prompt accepted a command and its receipt, bank balance and save tree were reachable. On day 29, a site sales report could be requested and read without horizontal page overflow. This was desktop tab zoom, not a physical phone test.

Desktop Chrome on this integrated GPU and desktop viewport emulation have evidence. Physical iOS and mid-range Android devices, an open mobile keyboard, desktop Safari, desktop Firefox, hardware keyboard-to-display latency and isolated GPU presentation timing remain untested. One host was online in the Apple device list; one device was offline. The Android SDK's `adb devices -l` listed no attached device. The available browser CLI has no desktop Safari or Firefox engine; its iOS provider requires Appium, which was not installed.

The earlier 1440 × 900 headless sample with a short transcript also reached 60 callbacks/s. The longer runs above did not show a callback regression. They are not a reproduction or disproof of the player's CRT issue. Do not use these results to qualify CRT or declare physical phone performance.

## Scene before the fixed thumbnail rail

The opening lounge and its three site previews contained 1,374 SVG elements, down from 6,586 at the same simulated time (79% fewer). This count predates the four fixed thumbnails.

- **Same-size transition comparison:** Chrome recorded one day 2 close before and after the change at 1280 × 577 and 1×. Across each 3.4-second interval, renderer function calls fell from 644 to 132 ms, layout from 340 to 219 ms, and pre-paint from 159 to 79 ms. The frame callback p95 was 16.7 ms before and 16.8 ms after. Neither sample had an interval over 25 ms.
- **5120 × 2880 rendered pixels:** the final day 1 close had a 16.7 ms callback p95 and no interval over 25 ms. The trace recorded 167 ms in renderer function calls and 253 ms in layout. First contentful paint took 100 ms on the first navigation in a new browser session; this is not simulator readiness.
- **Idle, 1440 × 900 at 2×:** with the prompt blurred, a 2.5-second trace recorded no layout and 0.16 ms of paint on the renderer main thread. These trace durations are not process-tree CPU or GPU measurements.

These samples used short transcripts. They show less renderer work, not a change in physical display latency or late-run memory use.

## Export before multiple save slots: startup, long run and five resets

This build removed CRT and reused the interpreter on reset. Its measurements predate navigation between independent save slots. This pass used the same M4, browser, loopback server, five-command sequence and completion probe as the baseline.

- **Startup, 1280 × 577 at 1×:** an empty browser profile reached the shell hydration marker at 80 ms, first contentful paint at 116 ms and simulator readiness at 822 ms. A second tab in the same profile reached those markers at 47, 240 and 668 ms. One sample each. Hydration is not physical display latency: both tabs reported their first paint after worker construction.
- **Transfer:** the browser reported 773,234 bytes for the cold document and page resources, and 3,900 bytes for the warm visit. The cold worker payload adds 13,902,053 uncompressed file bytes, for an estimated 14.0 MiB total. Worker cache hits were not measured.
- **Late completion, native 5120 × 2880 rendered pixels:** from 594 receipts on day 26, two 35-edit trials produced p95 completion times of 33.8 and 34.0 ms. The previous native test gave 33.8–34.3 ms. The 50 ms desktop target passed on this machine using the same two-frame proxy.
- **Overnight transition, same late run:** two 3.44-second samples each produced 60 callbacks/s, p95 intervals of 16.7 and 16.8 ms and no interval over 25 ms. Chrome process-tree CPU time was 1.84 and 1.49 seconds. The earlier native no-CRT samples used 2.37–2.38 CPU-seconds; the late runs contained different numbers of receipts.
- **Completion:** after 599 paid commands, the final score was €1,140. The browser tree used 1,295 MiB RSS at the full-run sample; the main thread had 13.8 MiB JS heap and the document had 4,687 live elements.
- **Five immediate new runs:** every reset returned to day 1 with no receipts and 1,501 live elements. Worker constructors stayed at one and terminations at zero. The baseline created six workers across the same number of starts. RSS was 1,296–1,297 MiB during resets and later settled at 1,218 MiB. Main-thread heap ranged from 13.6 to 15.5 MiB during resets and later measured 7.9 MiB. No worker or live-element accumulation appeared in this sequence. The sample does not prove a long-term leak bound.

## AI House workstation

At 1440 × 900 and 2× density on the same M4, 48 synthetic edits on day 25 reached the second animation frame in 35.0 ms at p95 (35.3 ms maximum). A snack-machine inspection from 12:45 to 13:10 produced 100 frame intervals: 16.7 ms at p95 and 16.8 ms maximum. During 1.2 seconds of idle time, no station subtree mutations or size changes occurred in the observed station, scene, room or prompt. The save contained 33 receipts, not a long transcript. This sample does not measure GPU time or physical display latency.

## Reference checkpoint with a long transcript

The day-30 reference checkpoint opened with 499 receipts. In headless Chrome 158 at 1440 × 900 and 1× density, 60 synthetic prompt edits reached the second animation frame in 33.3 ms at the median and 34.2 ms at p95. The next inspection produced receipt 500 in 29.5 ms. During that inspection, 108 frame intervals over 1.8 seconds measured 16.7 ms at p95 and 16.8 ms maximum. These are browser timings, not hardware input or display latency.

## Startup and save-tree navigation

From a cold landing page to a playable new game, the local server returned 14,905,329 response-body bytes (14.21 MiB). The landing page used 807,924 bytes. The run page and worker bootstrap added 196,540; seven requests from the worker added 13,900,865. The Python WASM file alone was 10,105,545 bytes. Chrome reported identical encoded and decoded body sizes: there was no HTTP content compression. Archive sizes represent downloaded ZIPs, not extracted files. These figures exclude wire headers, TLS and CDN behavior.

On the loopback export, Start to a ready simulator prompt took 819 ms. Enter to the first depot receipt took another 31 ms. Before removing the second document load, the same probes measured 835 ms and 36 ms. Each build had one cold browser sample; the difference does not establish a speedup.

Before the worker lifecycle change, three visits to the same day-30 checkpoint left 2, 3, then 4 worker targets in Chrome, including a worker from an earlier game. The browser could have frozen them in its history cache. After the change, each of three visits showed one worker in the game and none on the save tree. Worker counts do not measure total browser memory.

Browser Back restored receipt 500 and the 09:25 clock. An inspection produced receipt 501 at 09:50. Main-thread JS heap measured 35.2 MiB before leaving, 38.1 MiB after Back and 28.5 MiB after the inspection. This excludes memory allocated by the worker and its Python runtime.

Across eight room switches, a probe held only weak references to the active illustration’s SVG descendants. After two garbage collections separated by browser tasks, none of the 4,638 removed-node observations remained reachable. Another 1,424 stayed connected across switches. This checks scene replacement only. The separate browser-wide detached-node query did not complete.

## Development turnaround

With dependencies installed and the build cache warm, generation and production export after a cabinet price change took 3.65 seconds on the M4. The preview returned the rebuilt landing page 3.83 seconds after the command started. This is build-to-HTTP time, not browser paint time.
