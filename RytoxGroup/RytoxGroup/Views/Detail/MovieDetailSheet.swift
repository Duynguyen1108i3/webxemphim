//
//  MovieDetailSheet.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Direct native translation of CinematicDetailModal.tsx
//

import SwiftUI

public struct MovieDetailSheet: View {
    public let movie: NormalizedMovie
    
    @State private var fullDetail: NormalizedMovie?
    @State private var isLoading = true
    
    @ObservedObject private var playback = PlaybackManager.shared
    @ObservedObject private var favorites = FavoritesManager.shared
    private let movieService = MovieService.shared
    
    public init(movie: NormalizedMovie) {
        self.movie = movie
    }
    
    private var activeMovie: NormalizedMovie {
        fullDetail ?? movie
    }
    
    public var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.appDarkBg
                .ignoresSafeArea()
            
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    // Header Backdrop
                    ZStack(alignment: .bottomLeading) {
                        AsyncPosterImage(
                            urlString: activeMovie.thumb.isEmpty ? activeMovie.poster : activeMovie.thumb,
                            cornerRadius: 0,
                            contentMode: .fill
                        )
                        .frame(height: 380)
                        .clipped()
                        
                        // Cinema Mask Gradient
                        LinearGradient(
                            stops: [
                                .init(color: .clear, location: 0.0),
                                .init(color: Color.appDarkBg.opacity(0.65), location: 0.5),
                                .init(color: Color.appDarkBg, location: 1.0)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        .frame(height: 200)
                        
                        // Title Over Backdrop
                        VStack(alignment: .leading, spacing: 8) {
                            Text(activeMovie.name)
                                .font(.system(size: 28, weight: .black))
                                .foregroundColor(.white)
                                .shadow(color: Color.black.opacity(0.9), radius: 10, x: 0, y: 3)
                            
                            if !activeMovie.originName.isEmpty && activeMovie.originName != activeMovie.name {
                                Text(activeMovie.originName)
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundColor(.white.opacity(0.65))
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 16)
                    }
                    
                    // Metadata & Actions Bar
                    VStack(alignment: .leading, spacing: 20) {
                        // Badges Row
                        HStack(spacing: 8) {
                            BadgeView(.quality(activeMovie.quality))
                            BadgeView(.language(activeMovie.lang))
                            Text("\(activeMovie.year)")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white.opacity(0.75))
                            
                            if let runtime = activeMovie.runtimeMinutes {
                                Text("• \(Formatters.formatRuntime(runtime))")
                                    .font(.system(size: 13, weight: .regular))
                                    .foregroundColor(.white.opacity(0.6))
                            }
                            
                            if let rating = activeMovie.averageRating, rating > 0 {
                                HStack(spacing: 3) {
                                    Image(systemName: "star.fill")
                                        .font(.system(size: 10))
                                        .foregroundColor(Color.appGold)
                                    Text(String(format: "%.1f", rating))
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white)
                                }
                            }
                        }
                        
                        // Action Buttons (Play & Add to Favorites)
                        HStack(spacing: 12) {
                            Button(action: {
                                playback.openPlayback(activeMovie)
                            }) {
                                HStack(spacing: 8) {
                                    Image(systemName: "play.fill")
                                    Text("Phát Phim")
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(EmberButtonStyle(cornerRadius: 14))
                            
                            Button(action: {
                                favorites.toggleFavorite(activeMovie)
                            }) {
                                Image(systemName: favorites.isFavorite(movieId: activeMovie.id) ? "heart.fill" : "heart")
                                    .font(.system(size: 18))
                                    .foregroundColor(favorites.isFavorite(movieId: activeMovie.id) ? Color.appEmber : .white)
                                    .frame(width: 48, height: 48)
                                    .liquidGlassPill()
                            }
                            
                            if let url = URL(string: "https://rytoxgroup.com/movie/\(activeMovie.slug)") {
                                ShareLink(item: url) {
                                    Image(systemName: "square.and.arrow.up")
                                        .font(.system(size: 18))
                                        .foregroundColor(.white)
                                        .frame(width: 48, height: 48)
                                        .liquidGlassPill()
                                }
                            }
                        }
                        
                        // Synopsis / Description
                        if !activeMovie.description.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("NỘI DUNG PHIM")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.white.opacity(0.45))
                                
                                Text(activeMovie.description)
                                    .font(.synopsis)
                                    .foregroundColor(.white.opacity(0.85))
                                    .lineSpacing(4)
                            }
                        }
                        
                        // Episode Selection (for TV series & Anime)
                        if let seasons = activeMovie.seasons, !seasons.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("DANH SÁCH TẬP PHIM")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.white.opacity(0.45))
                                
                                EpisodeListView(seasons: seasons) { selectedEp in
                                    playback.openPlayback(activeMovie, episodeId: selectedEp.id)
                                }
                            }
                        }
                        
                        // Cast & Crew
                        CastCrewView(cast: activeMovie.cast, director: activeMovie.director)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 10)
                    .padding(.bottom, 60)
                }
            }
            
            // Top Floating Dismiss Button
            Button(action: {
                HapticFeedback.light()
                playback.closeDetailModal()
            }) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 36, height: 36)
                    .background(.ultraThinMaterial)
                    .clipShape(Circle())
                    .overlay(Circle().strokeBorder(Color.white.opacity(0.25), lineWidth: 1))
            }
            .padding(.trailing, 16)
            .padding(.top, 16)
        }
        .task {
            if let hydrated = await movieService.getMovieDetail(slug: movie.slug) {
                self.fullDetail = hydrated
            }
            self.isLoading = false
        }
    }
}
