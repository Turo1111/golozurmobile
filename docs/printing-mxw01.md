# Use MXW01 without replacing RawBT

## Production controls and recovery (current)

Use the existing authorized Android development client; this guide does not authorize installing, building or operating a connected phone. RawBT remains the default and its `printed` result means accepted URL handoff, not hardware confirmation.

1. Open Settings through the unchanged `read_user` access. Choose and save the intended transport. Current MXW01 selection and up to 10 explicitly saved printers appear; three are initially visible and **Mostrar más** expands the list. Tapping a history entry saves it explicitly. Nothing auto-selects from history.
2. **Eliminar** requires confirmation. Cancelling removal changes nothing; removing the current printer clears selection without choosing another. Formatting is grouped below printer administration. **Imprimir prueba** is the only test control: save pending formatting first, insert paper, confirm **Imprimir una vez**, and inspect the fixed synthetic receipt. It uses no sale/customer data. A1 diagnostic and passive-evidence controls are no longer exposed.
3. From any authorized sale print action, a missing MXW01 selection opens recovery in the same print host, not Settings. Choose **Buscar impresora**; the guarded foreground scan lasts at most 10 seconds and shows up to eight deduplicated MXW01 candidates. Select one explicitly. Saving must succeed before the original ticket resumes once.
4. Empty/error discovery or failed saving offers **Reintentar**/**Cancelar**; neither retries automatically. Closing/finishing the post-sale dialog, Android back, blur or unmount suppresses continuation. An already accepted printer selection remains saved even if the pending print is cancelled. Cancellation does not undo paper already sent.

| Sale outcome | Presentation |
|---|---|
| `printed` | Existing green floating success; RawBT handoff semantics unchanged |
| `sent-unconfirmed` | Blocking global-style warning, explicit dismissal only; no success or failure/completion assertion |
| `omitted` / `error` | Non-success feedback, no automatic retry |
| Cancelled | No success claim or late feedback; thermal Loading ownership is released |

The exact sale warning is: **No recibimos confirmación de la impresora. Revisá el ticket; si no salió, reintentá o revisá la conexión.** Inspect paper before any explicit retry. Shared sale presentation suppresses duplicate native outcome alerts; RawBT installation guidance is retained. Unrelated Loading/alerts retain their ownership/default behavior. The Settings fixed test retains its existing native-facade presentation; it is not one of the shared sale callers.

### Android release evidence checklist

**Unavailable in this apply slice:** no authorized Android/device harness was supplied or operated. Node mocks/static checks are not native or paper evidence. Before release, record APK/Android version, sanitized software outcome, elapsed time and observed paper for each case; never include customer data or device IDs.

- [ ] NewSale online-ID and offline/provided requests; EditSale route-ID and edited-memory requests; DetailsSale ID/provided fallback; Sale server/local rows: verify the original ticket resumes once after save.
- [ ] Allowed/denied `update_sale` print gates and `read_user` Settings access remain unchanged, including Android-only thermal actions and API 30 versus 31+ Bluetooth denial/temporary permission-dialog behavior.
- [ ] Missing selection with retained history does not auto-select; scan empty/error/duplicate candidates, explicit retry and save failure preserve the same ticket.
- [ ] Cancel/back/blur/unmount during scan/save/online fetch emits nothing late; accepted selection still survives cancellation and app restart. Confirm current/other removal, cancelled removal and expansion 3→10.
- [ ] Confirmed output, full-send unconfirmed (including observed AA-like signal), error/omission and cancellation use truthful feedback without duplicate outcome alerts; dismissing the warning sends nothing. Unrelated Loading/alerts survive thermal settlement and host suspension/restoration.
- [ ] Run one fixed **Imprimir prueba** with paper, inspect layout/accents/amounts/feed, and separately verify unchanged RawBT handoff/install guidance and A4/PDF sharing before release.

### Historical protocol notes below

The following captures, experimental instructions and rollback records are preserved for provenance, **not current production controls or authorization for another device attempt**. References below to A1 tests, passive-evidence text/copy buttons or old native sale warnings describe removed UI/legacy facade behavior. Use the current controls/recovery/checklist above instead; transport timing, private fixed fixture and wire-level validation remain unchanged.

RawBT remains the default for existing installs and works without loading BLE in Expo Go. Optional MXW01 printing uses an original, foreground-only native BLE adapter and a local 384-dot canvas receipt. The owner reports that development APK `ce9b686c-5fb8-4be2-a9c2-4300d2892a40` is finished and includes BLE PLX 3.1.2, Expo 49 and RN 0.72. Supplied physical A1 and A9 callbacks now support narrowly labeled JavaScript interoperability paths. **The owner-supplied photo now shows a complete legible synthetic receipt, but software completion still times out: physical AA/closing behavior remains unknown.** The successful browser test is a reference, not proof of this adapter or identical typography.

## Observed A1-only compatibility and paper limitation

Literal user-labeled AE02 callbacks (each one whole 17-byte reply, not truncated):

```text
WITH PAPER:    22 21 A1 03 0A 00 00 00 00 5D 13 00 00 00 AD 00 00
WITHOUT PAPER: 22 21 A1 03 0A 00 00 00 00 5D 13 00 00 00 AA 00 00
```

One additional user-supplied whole response, received while paper was loaded:

```text
22 21 A1 03 0A 00 00 00 00 5F 12 00 00 00 B0 00 00
```

These replies decode to idle/no-reported-error using reverse-engineered community **whole-packet** state offset 6, status flag 12 and error 13; battery 9 and temperature 10 are byte readings. This is not a vendor contract. Offset 14 is an opaque observed AD/AA/B0 signature, **not a paper sensor**. The additional B0 response was received with paper loaded, but its semantics remain unknown. **Paper presence is always UNKNOWN; reinsert paper before any print.** Known busy states 1–3, nonzero error/flag and unknown states stop before a print request.

The observed envelope requires exactly `22 21 A1 03 0A 00`, 17 bytes, zero reserved/unknown slots 7/8/11/15/16 and opaque signature AD, AA or B0 at 14. Integrity is explicitly `unverified`, variant `observed-short17`, provenance `user-captures/community-status-layout`. Unknown tail bytes are not called a CRC/footer and nothing is padded, dropped or claimed CRC-verified.

Strict framing/CRC remains preferred and `parseNotification` is unchanged. The compatibility candidate is **not admitted on arrival**: it is resolved only at the end of the existing bounded A1 window when it was the sole post-query whole callback and the control write was queued. A second callback (including malformed/filtered input), fragments, coalesced/extra bytes or a prefix that could finish as a CRC-valid strict18 frame blocks fallback. Therefore fragmented/coalesced short variants are intentionally unsupported; strict frames still use bounded streaming/reassembly. Resolving the isolated candidate clears only its buffered bytes before later strict replies, never eats following frames, and adds up to five seconds of waiting instead of an arbitrary quiet-delay guess. Cancellation/disconnection never enables fallback.

Outgoing A1 `22 21 A1 00 01 00 00 00 FF`, CRC, current without-response writes and notification setup delay are unchanged. A9 must produce an admitted single-zero ACK **before** AE03 data: the strict path or the separately bounded observed8 rule below. AA still must validate strictly before `printed`; its real format is unknown. Synthetic strict AA test controls are not physical completion proof.

## Observed A9 short8 zero ACK (no AA guessing)

The supplied real A9 evidence was one whole, nontruncated post-query AE02 callback with MTU512, A1 passed, A9 write queued and a 5000ms window:

```text
22 21 A9 00 01 00 00 00
```

The declared payload is one zero byte. The remaining zero is consistent with MSB polynomial07/initial0 payload CRC, but its actual role and frame integrity are not vendor-certified; FF is absent. Variant is **`observed-short8`**, integrity **`unverified`**, provenance **`user-a9-capture`**. No byte is padded/dropped and the global strict parser/outgoing framing remain unchanged.

Unlike observed A1, this8 is a CRC-consistent prefix of a valid strict9 if FF later arrives. It is therefore held until the **selected A9 deadline** (5000 ms normally; 500 ms only for the fixed synthetic trial below): only a sole whole in-budget callback with exact header/opcode/tag/length/single-zero/consistency shape and a successfully queued write may fall back. A timely complete strict9, including valid split delivery, wins immediately as `strict-crc`/`crc-verified`. Later callbacks/fragments/extra/coalesced/filter-rejected input, nonzero/corrupt ACKs, failed/unqueued/hung writes, cancellation and arrival at/after the exclusive deadline block short fallback. Beginning the query discards pre-query/stale partial ACKs. There is no arbitrary quiet-delay, larger timeout or second A9 request.

After eligible resolution the same image/pacing/flush pipeline continues. **AA is not made compatible with8 merely because A9 was**: its strict framing/CRC and completion payload gate remain. If no accepted AA arrives by its existing deadline after the entire image and AD writes resolve, the explicit result is `sent-unconfirmed`, never `printed`. A received strict AA with a disallowed payload, or any earlier image/AD failure, remains an error. No automatic retry is added.

## Capture one A1-only result on the existing APK

This diagnostic is JavaScript-only. Use the existing development APK; no new native/cloud build, SDK update or dependency installation is needed. No assistant has run this diagnostic on a phone or printer.

1. Run `npm run dev:client` locally and open the existing development client with the updated Metro bundle. Do not use Expo Go for native BLE.
2. Open Settings with the intended MXW01 already selected and saved. Save deliberate pending changes before testing. The diagnostic never scans, chooses a different printer, or changes stored settings.
3. Close other printer connections and keep Golozur in the foreground. Tap **Test BLE connection (A1 only)** once. Allow the existing Android permissions if requested, or use **Cancel A1 test** to stop.
4. Wait for the selectable result. Long-press/select/copy **only that text**, then send it for analysis. Do not send a sale/profile screenshot, customer data or the saved device ID. The result lives only in Settings memory; **Clear diagnostic result** removes it.
5. The status-only action never prints. Its report distinguishes `strict-crc`/`crc-verified` from `observed-short17`/`unverified` and always shows unknown paper presence. An accepted status is not printing proof; the test ends and requests disconnect rather than showing a persistent Connected state. Do not use an actual-sale print as a diagnostic retry.

The sole application command is `22 21 A1 00 01 00 00 00 FF`, once, using the current without-response control write. No A2 intensity, A9 print request, AE03 image/data writes, AD flush, sale fetch/render/API calls or automatic follow-on print occur. Existing permission, foreground, connection/discovery, print/BLE exclusivity and cleanup safeguards are reused.

The receive deadline is at most **5000 ms from subscription setup**, including the existing 250 ms setup delay; this is not a CCCD-ready acknowledgement or a notification-readiness fix. The waiter precedes the write. Evidence includes a callback count saturated at 255, the first at most four AE02 samples, at most 96 base64 input characters/72 decoded bytes per sample, bounded input-length metadata, truncation flags, HEX, negotiated MTU and allowlisted public error codes. No native messages, characteristic objects, device identifiers, sales, environment values or credentials are reported or logged. Oversized input is sampled but never admitted from its truncated prefix.

`rawCallbacks: 0` differs from observed callbacks with no admitted A1. Sample reasons describe individual chunks: `observed-a1-candidate` does not mean admitted until the window-end rules succeed; strict fragments may look incomplete before assembly. Malformed, CRC-rejected or other-command evidence is not accepted. Tests label the two supplied physical A1 literals separately from synthetic busy/error layouts and later A9/AA controls. No broader timing, ATT-mode or notification-format fix is inferred.

## One user-triggered synthetic print WITH PAPER after checks

### Authorized synthetic-only 500 ms A9 receive experiment

Only `printSyntheticTicketWithA9Evidence` through the existing **Print synthetic test + passive A9 evidence** / **Print once** action now uses a **500 ms A9 receive/reply window**. Normal sales and direct session defaults retain 5000 ms. The private fixed-fixture context selects this one-variable trial, never the evidence callback, generic request options, saved config or AsyncStorage. No observer still means the same 500 ms trial but no report; throwing/rejecting observers cannot change timing. No new UI, tuning flag, stored value or fixture/rendering change is added.

A1 replies and **all control-write bounds, including the A9 request write, remain 5000 ms**. Setup 250 ms, image writes, transfer/completion budgets, MTU/chunks/pacing, AD/strict AA, cancellation, cleanup and first-terminal-cause accounting are unchanged. The sole eligible observed8 candidate waits until the 500 ms deadline and the SAME request has successfully queued; a request Promise resolving later can postpone data beyond 500 ms. Failed/hung/cancelled writes never permit fallback. Timely strict9 or8+FF wins; arrival at/after the exclusive deadline fails closed. The report shows `receiveWindowMs: 500` and actual raw-ACK-to-first-write delta, not a guaranteed 500 ms data-start promise.

**Late ACKs may now be rejected in this synthetic trial.** The owner-supplied prior report showed 30 resolved writes/1440 queued bytes, a 4923 ms raw ACK delay and disconnect, while the owner reported no printer movement. Queueing does not prove peripheral receipt. Firmware abandonment remains an unproven hypothesis; shortening this window is an experiment, not a proven hardware fix. After independent checks, reload Metro in the existing development APK and perform **ONE user synthetic attempt WITH PAPER** using the unchanged confirmation; stop and inspect before any retry. No extra APK/build or standalone probe is needed.

The captured8-byte A9 reply explains the previous strict-buffer timeout. After local checks and parent validation, the approved next physical step is **directly ONE synthetic print WITH PAPER**, using the existing development APK and updated Metro bundle. **No more preliminary A9-only/capture-only round is required.** Passive evidence stays available during that SAME print if an error occurs. It is not an assistant operation or a standalone probe; no new native/cloud build is required.

1. Reinsert paper and verify it physically; neither captured A1 reply proves paper presence.
2. Run `npm run dev:client` locally and open the existing development client with the updated bundle. `npm run dev` still targets Expo Go for RawBT.
3. Use the already saved intended MXW01 profile/device, close other printer connections and keep Golozur open. Do not change printer selection or use a customer sale for the test.
4. Tap **Print synthetic test + passive A9 evidence** and confirm **once**. This is the direct paper print using a fixed provided synthetic fixture, not an actual sale/API fetch/customer upload. Image data starts only after an admitted zero ACK; this experiment uses the full 500 ms observed8 receive deadline plus the existing successfully queued-write gate. Capture does not force/prevent printing, add queries, or waive AA. **Test BLE connection (A1 only)** remains available but is not an extra preliminary step and never prints.
5. Wait until the attempt ends, then long-press/select/copy **only the Passive A9 evidence result**. No clipboard dependency is added. Evidence survives A9 timeout and lives only in Settings memory; it is cleared on the next synthetic attempt, explicit clear or unmount. Do not send sales/profile screenshots, saved IDs or customer data.
6. On rejection, timeout, cancellation, missing AA/completion or unexpected output, **stop and inspect paper before any manual retry**. If image transfer started, partial or complete paper may already exist despite failure. There is no command retransmission or automatic retry.

### Passive A9 evidence boundary

This observer surrounds the **same single A9 request** in A1 → A2 → A9 → admitted zero ACK → AE03 → AD → strictly validated AA. The observer itself never writes, resolves waiters, changes admission/pacing/deadlines, or owns a connection/transaction. Actual admission is the strict9 path or narrowly authorized observed8 rule—not sample classification. Invalid/missing ACKs still allow zero image writes. Capture remains only on the Settings fixed synthetic fixture route; normal sales cannot opt in with a caller flag. A1-only testing is retained and never prints.

The existing raw AE02 observer samples the A9 window (500 ms fixed-synthetic, normal/direct default ≤5000 ms) and, after an admitted ACK, transfer/completion until the existing deadlines. **A9 plus closing share at most FOUR retained CONTROL samples TOTAL**, each ≤96 Base64 input characters/72 decoded bytes; no second four-sample buffer exists. Original `rawCallbacks`/saturation still count A9 only, while closing has a separate counter saturated at255. A1 before A9 and AE03/outgoing image data are not sampled. No native messages, characteristic objects, IDs, config, sale/raster/environment/URL values or console logs are published. Projection occurs before the optional final callback; consumer errors or an unmounted screen cannot change printing/cleanup. Existing cancellation still stops the actual attempt.

`a1Passed`, `a9WriteQueued` and nonzero raw callback count are **not** ACKs. `a9AckAccepted` records the actual single-zero gate; `a9Variant`/`a9Integrity`/`a9Provenance` distinguish strict CRC from observed8 unverified integrity. `observed-a9-candidate` on a sample is not admission before deadline/sole-callback rules succeed. `imageTransferStarted` follows that gate; `completionValidated` still requires strict AA. Printed software status is not hardware certification and never comes from a timeout or classification alone.

### Passive AD/AA closing evidence in the same transient result

The latest owner report reached completion with 468 resolved writes/22464 queued bytes, then timeout, despite a complete legible fixed-synthetic receipt photo. An A9-only callback count cannot establish whether AD queued or AA arrived; phase `completion` is set before the final AD send. Closing capture is evidence-only, **not a protocol fix or permission to print a real sale again**.

| Added field | Meaning / bound |
|---|---|
| `adWriteAttempted` / `adWriteQueued` | Boolean actual AD call attempted versus original native write Promise successfully resolved before terminal failure/disposal. Queueing is not peripheral receipt. |
| `closingFailureScope` | First closing bound to reject: `final-command` or `aa-wait`, otherwise `null`. Recorded at settlement, never inferred from messages or delayed catch; native-first `failureOrigin`/code remains unchanged. A null scope can coexist with a rejected completion payload rather than a failed bound. |
| `aaWaitRegistered` | Boolean enrollment of the unchanged AA waiter before the last data write. |
| `aaBeforeWaitObserved` | Boolean existing strict stream parser emitted AA during closing while no waiter was registered. That early AA is still dropped, never replayed/reconstructed into acceptance. |
| `closingRawCallbacks` / `closingCallbacksSaturated` | Closing callback count 0–255 and saturation flag. Zero means no captured callback in this bounded interval, not proof of peripheral silence. |
| Sample `stage`, `aaWaitRegistered`, `aaTagged`, `completesStrictAA` | Closed stage (`a9-wait`, `transfer`, `completion`), wait-at-arrival flag, observed AA header tag and existing stream-parser AA emission in that callback. An incomplete/invalid raw fragment may complete a strict streamed packet; these facts are not payload acceptance or printing proof. |

When closing starts, retention keeps one actual A9 reply sample when available (otherwise one A9 sample) and reserves the remaining slots for closing. First AA-tagged/stream-completing evidence is protected under noise; other closing slots rotate within the same four-slot array. Unexpected commands, malformed/noncanonical/oversized input, fragments and footerless AA remain visible/classified—not silently filtered to strict AA. No extra unbounded buffer, absolute timestamp, subscription, command, timer, wait or retry is added. Observation stops at the existing transfer deadline (120000 ms maximum) / AA enrollment deadline (50025 ms maximum), terminal failure, cancellation or finish.

The final command still has its 5s write bound, and the AA waiter retains its original 50025ms (45000+5000+25) deadline enrolled before last data; only a callback matching the unverified signal structure above closes it early after AD resolution. All strict/short A1/A9 rules, strict AA, private 500ms experiment, opening 15s/cleanup 3s, chunks 48/pace 25 and native-timeout omission remain unchanged. After independent checks/current Metro, only **ONE USER fictitious ticket WITH PAPER** may collect this result; it can still return a timeout/error after physical printing. Stop and inspect before any retry; no automatic retry or new APK is required.

### Enqueued but unconfirmed when AA is absent

If and only if every image-write promise resolves and the original AD control-write promise resolves, the MXW01 print call returns the distinct status **`sent-unconfirmed`** when either the existing AA waiter reaches its own timeout without a valid accepted AA payload, or a canonical raw callback matching the unverified 10-byte structure `22 21 AA 00 03 00 00 XX XX 00` arrives during the registered completion wait after image transfer and AD have been attempted. The two `XX` bytes must be equal; the observed values were `C7 C7` and `35 35`. Their meaning and any relationship to paper or completion are unknown. If this signal arrives while AD's write Promise is pending, it is only latched; the result is returned only after that Promise resolves. The shared thermal-sale facade handles every existing caller (NewSale, EditSale, DetailsSale and Sale list). Timeout-only completion retains **“Impresión no confirmada”** / **“Datos enviados; impresión no confirmada. Revise el papel antes de reintentar.”** When the observed AA-like shape closes the wait early, it shows **“Ciclo de impresión finalizado”** / **“Se detectó la señal de fin de ciclo. Revise que el recibo haya salido completo; la impresora no envió una confirmación validada.”** The latter signal remains unverified: neither alert asserts `printed`, a validated completion, printer acceptance, or receipt proof. These informational alerts do not alter sale contents, persistence or fiscal status. RawBT remains unchanged.

The existing AA deadline remains 50025ms from waiter enrollment (before the last data write); no timer is restarted or extended. The timeout path still distinguishes its own timer settlement from promise rejection and token cancellation: a caller/native error whose code also happens to be `timeout` is **not** this AA deadline. The early path matches only the canonical 10-byte structure above, including equal dynamic bytes and every fixed byte/length, only while the AA waiter is registered after all image writes resolve and AD has been attempted; if AD is pending, the candidate waits for its Promise to resolve. A mismatched pair, any other fixed-byte/length change, or other AA shape is ignored and follows the existing wait/error/timeout behavior. Arrival before AD attempt, before full image resolution or outside the completion wait is ignored. An earlier timeout while image/AD is incomplete, an AD failure/timeout (even after the signal was latched), image failure, cancellation, disconnect, invalid/nonzero AA payload or any other error remains an error. Neither observed malformed response is admitted by the strict parser or validates completion: `completionValidated` remains false and paper presence remains unknown. Strict framing, CRC and FF footer checks and the existing payload gate are unchanged; a valid existing strict empty/zero AA remains the only `printed` path. This outcome describes software writes sent but unconfirmed; paper may already exist, so inspect before retrying. The early path closes the wait only for a matching observed signal shape; absent that signal the existing AA timeout still elapses.

### Passive transfer telemetry in the same result

An earlier user attempt admitted observed-short8, entered transfer, returned a connection error and left the printer quiet. The old `imageTransferStarted` flag is set **before awaiting the first image write**; it cannot distinguish zero queued bytes from partial progress. These extra fields extend only the existing fixed-synthetic report. They do not correct transfer, add a probe, or change any command, wait, timeout, ACK/AA rule, MTU, chunk size or pacing.

| Field | Meaning and bound |
|---|---|
| `imageWriteAttempts` | Image-write calls actually attempted; integer 0–65535. Zero means no image-write call. The legacy start flag keeps its pre-await meaning. |
| `imageWritesResolved` | Original native image-write Promises successfully resolved while the session remained active; integer 0–65535. A first rejected/pending write has attempts 1 but resolved 0. |
| `imageBytesQueued` | Sum of lengths for those resolved image writes; integer 0–147456 (3072 × 48, including padding). Three resolved 48-byte writes followed by rejection report 144, not 0 or 192. No image bytes are copied into evidence. |
| `rawA9AckToFirstImageWriteMs` | Elapsed time from actual raw zero-ACK reception to the first image attempt; integer 0–120000 or `null` when either endpoint is absent. Zero is a measured same-clock-tick interval, not missing data. Strict streaming uses the callback completing the valid frame; observed-short8 uses the sole whole candidate's arrival, **not** its delayed deadline admission. An immediate observed8 response exposes the selected receive deferral (5000 ms normally, 500 ms in the fixed trial); delayed native request queueing can make data start later. No absolute timestamp is published. |
| `failureOrigin` | First observed failure source: `preflight`, `monitor`, `disconnect`, `image-write`, `control-write`, `timeout`, `cancelled`, `foreground`, `validation` or `session`; otherwise `null`. Preflight covers failures before an active session, validation covers rejected status/ACK/completion, and session is the remaining session-level fallback. |
| `nativeErrorCode` | Public BLE PLX numeric `errorCode` from that first cause, using the existing allowlist, or `null` when unavailable/unrecognized. Code 0 remains a valid numeric value. Never a native object, message, reason, stack or device identifier. Existing `errorCode` classification and thrown errors/cancellation precedence are unchanged. |

`printResult` can be `sent-unconfirmed` only under the full-image + resolved-AD conditions and either the AA-timeout condition or the observed unverified AA-shape condition above; it leaves `completionValidated: false`, `errorCode: null`, and `failureOrigin: null`, with `closingFailureScope: "aa-wait"` to explain the unconfirmed terminal bound. An AA timeout before the full-image/resolved-AD condition remains the existing `error` result. A `sent-unconfirmed` sale outcome is not stored as printed and must not be used as a printer-completion assertion.

**Resolved/queued means software queueing only, not peripheral receipt or paper proof.** It may coexist with a later connection/completion error. A failed first write remains attempts 1/resolved 0/bytes 0; a timeout or cancellation does not turn a still-pending native Promise into queue success. Late resolutions/callbacks cannot change finalized evidence or replace the first cause. Synchronous throws and rejected observer Promises remain noninterfering; publication follows existing cleanup.

Terminal command/image/completion failures are observed at the existing bounded rejection settlement, before the async catch resumes: an image timeout dispatched first remains `timeout`/`null` even if a monitor/disconnect event arrives in that gap. Native-first ordering retains its original source/public code. A1/A9 **reply** expiry is deliberately excluded because it can still admit short17/short8 compatibility; successful compatible prints retain both failure fields as `null`. The optional observer never replaces errors, adds an await/timer, or changes normal-print/diagnostic behavior. Correction-only rollback removes this optional `bounded` rejection observer and its session arguments plus the matching regression/doc additions, retaining all earlier telemetry and compatibility.

The baseline approximately 5000 ms ACK deferral has been observed on the owner's device, but firmware abandonment remains a hypothesis. The synthetic 500 ms receive-window experiment above remains separate from the shared connection correction below; neither establishes a physical diagnosis. The owner now has legible paper output, but physical AA/closing behavior remains unknown. After independent verification, the next step is the **same single user-triggered synthetic print WITH PAPER** above; stop and inspect before any manual retry. No standalone probe, new consent flow, persisted field, dependency or APK build is needed.

### Shared MXW01 connection: omit the native lifetime timeout

All shared MXW01 connections (sales, fixed synthetic, direct and A1-only) omit the native `timeout` property entirely while retaining `autoConnect: false`, `requestMTU: 185` and the **15000 ms JavaScript opening bound**. Read-only installed BLE PLX 3.1.2 source shows omission leaves the Android bridge's nullable timeout unset and skips the adapter's Rx timeout operator; a numeric timeout can remain active after successful connection and end the retained Observable after another silent interval. The connection Promise may already have succeeded, and the Android disconnect event reports a null error. No SDK/dependency/native code was modified; no Java/native execution is claimed by the source audit or JS lifetime model.

Foreground/cancellation and all existing GATT/job bounds, 3000 ms disconnect cleanup/destroy, normal A9 5000 ms versus fixed-synthetic 500 ms, strict AA, chunks/pacing/renderer and telemetry are unchanged. This removes one source hazard, **not proof that it caused the owner's drop or blank paper**. The owner reported paper movement but blank output with only 5760 queued bytes and no AA; actual connection elapsed time, peripheral receipt and Android pixels remain unknown. The earlier VM-prelude timeout was not raster evidence. After independent checks, reload current Metro in the existing APK and perform only **ONE user fixed-synthetic paper attempt**; stop and inspect before any retry. No ink/completion guarantee, extra build or automatic retry is added.

## Existing native baseline (unchanged by the diagnostic)

| Field | Existing value |
|---|---|
| SDK baseline | Expo `~49.0.15`, RN `^0.72.10`, no upgrades |
| Native library | Exact BLE PLX `3.1.2`; pinned README lists Expo 49 and RN 0.72.6 as tested |
| Expo plugin | `react-native-ble-plx`, foreground-only, `neverForLocation: true`, no iOS background modes |
| Android permissions | Plugin supplies Bluetooth scan/connect and legacy Bluetooth/location declarations. Runtime requests distinguish API 31+. Plugin-generated location declarations are limited to API 30. |
| EAS profile | `development`, development client, internal distribution, Android APK |
| Local bundler | `npm run dev:client` |

This diagnostic does not generate or compile native projects. Keep the existing development APK and update only its JavaScript through Metro. This WSL environment lacks Java/ADB/Android SDK/Gradle on PATH. Any future native/cloud rebuild needs separate authorization of the destination, operation and account/session. Do not use the generic `npm run build` for this diagnosis: it selects production, not the development profile. Do not run login, upload credentials, or start a cloud build as part of these checks.

## One synthetic physical test

- [ ] Confirm the saved profile and printer ID; use only the intended printer, with charged battery and paper.
- [ ] Print the Settings synthetic receipt **once**. Expected total is `$1.291,20`; check both line amounts, long customer/description wrapping, accents, orientation, right-aligned money, footer and feed. Adjust MXW01 text size (12–24 pixels) only after inspecting the paper.
- [ ] Record the Android/APK version, elapsed time and sanitized result locally. Share no device ID, customer data or profile/sale screenshots. Never call a JS mock a physical PASS.
- [ ] If completion is missing or cancellation/disconnection occurs, inspect paper before any manual retry. There is no automatic retransmission and a partial/complete paper receipt may already exist.
- [ ] Verify an existing online sale, an offline/provided sale and the unchanged A4/PDF flow separately before release. This requires authorized app/backend use; it was not executed here.
- [ ] Switch to RawBT, save, and confirm the older printer still receives the intended ESC/POS receipt. Never switch profiles automatically following a native error.

## Review and limits

Review the work as three behavior units (no commits were made): profile/facade preservation, original raster/protocol/foreground BLE, and development configuration with tests/docs. Tests belong with their behavior, and each unit should retain its rollback boundary.

| Boundary | Behavior |
|---|---|
| Facade | All existing thermal callers retain `printSaleTicket({ mode, saleId, provided })`; online fetch semantics and sale normalization are unchanged. Android-only. RawBT retains its legacy `printed` meaning: URL handoff, not a hardware acknowledgment. |
| Settings | Same `@golozur_ticket_config` key, existing typography/feed/cut/encoding retained. Partial writes merge stored values; unknown/corrupt profiles block printing instead of choosing a different printer. |
| Renderer | Mounted once in `App.js`; no Web Bluetooth. Original measured layout with generic `sans-serif`, complete amounts and total, wrapped descriptions/customer, subtotal/adjustment when needed, and existing footer. No upstream fonts/assets. Navigation/file access blocked, CSP denies network/subresources; bridge data escaped, dimensions/messages/timeouts validated; canvas cleared after use. |
| Bounds | 384 dots, at most 3072 rows/100 items/2000 characters per text block, 128 KB input, bounded packed bridge output. Overlong receipts fail rather than silently truncate. Font sizes are reference pixels, not physically calibrated browser typography. |
| BLE | Up to 10-second manual discovery, 8 named candidates, 15-second connection bound, actual negotiated MTU minus ATT overhead, sequential writes capped at 48 bytes with 25 ms pacing, 120-second transfer budget, bounded status/ack/completion. One BLE operation and one facade print job at a time. Leaving foreground/cancel aborts and releases resources. |
| Protocol | AE30 (AF30 allowed as a community alternate), AE01 control, AE02 notify, AE03 raster. Original MSB CRC8 polynomial `0x07`, initial 0; framed commands; LSB-first monochrome; 180-degree actual-image rotation then minimum 90-row padding. A9 requests the actual height and requires a zero acknowledgment. Waits are registered before writes, including completion before the last raster write/flush. |
| Fail closed | Global strict framing/CRC unchanged; only sole observed17 A1 and observed8 zero A9 candidates have labeled unverified window-end resolution. A1 semantics/paper unknown remain. Strict AA validation still exclusively authorizes `printed`; the observed 10-byte AA-like shape can only yield `sent-unconfirmed` after fully resolved image+AD writes. Other invalid AA payloads remain errors, and absent/unrecognized completion remains unconfirmed only under the documented full-send rules. The owner supplied legible synthetic-ticket paper output, but the AA wire meaning remains unknown. |

Community documentation is incomplete and internally inconsistent: it calls the CRC Dallas-Maxim despite specifying non-reflected polynomial `0x07`, omits CRC in one notification table, and leaves AA payload meaning unknown. The Windows community whole-packet A1 field offsets inform only the bounded observed variant; no upstream program/source/assets were imported. Other CRC-less shapes, unknown status layouts/firmware, pacing, Android permissions and orientation may still fail safely. CCCD setup has no ready promise in BLE PLX; the existing setup delay is unchanged, with no retry if notifications are missed.

Android permission dialogs may use a temporary Activity: foreground cancellation starts only after the permission request, before rendering/connecting/scanning. No BLE runs while awaiting permissions. If the app has not resumed, the operation fails rather than continuing in the background. Permission timeout/cancellation cannot dismiss the system dialog, but late permission results cannot start an abandoned job.

## Original implementation and dependency licenses

- Wire-format reference only: [catprinter PROTOCOL.md](https://github.com/dropalltables/catprinter/blob/main/PROTOCOL.md) (community, explicitly incomplete), plus the browser-device result reported by the user. No catprinter program source, fonts, assets or CRC lookup tables were imported. Its AGPL-3.0 license does not authorize copying its implementation into this UNLICENSED app; this change does not change the app license.
- Library reference: [BLE PLX 3.1.2 README](https://github.com/dotintent/react-native-ble-plx/blob/3.1.2/README.md), [pinned plugin](https://github.com/dotintent/react-native-ble-plx/tree/3.1.2/plugin), and current official BLE PLX docs consulted through Context7.
- **License discrepancy:** npm/package metadata declares MIT, but the pinned dependency's shipped `LICENSE` contains Apache-2.0, copyright 2016 Polidea / 2021 intent. Both are permissive; conservatively retain the shipped Apache-2.0 license and applicable notices. The existing [notice companion](third-party-notices.md) provides the owner the exact shipped license; APK notice delivery and transitive obligations still need review before broader distribution.
- [Expo development-build FAQ](https://docs.expo.dev/develop/development-builds/faq) explains why a rebuilt APK is required. Existing WebView `13.2.2` and `buffer` are reused; the only added public dependency is exact BLE PLX `3.1.2`.

## Local verification (no build or hardware)

```sh
node --test tests/thermal-printing.test.cjs
node scripts/check-thermal-printing.cjs
npm ls react-native-ble-plx expo-dev-client --depth=0
git diff --check
```

These are new focused tools, not a pre-existing CI/lint/test pipeline. The syntax/config checker substitutes an empty environment and no-op dotenv import, examines only feature-relevant configuration, and never prints Expo extras. Canvas and BLE tests use deterministic mocks and do not prove Android WebView behavior, native compilation or paper output.

## Rollback boundary

Operational rollback: select **RawBT** in Settings and save. It retains all legacy ticket settings and does not require BLE initialization. Selecting MXW01 never automatically falls back to RawBT.

Closing-evidence-only rollback: remove the added closing fields/classifications/retention/window markers in `mxw01A9Evidence.js`, raw wait-at-arrival/parsed-AA/AD queue and scoped rejection observations in `mxw01Session.js`, and only the matching tests/docs. Restore the previous A9-only sampling/projection. Preserve all transport bytes/timing/AA enrollment/strict validation, earlier A9 experiment/transfer telemetry/first-cause correction/native-timeout omission, existing UI/facade and unrelated work; do not delete/reset files.

Connection-option-only rollback: restore only `timeout: 12000` in `mxw01Ble.js`'s connection options and remove the matching inline explanation/tests/doc addition. Keep the outer 15000 ms/token/label, all prior A9 experiment/telemetry/correction, cleanup, UI/fixture and unrelated work. This would reintroduce the modeled lifetime hazard; no stored setting or native migration exists. Do not reset/delete files.

500-ms-trial-only rollback: remove the private synthetic 500 ms argument in `printSaleTicket.js`, its optional adapter/session `a9ReceiveMs` plumbing and matching tests/doc changes; restore A9 receive/wait/evidence budget to `responseMs` (5000 ms by default). Keep all earlier telemetry and first-terminal-cause correction, A1/observed8 compatibility, strict AA, unchanged synthetic fixture/UI, normal paths and unrelated dirty work. No persisted value or native migration exists; do not reset/delete entire files.

Diagnostic-only rollback: remove the A1 Settings entry/imports, the status-only/raw-monitor adapter additions and `mxw01Diagnostic.js`, together with their focused tests/checker/doc additions. Retain the strict printing parser/session, original renderer/facade, saved configuration and every unrelated dirty file. This work adds no stored diagnostic key or persistent Connected state.

Passive-A9-only rollback: remove the optional observer/report seams, fixed-fixture capture entry and corresponding Settings selectable result/imports, `mxw01A9Evidence.js`, focused tests/checker/doc additions. Keep A1 compatibility, all strict A9/AA gates, RawBT, timing/pacing and unrelated work. No stored/debug flag needs migration.

Observed-A9-only rollback: remove only short8 parser/receiver enrollment/fallback and related evidence variant/docs/tests additions; restore strict-only A9 enrollment without touching A1, canonical validation, passive capture, outgoing bytes, AA or user data. No stored setting/debug flag or new native build is involved.

Transfer-telemetry-only rollback: remove the six additional projected/formatted fields and private timing/cause/progress collector additions in `mxw01A9Evidence.js`, the optional cause/raw-ACK/original-write-Promise observations in `mxw01Session.js` and `mxw01Ble.js`, and only their tests/documentation. Restore the earlier single pre-await `imageStarted` observation. Keep the existing synthetic entry/selectable result, passive A9 capture bounds, A1 and observed8 compatibility, strict AA, original errors/cancellation, RawBT, native configuration and every unrelated dirty file. No stored flag or migration is involved; do not reset or delete entire files.

Source rollback: remove only this change's additions to `App.js`, `app.config.js`, `eas.json`, dependency/lock entries and `dev:client`, restore the pre-task printing facade/profile additions, and remove the new renderer/BLE/protocol/job/tests/checker/doc files. **Do not reset the repository or overwrite the pre-existing dirty Settings/ticketConfig/thermal files.** Preserve unrelated NavigationStack, Home, client and earlier thermal typography changes; the two thermal EOF fixes are whitespace-only. Existing storage keys and API/auth contracts must remain intact.
