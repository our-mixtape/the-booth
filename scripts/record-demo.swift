// macOS 14+: selected-window video + ScreenCaptureKit system audio; no microphone.
// Build: swiftc -module-cache-path /tmp/booth-swift-module-cache -parse-as-library scripts/record-demo.swift -o /tmp/booth-record-demo
// List:  /tmp/booth-record-demo list --app Codex
// Record: /tmp/booth-record-demo record --window 123 --output /tmp/booth-demo.mp4 --duration 60
// Screen & System Audio Recording permission is required for the launching app.
// Capture only a prepared demo window; close private tabs and silence other apps.
// This file never reads an app audio bus, requests microphone access, or uploads media.

import Foundation
import AppKit
import ScreenCaptureKit
import AVFoundation
import CoreMedia
import CoreGraphics

struct RecorderError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
    init(_ message: String) { self.message = message }
}

// A callback gate avoids an async task group waiting forever for an uncancellable
// ScreenCaptureKit permission/enumeration call after the timeout has fired.
@available(macOS 14.0, *)
final class ContentResult: @unchecked Sendable {
    private let lock = NSLock()
    private var continuation: CheckedContinuation<SCShareableContent, Error>?

    init(_ continuation: CheckedContinuation<SCShareableContent, Error>) {
        self.continuation = continuation
    }

    func resolve(_ result: Result<SCShareableContent, Error>) {
        lock.lock()
        let pending = continuation
        continuation = nil
        lock.unlock()
        pending?.resume(with: result)
    }
}

@available(macOS 14.0, *)
final class Recorder: NSObject, SCStreamOutput, SCStreamDelegate, @unchecked Sendable {
    let queue = DispatchQueue(label: "org.ourmixtape.booth.demo-capture")
    let writer: AVAssetWriter
    let video: AVAssetWriterInput
    let audio: AVAssetWriterInput
    private var firstTime: CMTime?
    private var lastVideo: CMSampleBuffer?
    private var endTime = CMTime.zero
    private var failure: String?
    private var videoFrames = 0
    private var audioBuffers = 0
    private var droppedVideo = 0
    private var droppedAudio = 0
    private var sumSquares: Double = 0
    private var peak: Float = 0
    private var meteredSamples = 0

    init(output: URL, width: Int, height: Int) throws {
        writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
        video = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: width, AVVideoHeightKey: height,
            AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 8_000_000]
        ])
        audio = AVAssetWriterInput(mediaType: .audio, outputSettings: [
            AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 48_000,
            AVNumberOfChannelsKey: 2, AVEncoderBitRateKey: 192_000
        ])
        super.init()
        video.expectsMediaDataInRealTime = true
        audio.expectsMediaDataInRealTime = true
        guard writer.canAdd(video), writer.canAdd(audio) else {
            throw RecorderError("H.264/AAC encoding is unavailable.")
        }
        writer.add(video)
        writer.add(audio)
        guard writer.startWriting() else {
            throw writer.error ?? RecorderError("Could not start the movie writer.")
        }
    }

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        queue.async { self.failure = error.localizedDescription }
    }

    func stream(_ stream: SCStream, didOutputSampleBuffer sample: CMSampleBuffer,
                of type: SCStreamOutputType) {
        guard sample.isValid, CMSampleBufferDataIsReady(sample), failure == nil else { return }
        let time = sample.presentationTimeStamp
        guard time.isValid else { return }
        switch type {
        case .screen:
            guard let attachments = CMSampleBufferGetSampleAttachmentsArray(sample, createIfNecessary: false)
                    as? [[SCStreamFrameInfo: Any]],
                  let status = attachments.first?[.status] as? Int,
                  status == SCFrameStatus.complete.rawValue,
                  sample.imageBuffer != nil else { return }
            if firstTime == nil {
                firstTime = time
                writer.startSession(atSourceTime: time)
            }
            guard video.isReadyForMoreMediaData else { droppedVideo += 1; return }
            if video.append(sample) {
                videoFrames += 1
                lastVideo = sample
                endTime = CMTimeMaximum(endTime, time + CMTime(value: 1, timescale: 30))
            } else { failure = writer.error?.localizedDescription ?? "Video append failed." }
        case .audio:
            // Discard any audio before the first complete frame to preserve one common clock.
            guard let firstTime, time >= firstTime else { return }
            guard audio.isReadyForMoreMediaData else { droppedAudio += 1; return }
            if audio.append(sample) {
                audioBuffers += 1
                let duration = sample.duration.isNumeric ? sample.duration : .zero
                endTime = CMTimeMaximum(endTime, time + duration)
                meter(sample)
            } else { failure = writer.error?.localizedDescription ?? "System audio append failed." }
        default: break // No microphone output is registered.
        }
    }

    private func meter(_ sample: CMSampleBuffer) {
        guard let format = sample.formatDescription,
              let asbd = CMAudioFormatDescriptionGetStreamBasicDescription(format)?.pointee,
              asbd.mFormatID == kAudioFormatLinearPCM, asbd.mBitsPerChannel == 32,
              asbd.mFormatFlags & kAudioFormatFlagIsFloat != 0,
              asbd.mFormatFlags & kAudioFormatFlagIsBigEndian == 0,
              let block = sample.dataBuffer, block.dataLength >= MemoryLayout<Float>.size else { return }
        var values = [Float](repeating: 0, count: block.dataLength / MemoryLayout<Float>.size)
        let result = values.withUnsafeMutableBytes {
            CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: $0.count, destination: $0.baseAddress!)
        }
        guard result == kCMBlockBufferNoErr else { return }
        for value in values where value.isFinite {
            peak = max(peak, abs(value))
            sumSquares += Double(value) * Double(value)
            meteredSamples += 1
        }
    }

    func currentFailure() -> String? { queue.sync { failure } }

    func finish() async throws -> [String: Any] {
        // stopCapture has returned; drain queued samples before finalizing the writer.
        let stats: [String: Any] = try queue.sync {
            if let failure { writer.cancelWriting(); throw RecorderError(failure) }
            guard let firstTime, let lastVideo, videoFrames > 0 else {
                writer.cancelWriting()
                throw RecorderError("No complete video frames were captured. Check screen recording permission.")
            }
            // Hold the last image through the final audio timestamp if the window stopped changing.
            let finalFrameTime = endTime - CMTime(value: 1, timescale: 30)
            if finalFrameTime > lastVideo.presentationTimeStamp, video.isReadyForMoreMediaData {
                var timing = CMSampleTimingInfo(duration: CMTime(value: 1, timescale: 30),
                                               presentationTimeStamp: finalFrameTime, decodeTimeStamp: .invalid)
                var tail: CMSampleBuffer?
                if CMSampleBufferCreateCopyWithNewTiming(allocator: kCFAllocatorDefault,
                        sampleBuffer: lastVideo, sampleTimingEntryCount: 1,
                        sampleTimingArray: &timing, sampleBufferOut: &tail) == noErr, let tail {
                    guard video.append(tail) else {
                        throw writer.error ?? RecorderError("Could not append the final frame.")
                    }
                }
            }
            writer.endSession(atSourceTime: endTime)
            video.markAsFinished()
            audio.markAsFinished()
            let rms = meteredSamples > 0 ? sqrt(sumSquares / Double(meteredSamples)) : 0
            return ["durationSeconds": (endTime - firstTime).seconds,
                    "videoFrames": videoFrames, "systemAudioBuffers": audioBuffers,
                    "droppedVideoFrames": droppedVideo, "droppedAudioBuffers": droppedAudio,
                    "meteredSystemAudioSamples": meteredSamples,
                    "systemAudioPeakDBFS": peak > 0 ? 20 * log10(Double(peak)) : -120,
                    "systemAudioRmsDBFS": rms > 0 ? 20 * log10(rms) : -120,
                    "nonSilentSystemAudio": peak > 0.00001,
                    "microphoneCaptured": false]
        }
        await writer.finishWriting()
        guard writer.status == .completed else {
            throw writer.error ?? RecorderError("Movie finalization failed.")
        }
        return stats
    }
}

@main
@MainActor
struct RecordDemo {
    static let usage = """
    Booth demo recorder (macOS 14+, ScreenCaptureKit; microphone is disabled)
      booth-record-demo list [--app Codex] [--titles]
      booth-record-demo record --window ID --output /absolute/path.mp4 [--duration 60]
    Requires Screen & System Audio Recording permission for the launching app.
    Existing files are never overwritten. Duration must be 1–300 seconds.
    Recording writes MP4 and an adjacent .capture.json with system audio signal metrics.
    Audition the MP4 before sharing; signal metrics alone do not verify musical content.
    """

    static func main() async {
        do {
            guard #available(macOS 14.0, *) else { throw RecorderError("macOS 14 or later is required.") }
            try await run()
        } catch {
            FileHandle.standardError.write(Data("Recorder: \(error.localizedDescription)\n".utf8))
            exit(1)
        }
    }

    @available(macOS 14.0, *)
    static func capturableContent() async throws -> SCShareableContent {
        guard CGPreflightScreenCaptureAccess() else {
            throw RecorderError("Screen & System Audio Recording permission is unavailable for this launching app. " +
                "No capture or permission request was started. Check System Settings → Privacy & Security → Screen & System Audio Recording.")
        }
        // A command-line Swift process has no NSApplication bootstrap. Initialize
        // its WindowServer connection on the main actor before creating filters;
        // otherwise SCContentFilter can assert CGS_REQUIRE_INIT at recording time.
        NSApplication.shared.setActivationPolicy(.prohibited)
        return try await withCheckedThrowingContinuation { continuation in
            let result = ContentResult(continuation)
            DispatchQueue.global().asyncAfter(deadline: .now() + 10) {
                result.resolve(.failure(RecorderError("Capturable-window enumeration timed out after 10 seconds; no recording started.")))
            }
            SCShareableContent.getExcludingDesktopWindows(true, onScreenWindowsOnly: true) { content, error in
                if let error { result.resolve(.failure(error)) }
                else if let content { result.resolve(.success(content)) }
                else { result.resolve(.failure(RecorderError("ScreenCaptureKit returned no capturable content."))) }
            }
        }
    }

    @available(macOS 14.0, *)
    static func run() async throws {
        let args = Array(CommandLine.arguments.dropFirst())
        guard let command = args.first, !["help", "--help", "-h"].contains(command) else {
            print(usage); return
        }
        guard ["list", "record"].contains(command) else { throw RecorderError(usage) }
        var options: [String: String] = [:]
        var titles = false
        var index = 1
        while index < args.count {
            let name = args[index]
            if name == "--titles", command == "list" { titles = true; index += 1; continue }
            let allowed = command == "list" ? ["--app"] : ["--window", "--output", "--duration"]
            guard allowed.contains(name), index + 1 < args.count, options[name] == nil else {
                throw RecorderError("Invalid or repeated option: \(name)\n\(usage)")
            }
            options[name] = args[index + 1]
            index += 2
        }
        // Listing includes no titles unless explicitly requested and is capped at 100 windows.
        let content: SCShareableContent
        do { content = try await capturableContent() }
        catch {
            throw RecorderError("Cannot enumerate capturable windows: \(error.localizedDescription)")
        }
        let windows = content.windows.filter { $0.windowLayer == 0 && $0.frame.width > 1 && $0.frame.height > 1 }
        if command == "list" {
            for window in windows.filter({ window in
                guard let app = options["--app"] else { return true }
                return window.owningApplication?.applicationName.localizedCaseInsensitiveContains(app) == true
            }).sorted(by: { $0.windowID < $1.windowID }).prefix(100) {
                let app = window.owningApplication?.applicationName ?? "Unknown"
                let title = titles ? "\t" + String((window.title ?? "").prefix(100)).replacingOccurrences(of: "\n", with: " ") : ""
                print("\(window.windowID)\t\(app)\(title)")
            }
            return
        }
        guard let id = options["--window"].flatMap(UInt32.init),
              let window = windows.first(where: { $0.windowID == id }) else {
            throw RecorderError("An explicit, currently capturable --window ID is required; run list first.")
        }
        guard let path = options["--output"], path.hasPrefix("/"), path.lowercased().hasSuffix(".mp4") else {
            throw RecorderError("--output must be an absolute .mp4 path.")
        }
        let duration = options["--duration"].flatMap(Double.init) ?? (options["--duration"] == nil ? 60 : 0)
        guard duration.isFinite, (1...300).contains(duration) else { throw RecorderError("Duration must be 1–300 seconds.") }
        let output = URL(fileURLWithPath: path)
        let evidence = output.appendingPathExtension("capture.json")
        guard !FileManager.default.fileExists(atPath: path),
              !FileManager.default.fileExists(atPath: evidence.path) else {
            throw RecorderError("Output or evidence file already exists; choose a new path.")
        }
        let filter = SCContentFilter(desktopIndependentWindow: window)
        let scale = min(Double(filter.pointPixelScale), 1920 / Double(window.frame.width), 1080 / Double(window.frame.height))
        let config = SCStreamConfiguration()
        config.width = max(2, Int(window.frame.width * scale) / 2 * 2)
        config.height = max(2, Int(window.frame.height * scale) / 2 * 2)
        config.minimumFrameInterval = CMTime(value: 1, timescale: 30)
        config.queueDepth = 6
        config.pixelFormat = kCVPixelFormatType_32BGRA
        config.showsCursor = true
        config.scalesToFit = true
        config.ignoreShadowsSingleWindow = true
        config.capturesAudio = true
        config.sampleRate = 48_000
        config.channelCount = 2
        config.excludesCurrentProcessAudio = true // Exclude this recorder, not the selected app.
        if #available(macOS 15.0, *) { config.captureMicrophone = false }
        let recorder = try Recorder(output: output, width: config.width, height: config.height)
        let stream = SCStream(filter: filter, configuration: config, delegate: recorder)
        try stream.addStreamOutput(recorder, type: .screen, sampleHandlerQueue: recorder.queue)
        try stream.addStreamOutput(recorder, type: .audio, sampleHandlerQueue: recorder.queue)
        try await stream.startCapture()
        print("Recording window \(id) for \(duration)s with system audio; microphone disabled.")
        fflush(stdout)
        let deadline = ProcessInfo.processInfo.systemUptime + duration
        while ProcessInfo.processInfo.systemUptime < deadline, recorder.currentFailure() == nil {
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        try await stream.stopCapture()
        var stats = try await recorder.finish()
        stats["output"] = output.path
        stats["windowID"] = id
        stats["audioSource"] = "ScreenCaptureKit system output (content-filter scoped), AAC stereo 48 kHz"
        stats["recordedAt"] = ISO8601DateFormatter().string(from: Date())
        let json = try JSONSerialization.data(withJSONObject: stats, options: [.prettyPrinted, .sortedKeys])
        try json.write(to: evidence, options: .atomic)
        print(String(decoding: json, as: UTF8.self))
        if stats["nonSilentSystemAudio"] as? Bool != true {
            throw RecorderError("Movie saved, but non-silent system audio was NOT verified. See \(evidence.path).")
        }
    }
}
