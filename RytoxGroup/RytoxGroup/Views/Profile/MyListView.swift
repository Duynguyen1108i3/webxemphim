//
//  MyListView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  My List favorites grid matching MyListPage.tsx
//

import SwiftUI

public struct MyListView: View {
    @ObservedObject private var favorites = FavoritesManager.shared
    @ObservedObject private var playback = PlaybackManager.shared
    
    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]
    
    public init() {}
    
    public var body: some View {
        Group {
            if favorites.favorites.isEmpty {
                VStack(spacing: 12) {
                    Spacer().frame(height: 40)
                    Image(systemName: "heart.slash")
                        .font(.system(size: 44, weight: .light))
                        .foregroundColor(.white.opacity(0.3))
                    Text("Danh sách yêu thích trống")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(.white.opacity(0.55))
                    Text("Nhấn biểu tượng trái tim khi xem phim để lưu vào đây.")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.4))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
            } else {
                LazyVGrid(columns: columns, spacing: 14) {
                    ForEach(favorites.favorites) { movie in
                        MovieCardView(movie: movie, width: (UIScreen.main.bounds.width - 56) / 3) {
                            playback.openDetailModal(movie)
                        }
                    }
                }
            }
        }
    }
}
