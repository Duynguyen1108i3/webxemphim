//
//  NativeHLSPlayer.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  AVPlayer wrapper for direct HLS .m3u8 streaming & watch progress heartbeat
//

import SwiftUI
import AVKit

public struct NativeHLSPlayer: View {
    public let streamUrl: String
    public let movie: NormalizedMovie
    public let episodeId: String?
    public let serverName: String
    public var onClose: () -> Void
    
    @State private var player: AVPlayer?
    @State private var isPlaying = true
    @State private var currentTime: Double = 0
    @State private var duration: Double = 0
    @State private var showControls = true
    @State private var controlsTimer: Task<Void, Never>?
    @State private var lastReportedSecond: Int = 0
    
    @ObservedObject private var playback = PlaybackManager.shared
    
    public init(
        streamUrl: String,
        movie: NormalizedMovie,
        episodeId: String? = nil,
        serverName: String = "Direct HLS",
        onClose: @escaping () -> Void
    ) {
        self.streamUrl = streamUrl
        self.movie = movie
        self.episodeId = episodeId
        self.serverName = serverName
        self.onClose = onClose
    }
    
    public var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            // Video Player Layer
            if let p = player {
                CustomVideoPlayer(player: p)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            showControls.toggle()
                        }
                        if showControls {
                            resetControlsTimer()
                        }
                    }
            } else {
                ProgressView().tint(.white)
            }
            
            // Controls Overlay
            if showControls {
                PlayerControlsOverlay(
                    title: movie.name,
                    serverName: serverName,
                    isPlaying: isPlaying,
                    currentTime: currentTime,
                    duration: duration,
                    onPlayPause: togglePlayPause,
                    onSeek: seekTo,
                    onSkip: skipSeconds,
                    onClose: {
                        cleanup()
                        onClose()
                    }
                )
                .transition(.opacity)
            }
        }
        .onAppear {
            setupPlayer()
            resetControlsTimer()
        }
        .onDisappear {
            cleanup()
        }
    }
    
    private func setupPlayer() {
        guard let url = URL(string: streamUrl) else { return }
        let p = AVPlayer(url: url)
        self.player = p
        p.play()
        self.isPlaying = true
        
        // Restore progress if available
        if let saved = playback.watchHistory[movie.id], saved.progressSeconds > 0 {
            let target = CMTime(seconds: Double(saved.progressSeconds), preferredTimescale: 1)
            p.seek(to: target)
        }
        
        // Time Observer
        let interval = CMTime(seconds: 0.5, preferredTimescale: 600)
        p.addPeriodicTimeObserver(forInterval: interval, queue: .main) { time in
            self.currentTime = time.seconds
            if let currentItem = p.currentItem {
                let d = currentItem.duration.seconds
                if !d.isNaN && !d.isInfinite {
                    self.duration = d
                }
            }
            
            // Heartbeat progress reporting every 10 seconds
            let curSec = Int(time.seconds)
            if curSec > 0 && curSec - lastReportedSecond >= 10 {
                lastReportedSecond = curSec
                playback.updateProgress(
                    movie: movie,
                    episodeId: episodeId ?? "",
                    progressSeconds: curSec,
                    durationSeconds: Int(duration)
                )
            }
        }
    }
    
    private func togglePlayPause() {
        guard let p = player else { return }
        if isPlaying {
            p.pause()
            isPlaying = false
        } else {
            p.play()
            isPlaying = true
        }
        resetControlsTimer()
    }
    
    private func seekTo(_ seconds: Double) {
        guard let p = player else { return }
        let target = CMTime(seconds: seconds, preferredTimescale: 600)
        p.seek(to: target)
        resetControlsTimer()
    }
    
    private func skipSeconds(_ delta: Double) {
        guard let p = player else { return }
        let newTime = max(0, min(duration, currentTime + delta))
        seekTo(newTime)
    }
    
    private func resetControlsTimer() {
        controlsTimer?.cancel()
        controlsTimer = Task {
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            if !Task.isCancelled && isPlaying {
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        self.showControls = false
                    }
                }
            }
        }
    }
    
    private func cleanup() {
        controlsTimer?.cancel()
        player?.pause()
        player = nil
    }
}

private struct CustomVideoPlayer: UIViewControllerRepresentable {
    let player: AVPlayer
    
    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        controller.player = player
        controller.showsPlaybackControls = false
        controller.videoGravity = .resizeAspect
        return controller
    }
    
    func updateUIViewController(_ uiViewController: AVPlayerViewController, context: Context) {
        uiViewController.player = player
    }
}
