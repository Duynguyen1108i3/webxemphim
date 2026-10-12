//
//  MovieCardView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Movie poster card component matching MovieCard on web
//

import SwiftUI

public struct MovieCardView: View {
    public let movie: NormalizedMovie
    public var width: CGFloat = 135
    public var onSelect: () -> Void
    
    @ObservedObject private var favorites = FavoritesManager.shared
    
    public init(movie: NormalizedMovie, width: CGFloat = 135, onSelect: @escaping () -> Void) {
        self.movie = movie
        self.width = width
        self.onSelect = onSelect
    }
    
    public var body: some View {
        Button(action: {
            HapticFeedback.light()
            onSelect()
        }) {
            VStack(alignment: .leading, spacing: 6) {
                ZStack(alignment: .topTrailing) {
                    AsyncPosterImage(urlString: movie.poster, cornerRadius: 12)
                        .frame(width: width, height: width * 1.5)
                        .clipped()
                    
                    // Top Badges
                    VStack(alignment: .trailing, spacing: 4) {
                        BadgeView(.quality(movie.quality))
                        if !movie.episodeCurrent.isEmpty && movie.episodeCurrent != "Full" {
                            BadgeView(.episode(movie.episodeCurrent))
                        }
                    }
                    .padding(6)
                    
                    // Bottom Gradient Shadow for Text Readability
                    VStack {
                        Spacer()
                        LinearGradient(
                            colors: [Color.clear, Color.black.opacity(0.85)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        .frame(height: 45)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.12), lineWidth: 0.8)
                )
                .shadow(color: Color.black.opacity(0.4), radius: 8, x: 0, y: 4)
                
                // Title & Subtitle
                VStack(alignment: .leading, spacing: 2) {
                    Text(movie.name)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    HStack(spacing: 4) {
                        Text("\(movie.year)")
                            .font(.system(size: 11, weight: .regular))
                            .foregroundColor(.white.opacity(0.5))
                        
                        if !movie.lang.isEmpty {
                            Text("• \(movie.lang)")
                                .font(.system(size: 11, weight: .regular))
                                .foregroundColor(.white.opacity(0.5))
                                .lineLimit(1)
                        }
                    }
                }
                .frame(width: width, alignment: .leading)
            }
        }
        .buttonStyle(.plain)
        .contextMenu {
            Button(action: {
                favorites.toggleFavorite(movie)
            }) {
                Label(
                    favorites.isFavorite(movieId: movie.id) ? "Xóa khỏi Danh Sách" : "Thêm vào Danh Sách",
                    systemImage: favorites.isFavorite(movieId: movie.id) ? "heart.slash.fill" : "heart.fill"
                )
            }
            
            Button(action: {
                PlaybackManager.shared.openPlayback(movie)
            }) {
                Label("Phát Ngay", systemImage: "play.fill")
            }
        }
    }
}
