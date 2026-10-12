//
//  MovieModels.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Data models matching @streamforge/shared-types and movieApi.ts
//

import Foundation

public struct NormalizedMovie: Identifiable, Codable, Hashable {
    public let id: String
    public let slug: String
    public let name: String
    public let originName: String
    public let poster: String
    public let thumb: String
    public let year: Int
    public let quality: String
    public let lang: String
    public let episodeCurrent: String
    public let description: String
    public let cast: [String]
    public let director: String
    public let category: [MovieCategory]
    public let country: [MovieCountry]
    public let seasons: [MovieSeason]?
    public let imdbId: String?
    public let tmdbId: String?
    public let mediaType: String? // "movie" or "tv"
    public let averageRating: Double?
    public let runtimeMinutes: Int?
    public let backdropUrl: String?
    public let trailerUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id, slug, name
        case originName = "origin_name"
        case poster, thumb, year, quality, lang
        case episodeCurrent = "episode_current"
        case description, cast, director, category, country, seasons
        case imdbId = "imdb_id"
        case tmdbId = "tmdb_id"
        case mediaType = "media_type"
        case averageRating = "average_rating"
        case runtimeMinutes = "runtime_minutes"
        case backdropUrl = "backdrop_url"
        case trailerUrl = "trailer_url"
    }
    
    public init(
        id: String,
        slug: String,
        name: String,
        originName: String = "",
        poster: String,
        thumb: String = "",
        year: Int = Calendar.current.component(.year, from: Date()),
        quality: String = "HD",
        lang: String = "Vietsub",
        episodeCurrent: String = "Full",
        description: String = "",
        cast: [String] = [],
        director: String = "",
        category: [MovieCategory] = [],
        country: [MovieCountry] = [],
        seasons: [MovieSeason]? = nil,
        imdbId: String? = nil,
        tmdbId: String? = nil,
        mediaType: String? = "movie",
        averageRating: Double? = 8.5,
        runtimeMinutes: Int? = 120,
        backdropUrl: String? = nil,
        trailerUrl: String? = nil
    ) {
        self.id = id
        self.slug = slug
        self.name = name
        self.originName = originName
        self.poster = poster
        self.thumb = thumb.isEmpty ? poster : thumb
        self.year = year
        self.quality = quality
        self.lang = lang
        self.episodeCurrent = episodeCurrent
        self.description = description
        self.cast = cast
        self.director = director
        self.category = category
        self.country = country
        self.seasons = seasons
        self.imdbId = imdbId
        self.tmdbId = tmdbId
        self.mediaType = mediaType
        self.averageRating = averageRating
        self.runtimeMinutes = runtimeMinutes
        self.backdropUrl = backdropUrl ?? thumb
        self.trailerUrl = trailerUrl
    }
}

public struct MovieCategory: Identifiable, Codable, Hashable {
    public var id: String { slug }
    public let name: String
    public let slug: String
    
    public init(name: String, slug: String) {
        self.name = name
        self.slug = slug
    }
}

public struct MovieCountry: Identifiable, Codable, Hashable {
    public var id: String { slug }
    public let name: String
    public let slug: String
    
    public init(name: String, slug: String) {
        self.name = name
        self.slug = slug
    }
}

public struct MovieSeason: Identifiable, Codable, Hashable {
    public let id: String
    public let title: String
    public let seasonNumber: Int
    public let episodes: [MovieEpisode]
    
    public init(id: String, title: String, seasonNumber: Int = 1, episodes: [MovieEpisode]) {
        self.id = id
        self.title = title
        self.seasonNumber = seasonNumber
        self.episodes = episodes
    }
}

public struct MovieEpisode: Identifiable, Codable, Hashable {
    public let id: String
    public let title: String
    public let synopsis: String
    public let runtimeMinutes: Int
    public let posterUrl: String
    public let seasonNumber: Int
    public let episodeNumber: Int
    public let linkM3u8: String?
    public let linkEmbed: String?
    public let filename: String?
    
    public init(
        id: String,
        title: String,
        synopsis: String = "",
        runtimeMinutes: Int = 45,
        posterUrl: String = "",
        seasonNumber: Int = 1,
        episodeNumber: Int = 1,
        linkM3u8: String? = nil,
        linkEmbed: String? = nil,
        filename: String? = nil
    ) {
        self.id = id
        self.title = title
        self.synopsis = synopsis
        self.runtimeMinutes = runtimeMinutes
        self.posterUrl = posterUrl
        self.seasonNumber = seasonNumber
        self.episodeNumber = episodeNumber
        self.linkM3u8 = linkM3u8
        self.linkEmbed = linkEmbed
        self.filename = filename
    }
}

public struct PlaybackSource: Identifiable, Hashable {
    public let id = UUID()
    public let streamUrl: String?
    public let embedUrl: String?
    public let isDirectHls: Bool
    public let serverName: String
    public let quality: String
    public let subtitles: [SubtitleTrack]
    
    public init(
        streamUrl: String?,
        embedUrl: String?,
        isDirectHls: Bool,
        serverName: String,
        quality: String = "1080p",
        subtitles: [SubtitleTrack] = []
    ) {
        self.streamUrl = streamUrl
        self.embedUrl = embedUrl
        self.isDirectHls = isDirectHls
        self.serverName = serverName
        self.quality = quality
        self.subtitles = subtitles
    }
}

public struct SubtitleTrack: Identifiable, Hashable, Codable {
    public let id: String
    public let language: String
    public let label: String
    public let url: String
    
    public init(id: String = UUID().uuidString, language: String, label: String, url: String) {
        self.id = id
        self.language = language
        self.label = label
        self.url = url
    }
}

public struct MovieRowItem: Identifiable, Hashable {
    public let id: String
    public let title: String
    public let slug: String
    public var movies: [NormalizedMovie]
    
    public init(id: String = UUID().uuidString, title: String, slug: String, movies: [NormalizedMovie]) {
        self.id = id
        self.title = title
        self.slug = slug
        self.movies = movies
    }
}
