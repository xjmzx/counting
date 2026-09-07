// Capture one clip on macOS, in the format clips/ uses: 22 kHz mono WAV.
//
//   swift tools/record-macos.swift <out.wav> [maxSeconds]
//
// Stops on a line arriving at stdin, or when maxSeconds elapses. AVFoundation
// rather than sox or ffmpeg because `swift` is already required here — the ICU
// cross-check runs through it — so recording adds no dependency at all.
//
// The first run raises a microphone permission prompt against the terminal
// application, not this script. Denying it produces a silent file rather than
// an error, which the caller checks for.
import AVFoundation
import Foundation

let args = CommandLine.arguments
guard args.count >= 2 else {
    FileHandle.standardError.write("usage: record-macos.swift <out.wav> [maxSeconds]\n".data(using: .utf8)!)
    exit(2)
}
let out = URL(fileURLWithPath: args[1])
let maxSeconds = args.count >= 3 ? Double(args[2]) ?? 30 : 30

let settings: [String: Any] = [
    AVFormatIDKey: Int(kAudioFormatLinearPCM),
    AVSampleRateKey: 22050.0,
    AVNumberOfChannelsKey: 1,
    AVLinearPCMBitDepthKey: 16,
    AVLinearPCMIsFloatKey: false,
    AVLinearPCMIsBigEndianKey: false,
]

guard let recorder = try? AVAudioRecorder(url: out, settings: settings) else {
    FileHandle.standardError.write("could not open the microphone\n".data(using: .utf8)!)
    exit(1)
}
recorder.prepareToRecord()
guard recorder.record() else {
    FileHandle.standardError.write("recording refused to start\n".data(using: .utf8)!)
    exit(1)
}

// Stop on whichever comes first: a line on stdin, or the ceiling.
let stopper = DispatchQueue(label: "stdin")
var stopped = false
let lock = NSLock()
func finish() {
    lock.lock(); defer { lock.unlock() }
    if stopped { return }
    stopped = true
    recorder.stop()
    exit(0)
}
stopper.async {
    // An actual line stops it. EOF does *not*: stdin being closed or not a
    // terminal is not the user saying "done", and treating it as such records
    // zero frames and writes a valid, empty WAV — a silent failure that looks
    // like a successful take.
    if readLine() != nil {
        finish()
    }
}
DispatchQueue.global().asyncAfter(deadline: .now() + maxSeconds) { finish() }
dispatchMain()
