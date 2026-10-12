//
//  PlaybackManager.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Direct translation of Zustand apps/frontend/src/store/playbackStore.ts
//

import SwiftUI
import Combine

public final class PlaybackManager: ObservableObject {
    public static let shared = PlaybackManager()
    
    // MARK: - Modal & Overlay States
    @Published public var activeMovieDetail: NormalizedMovie?
    @Published public var activePlayback: NormalizedMovie?
    @Published public var activeEpisodeId: String?
    @Published public var activePlaybackSource: PlaybackSource?
    @Published public var isPreparingPlayback: Bool = false
    @Published public var authModalOpen: Bool = false
    
    // MARK: - Watch History Map [movieId: WatchHistoryItem]
    @Published public var watchHistory: [String: WatchHistoryItem] = [:]
    
    private let movieService = MovieService.shared
    private let authService = AuthService.shared
    private let historyKey = "rytox_local_watch_history"
    
    private init() {
        loadWatchHistory()
    }
    
    // MARK: - Detail Modal Actions
    @MainActor
    public func openDetailModal(_ movie: NormalizedMovie) {
        HapticFeedback.light()
        self.activeMovieDetail = movie
    }
    
    @MainActor
    public func closeDetailModal() {
        self.activeMovieDetail = nil
    }
    
    // MARK: - Playback Overlay Actions
    @MainActor
    public func openPlayback(_ movie: NormalizedMovie, episodeId: String? = nil) {
        HapticFeedback.medium()
        self.isPreparingPlayback = true
        self.activePlayback = movie
        self.activeEpisodeId = episodeId
        
        Task {
            let source = await movieService.getPlayback(movie: movie, episodeId: episodeId)
            await MainActor.run {
                self.activePlaybackSource = source
                self.isPreparingPlayback = false
            }
        }
    }
    
    @MainActor
    public func closePlayback() {
        self.activePlayback = nil
        self.activeEpisodeId = nil
        self.activePlaybackSource = nil
        self.isPreparingPlayback = false
    }
    
    // MARK: - Watch History Tracking
    @MainActor
    public func updateProgress(
        movie: NormalizedMovie,
        episodeId: String = "",
        progressSeconds: Int,
        durationSeconds: Int
    ) {
        let isComplete = durationSeconds > 0 && Double(progressSeconds) / Double(durationSeconds) >= 0.90
        
        let item = WatchHistoryItem(
            profileId: AuthManager.shared.selectedProfile?.id ?? "local_user",
            movieId: movie.id,
            episodeId: episodeId,
            progressSeconds: progressSeconds,
            durationSeconds: durationSeconds,
            completed: isComplete,
            lastWatchedAt: Date(),
            movieTitle: movie.name,
            moviePoster: movie.poster,
            episodeTitle: episodeId
        )
        
        self.watchHistory[movie.id] = item
        saveWatchHistory()
        
        // Report to backend heartbeat if logged in
        if let profileId = AuthManager.shared.selectedProfile?.id {
            Task {
                await authService.reportWatchProgress(
                    profileId: profileId,
                    movieId: movie.id,
                    episodeId: episodeId,
                    progressSeconds: progressSeconds,
                    durationSeconds: durationSeconds
                )
            }
        }
    }
    
    private func saveWatchHistory() {
        do {
            let data = try JSONEncoder().encode(watchHistory)
            UserDefaults.standard.set(data, forKey: historyKey)
        } catch {
            // Encode error
        }
    }
    
    private func loadWatchHistory() {
        guard let data = UserDefaults.standard.data(forKey: historyKey) else { return }
        do {
            let decoded = try JSONDecoder().decode([String: WatchHistoryItem].self, from: data)
            self.watchHistory = decoded
        } catch {
            // Decode error
        }
    }
}
