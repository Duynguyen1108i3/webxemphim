//
//  HomeView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Main movie catalog view matching HomePage.tsx on web
//

import SwiftUI

public struct HomeView: View {
    public var categoryFilter: String? = nil
    
    @State private var rows: [MovieRowItem] = []
    @State private var heroMovie: NormalizedMovie?
    @State private var isLoading = true
    @State private var isScrolled = false
    
    // Modals
    @State private var showSearch = false
    @State private var showSettings = false
    @State private var showNotifications = false
    @State private var showProfile = false
    
    @ObservedObject private var playback = PlaybackManager.shared
    private let movieService = MovieService.shared
    
    public init(categoryFilter: String? = nil) {
        self.categoryFilter = categoryFilter
    }
    
    public var body: some View {
        ZStack(alignment: .top) {
            // Main Scroll Content
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    if isLoading {
                        VStack(spacing: 20) {
                            ShimmerView(cornerRadius: 0)
                                .frame(height: 480)
                            
                            ForEach(0..<4) { _ in
                                VStack(alignment: .leading, spacing: 10) {
                                    ShimmerView(cornerRadius: 6)
                                        .frame(width: 140, height: 20)
                                        .padding(.horizontal, 18)
                                    
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 12) {
                                            ForEach(0..<5) { _ in
                                                ShimmerView(cornerRadius: 12)
                                                    .frame(width: 135, height: 200)
                                            }
                                        }
                                        .padding(.horizontal, 18)
                                    }
                                }
                            }
                        }
                    } else {
                        // Hero Banner
                        if let hero = heroMovie {
                            HeroBannerView(
                                movie: hero,
                                onPlay: { playback.openPlayback(hero) },
                                onDetails: { playback.openDetailModal(hero) }
                            )
                        }
                        
                        // Movie Rows
                        LazyVStack(spacing: 28) {
                            ForEach(rows) { row in
                                MovieRowView(row: row) { movie in
                                    playback.openDetailModal(movie)
                                }
                            }
                        }
                        .padding(.bottom, 120)
                    }
                }
                .background(
                    GeometryReader { geo in
                        Color.clear.preference(
                            key: ScrollOffsetPreferenceKey.self,
                            value: geo.frame(in: .named("home_scroll")).minY
                        )
                    }
                )
            }
            .coordinateSpace(name: "home_scroll")
            .onPreferenceChange(ScrollOffsetPreferenceKey.self) { value in
                isScrolled = value < -20
            }
            .refreshable {
                await loadCatalog()
            }
            
            // Top Navigation Bar
            TopNavigationBar(
                isScrolled: isScrolled,
                onOpenSearch: { showSearch = true },
                onOpenSettings: { showSettings = true },
                onOpenNotifications: { showNotifications = true },
                onOpenProfile: { showProfile = true },
                hasUnreadNotifications: false
            )
        }
        .task {
            if rows.isEmpty {
                await loadCatalog()
            }
        }
        // Sheets
        .fullScreenCover(isPresented: $showSearch) {
            SearchOverlayView(isPresented: $showSearch)
        }
        .sheet(isPresented: $showSettings) {
            GlassSettingsSheet()
        }
        .sheet(isPresented: $showNotifications) {
            NotificationDropdownView(
                latestMovies: rows.first?.movies ?? [],
                onSelectMovie: { movie in
                    playback.openDetailModal(movie)
                }
            )
        }
        .sheet(isPresented: $showProfile) {
            ProfileView()
        }
    }
    
    private func loadCatalog() async {
        isLoading = true
        defer { isLoading = false }
        
        let loadedRows: [MovieRowItem]
        if categoryFilter == "anime" {
            loadedRows = await movieService.getAnimeRows()
        } else if categoryFilter == "tv-shows" {
            let tv = await movieService.getByList(type: "phim-bo")
            loadedRows = [MovieRowItem(title: "📺 Toàn Bộ Phim Bộ", slug: "tv", movies: tv)]
        } else if categoryFilter == "movies" {
            let single = await movieService.getByList(type: "phim-le")
            loadedRows = [MovieRowItem(title: "🎬 Toàn Bộ Phim Lẻ", slug: "single", movies: single)]
        } else {
            loadedRows = await movieService.getHomeRows()
        }
        
        self.rows = loadedRows
        if let first = loadedRows.first?.movies.first {
            self.heroMovie = first
        }
    }
}

private struct ScrollOffsetPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}
