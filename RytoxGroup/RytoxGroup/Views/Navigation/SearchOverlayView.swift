//
//  SearchOverlayView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Full-screen search overlay matching ShellSearchOverlay.tsx
//

import SwiftUI
import Combine

public struct SearchOverlayView: View {
    @Binding public var isPresented: Bool
    @State private var query: String = ""
    @State private var results: [NormalizedMovie] = []
    @State private var isSearching: Bool = false
    @State private var searchTask: Task<Void, Never>? = nil
    
    @ObservedObject private var playback = PlaybackManager.shared
    private let movieService = MovieService.shared
    
    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]
    
    public init(isPresented: Binding<Bool>) {
        self._isPresented = isPresented
    }
    
    public var body: some View {
        ZStack {
            // Dark Blur Background
            Color.appDarkBg.opacity(0.92)
                .background(.ultraThinMaterial)
                .ignoresSafeArea()
            
            VStack(spacing: 16) {
                // Search Header Input
                HStack(spacing: 12) {
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                        
                        TextField("Tìm kiếm phim, anime, diễn viên...", text: $query)
                            .font(.system(size: 15, weight: .regular))
                            .foregroundColor(.white)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .onChange(of: query) { newQuery in
                                performSearch(newQuery)
                            }
                        
                        if !query.isEmpty {
                            Button(action: {
                                query = ""
                                results = []
                            }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.white.opacity(0.5))
                            }
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .liquidGlassCard(cornerRadius: 14)
                    
                    // Close Button
                    Button("Đóng") {
                        HapticFeedback.light()
                        isPresented = false
                    }
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.white.opacity(0.85))
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                
                // Content Area
                if isSearching {
                    VStack(spacing: 16) {
                        Spacer()
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(1.2)
                        Text("Đang tìm kiếm...")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.white.opacity(0.5))
                        Spacer()
                    }
                } else if results.isEmpty && !query.trimmingCharacters(in: .whitespaces).isEmpty {
                    VStack(spacing: 12) {
                        Spacer()
                        Image(systemName: "film")
                            .font(.system(size: 40, weight: .thin))
                            .foregroundColor(.white.opacity(0.3))
                        Text("Không tìm thấy kết quả phù hợp")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                        Spacer()
                    }
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 16) {
                            ForEach(results) { movie in
                                Button(action: {
                                    isPresented = false
                                    playback.openDetailModal(movie)
                                }) {
                                    VStack(alignment: .leading, spacing: 6) {
                                        AsyncPosterImage(urlString: movie.poster, cornerRadius: 10)
                                            .aspectRatio(2/3, contentMode: .fill)
                                            .overlay(
                                                VStack {
                                                    Spacer()
                                                    HStack {
                                                        BadgeView(.quality(movie.quality))
                                                        Spacer()
                                                    }
                                                    .padding(6)
                                                }
                                            )
                                        
                                        Text(movie.name)
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(.white)
                                            .lineLimit(1)
                                        
                                        Text("\(movie.year)")
                                            .font(.system(size: 10, weight: .regular))
                                            .foregroundColor(.white.opacity(0.45))
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 100)
                    }
                }
            }
        }
    }
    
    private func performSearch(_ text: String) {
        searchTask?.cancel()
        let clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard clean.count > 1 else {
            results = []
            isSearching = false
            return
        }
        
        searchTask = Task {
            // 400ms debounce
            try? await Task.sleep(nanoseconds: 400_000_000)
            if Task.isCancelled { return }
            
            await MainActor.run { isSearching = true }
            let searchResults = await movieService.searchMovies(query: clean, page: 1)
            if Task.isCancelled { return }
            
            await MainActor.run {
                self.results = searchResults
                self.isSearching = false
            }
        }
    }
}
