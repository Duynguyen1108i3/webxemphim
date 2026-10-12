//
//  PlayerControlsOverlay.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Glass player controls with scrubber and auto-hide timer
//

import SwiftUI

public struct PlayerControlsOverlay: View {
    public let title: String
    public let serverName: String
    public let isPlaying: Bool
    public let currentTime: Double
    public let duration: Double
    public var onPlayPause: () -> Void
    public var onSeek: (Double) -> Void
    public var onSkip: (Double) -> Void
    public var onClose: () -> Void
    
    @State private var isScrubbing = false
    @State private var scrubTime: Double = 0
    
    public init(
        title: String,
        serverName: String,
        isPlaying: Bool,
        currentTime: Double,
        duration: Double,
        onPlayPause: @escaping () -> Void,
        onSeek: @escaping (Double) -> Void,
        onSkip: @escaping (Double) -> Void,
        onClose: @escaping () -> Void
    ) {
        self.title = title
        self.serverName = serverName
        self.isPlaying = isPlaying
        self.currentTime = currentTime
        self.duration = duration
        self.onPlayPause = onPlayPause
        self.onSeek = onSeek
        self.onSkip = onSkip
        self.onClose = onClose
    }
    
    public var body: some View {
        ZStack {
            // Dark vignette overlay
            Color.black.opacity(0.45)
                .ignoresSafeArea()
            
            VStack {
                // Top Header Bar
                HStack(spacing: 16) {
                    Button(action: {
                        HapticFeedback.light()
                        onClose()
                    }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 40, height: 40)
                            .liquidGlassPill()
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .lineLimit(1)
                        
                        Text(serverName)
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                
                Spacer()
                
                // Center Transport Controls
                HStack(spacing: 48) {
                    // Rewind 10s
                    Button(action: {
                        HapticFeedback.light()
                        onSkip(-10)
                    }) {
                        Image(systemName: "gobackward.10")
                            .font(.system(size: 28, weight: .medium))
                            .foregroundColor(.white)
                            .frame(width: 52, height: 52)
                            .liquidGlassPill()
                    }
                    
                    // Play / Pause
                    Button(action: {
                        HapticFeedback.medium()
                        onPlayPause()
                    }) {
                        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 72, height: 72)
                            .background(
                                Circle()
                                    .fill(Color.appEmber)
                            )
                            .overlay(Circle().strokeBorder(Color.white.opacity(0.3), lineWidth: 1.5))
                            .shadow(color: Color.appEmber.opacity(0.6), radius: 16, x: 0, y: 4)
                    }
                    
                    // Forward 10s
                    Button(action: {
                        HapticFeedback.light()
                        onSkip(10)
                    }) {
                        Image(systemName: "goforward.10")
                            .font(.system(size: 28, weight: .medium))
                            .foregroundColor(.white)
                            .frame(width: 52, height: 52)
                            .liquidGlassPill()
                    }
                }
                
                Spacer()
                
                // Bottom Scrubber Bar
                VStack(spacing: 8) {
                    // Slider
                    Slider(
                        value: Binding(
                            get: { isScrubbing ? scrubTime : currentTime },
                            set: { newValue in
                                isScrubbing = true
                                scrubTime = newValue
                            }
                        ),
                        in: 0...max(1.0, duration)
                    ) { editing in
                        if !editing {
                            onSeek(scrubTime)
                            isScrubbing = false
                        }
                    }
                    .tint(Color.appEmber)
                    
                    // Time Labels
                    HStack {
                        Text(Formatters.formatPlaybackTime(isScrubbing ? scrubTime : currentTime))
                            .font(.system(size: 12, weight: .medium, design: .monospaced))
                            .foregroundColor(.white.opacity(0.8))
                        
                        Spacer()
                        
                        Text(Formatters.formatPlaybackTime(duration))
                            .font(.system(size: 12, weight: .medium, design: .monospaced))
                            .foregroundColor(.white.opacity(0.5))
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
        }
    }
}
