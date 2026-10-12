//
//  NewAndPopularView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  New and popular movies view matching NewAndPopularPage.tsx
//

import SwiftUI

public struct NewAndPopularView: View {
    @State private var selectedFilter: String = "all"
    @State private var movies: [NormalizedMovie] = []
    @State private var isLoading = true
    @State private var currentPage = 1
    
    @ObservedObject private var playback = PlaybackManager.shared
    private let movieService = MovieService.shared
    
    private let columns = [
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14)
    ]
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 16) {
            // Segmented Pills
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    filterButton(id: "all", label: "Tất Cả")
                    filterButton(id: "phim-bo", label: "Phim Bộ")
                    filterButton(id: "phim-le", label: "Phim Lẻ")
                    filterButton(id: "hoat-hinh", label: "Anime")
                    filterButton(id: "hanh-dong", label: "Hành Động")
                    filterButton(id: "kinh-di", label: "Kinh Dị")
                }
                .padding(.horizontal, 18)
                .padding(.top, 14)
            }
            
            if isLoading && movies.isEmpty {
                VStack {
                    Spacer()
                    ProgressView().tint(.white)
                    Spacer()
                }
            } else {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(movies) { movie in
                            MovieCardView(movie: movie, width: (UIScreen.main.bounds.width - 50) / 2) {
                                playback.openDetailModal(movie)
                            }
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.bottom, 100)
                }
            }
        }
        .task {
            await fetchMovies()
        }
    }
    
    private func filterButton(id: String, label: String) -> some View {
        Button(action: {
            HapticFeedback.selection()
            selectedFilter = id
            Task { await fetchMovies() }
        }) {
            Text(label)
        }
        .buttonStyle(GlassPillButtonStyle(isSelected: selectedFilter == id))
    }
    
    private func fetchMovies() async {
        isLoading = true
        defer { isLoading = false }
        
        let res: [NormalizedMovie]
        if selectedFilter == "all" {
            res = await movieService.getNewMovies(page: 1)
        } else if ["phim-bo", "phim-le", "hoat-hinh"].contains(selectedFilter) {
            res = await movieService.getByList(type: selectedFilter, page: 1)
        } else {
            res = await movieService.getByGenre(slug: selectedFilter, page: 1)
        }
        self.movies = res
    }
}
