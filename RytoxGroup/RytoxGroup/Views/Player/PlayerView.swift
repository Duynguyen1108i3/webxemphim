//
//  PlayerView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Full-screen video player container matching CinematicPlayerOverlay.tsx
//

import SwiftUI

public struct PlayerView: View {
    public let movie: NormalizedMovie
    public let episodeId: String?
    
    @ObservedObject private var playback = PlaybackManager.shared
    
    public init(movie: NormalizedMovie, episodeId: String? = nil) {
        self.movie = movie
        self.episodeId = episodeId
    }
    
    public var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            if playback.isPreparingPlayback {
                LoadingSpinnerView(message: "Đang kết nối luồng phát...")
            } else if let source = playback.activePlaybackSource {
                if source.isDirectHls, let stream = source.streamUrl {
                    NativeHLSPlayer(
                        streamUrl: stream,
                        movie: movie,
                        episodeId: episodeId,
                        serverName: source.serverName,
                        onClose: {
                            playback.closePlayback()
                        }
                    )
                } else if let embed = source.embedUrl {
                    EmbedPlayerView(
                        embedUrl: embed,
                        onClose: {
                            playback.closePlayback()
                        }
                    )
                } else {
                    errorView("Không tìm thấy luồng phát hợp lệ.")
                }
            } else {
                errorView("Không thể tải nguồn phát của phim này.")
            }
        }
    }
    
    private func errorView(_ msg: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 44))
                .foregroundColor(Color.appGold)
            
            Text(msg)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            
            Button("Quay Lại") {
                playback.closePlayback()
            }
            .buttonStyle(GlassButtonStyle(cornerRadius: 12))
        }
    }
}
