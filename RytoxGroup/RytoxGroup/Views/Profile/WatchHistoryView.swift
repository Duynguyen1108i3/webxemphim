//
//  WatchHistoryView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Watch history list with progress bar and resume playback button
//

import SwiftUI

public struct WatchHistoryView: View {
    @ObservedObject private var playback = PlaybackManager.shared
    
    public init() {}
    
    private var historyItems: [WatchHistoryItem] {
        Array(playback.watchHistory.values).sorted(by: { $0.lastWatchedAt > $1.lastWatchedAt })
    }
    
    public var body: some View {
        Group {
            if historyItems.isEmpty {
                VStack(spacing: 12) {
                    Spacer().frame(height: 40)
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: 44, weight: .light))
                        .foregroundColor(.white.opacity(0.3))
                    Text("Chưa có lịch sử xem phim")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.white.opacity(0.55))
                }
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(historyItems) { item in
                        HStack(spacing: 14) {
                            AsyncPosterImage(urlString: item.moviePoster, cornerRadius: 8)
                                .frame(width: 60, height: 90)
                            
                            VStack(alignment: .leading, spacing: 6) {
                                Text(item.movieTitle ?? "Phim")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                                
                                Text(item.completed ? "Đã xem xong" : "Đang xem dở")
                                    .font(.system(size: 12))
                                    .foregroundColor(item.completed ? Color(hex: "22c55e") : Color.appGold)
                                
                                // Progress Bar
                                GeometryReader { geo in
                                    ZStack(alignment: .leading) {
                                        Capsule()
                                            .fill(Color.white.opacity(0.15))
                                            .frame(height: 4)
                                        
                                        Capsule()
                                            .fill(Color.appEmber)
                                            .frame(width: geo.size.width * CGFloat(item.progressPercent), height: 4)
                                    }
                                }
                                .frame(height: 4)
                                
                                Text("\(Formatters.formatPlaybackTime(Double(item.progressSeconds))) / \(Formatters.formatPlaybackTime(Double(item.durationSeconds)))")
                                    .font(.system(size: 10, design: .monospaced))
                                    .foregroundColor(.white.opacity(0.45))
                            }
                            
                            Spacer()
                            
                            Button(action: {
                                // Resume
                                let placeholder = NormalizedMovie(
                                    id: item.movieId,
                                    slug: item.movieId,
                                    name: item.movieTitle ?? "",
                                    poster: item.moviePoster ?? ""
                                )
                                playback.openPlayback(placeholder, episodeId: item.episodeId)
                            }) {
                                Image(systemName: "play.circle.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(Color.appEmber)
                            }
                        }
                        .padding(12)
                        .liquidGlassCard(cornerRadius: 14)
                    }
                }
            }
        }
    }
}
