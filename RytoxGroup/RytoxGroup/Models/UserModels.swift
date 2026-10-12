//
//  UserModels.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Watch progress, history and favorites models
//

import Foundation

public struct WatchHistoryItem: Identifiable, Codable, Hashable {
    public let id: String
    public let profileId: String
    public let movieId: String
    public let episodeId: String
    public var progressSeconds: Int
    public var durationSeconds: Int
    public var completed: Bool
    public var lastWatchedAt: Date
    public var movieTitle: String?
    public var moviePoster: String?
    public var episodeTitle: String?
    
    public var progressPercent: Double {
        guard durationSeconds > 0 else { return 0 }
        return min(1.0, Double(progressSeconds) / Double(durationSeconds))
    }
    
    public init(
        id: String = UUID().uuidString,
        profileId: String,
        movieId: String,
        episodeId: String = "",
        progressSeconds: Int = 0,
        durationSeconds: Int = 0,
        completed: Bool = false,
        lastWatchedAt: Date = Date(),
        movieTitle: String? = nil,
        moviePoster: String? = nil,
        episodeTitle: String? = nil
    ) {
        self.id = id
        self.profileId = profileId
        self.movieId = movieId
        self.episodeId = episodeId
        self.progressSeconds = progressSeconds
        self.durationSeconds = durationSeconds
        self.completed = completed
        self.lastWatchedAt = lastWatchedAt
        self.movieTitle = movieTitle
        self.moviePoster = moviePoster
        self.episodeTitle = episodeTitle
    }
}

public struct FavoriteItem: Identifiable, Codable, Hashable {
    public var id: String { "\(profileId)_\(movieId)" }
    public let profileId: String
    public let movieId: String
    public let createdAt: Date
    public var movie: NormalizedMovie?
    
    public init(profileId: String, movieId: String, createdAt: Date = Date(), movie: NormalizedMovie? = nil) {
        self.profileId = profileId
        self.movieId = movieId
        self.createdAt = createdAt
        self.movie = movie
    }
}

public struct WatchProgressReport: Codable {
    public let profileId: String
    public let movieId: String
    public let episodeId: String
    public let progressSeconds: Int
    public let durationSeconds: Int
    
    public init(profileId: String, movieId: String, episodeId: String = "", progressSeconds: Int, durationSeconds: Int) {
        self.profileId = profileId
        self.movieId = movieId
        self.episodeId = episodeId
        self.progressSeconds = progressSeconds
        self.durationSeconds = durationSeconds
    }
}
