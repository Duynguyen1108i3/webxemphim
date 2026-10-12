//
//  ContentView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Root view coordinating navigation, ambient lighting, and full-screen modals
//

import SwiftUI

public struct ContentView: View {
    @State private var selectedTab = 0
    
    @ObservedObject private var playback = PlaybackManager.shared
    @ObservedObject private var theme = ThemeManager.shared
    
    public init() {}
    
    public var body: some View {
        ZStack(alignment: .bottom) {
            // Ambient Liquid Glass Background Glow (hardware GPU accelerated)
            AmbientBackgroundView()
            
            // Tab Content
            Group {
                switch selectedTab {
                case 0:
                    HomeView()
                case 1:
                    HomeView(categoryFilter: "tv-shows")
                case 2:
                    HomeView(categoryFilter: "movies")
                case 3:
                    HomeView(categoryFilter: "anime")
                case 4:
                    ProfileView()
                default:
                    HomeView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
            // Floating Liquid Glass Bottom Dock (hidden during video playback)
            if playback.activePlayback == nil {
                MainTabView(selectedTab: $selectedTab)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .preferredColorScheme(.dark)
        // Movie Detail Modal Sheet
        .sheet(item: Binding(
            get: { playback.activeMovieDetail },
            set: { _ in playback.closeDetailModal() }
        )) { movie in
            MovieDetailSheet(movie: movie)
        }
        // Full-Screen Video Player Overlay
        .fullScreenCover(item: Binding(
            get: { playback.activePlayback },
            set: { _ in playback.closePlayback() }
        )) { movie in
            PlayerView(movie: movie, episodeId: playback.activeEpisodeId)
        }
        // Deep link handler (rytoxgroup://movie/...)
        .onOpenURL { url in
            handleDeepLink(url)
        }
    }
    
    private func handleDeepLink(_ url: URL) {
        // e.g. rytoxgroup://movie/nguoi-nhen-xa-nha
        guard let host = url.host, host == "movie" else { return }
        let slug = url.lastPathComponent
        guard !slug.isEmpty else { return }
        
        Task {
            if let movie = await MovieService.shared.getMovieDetail(slug: slug) {
                await MainActor.run {
                    playback.openDetailModal(movie)
                }
            }
        }
    }
}
