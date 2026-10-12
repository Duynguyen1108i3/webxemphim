//
//  TMDBAdapter.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Direct Swift translation of apps/frontend/src/lib/api/tmdb.api.ts
//

import Foundation

public final class TMDBAdapter {
    public static let shared = TMDBAdapter()
    private let client = NetworkClient.shared
    
    private init() {}
    
    public var isConfigured: Bool {
        !AppConfig.tmdbApiKey.isEmpty
    }
    
    // MARK: - Trending
    public func getTrending(page: Int = 1) async throws -> [NormalizedMovie] {
        guard isConfigured, let url = APIEndpoint.tmdbTrending(page: page).url else { return [] }
        let json = try await client.fetchRawJSON(url)
        let results = json["results"] as? [[String: Any]] ?? []
        return results.compactMap { normalizeItem($0) }
    }
    
    // MARK: - Discover by genre
    public func getByGenre(genreId: Int, page: Int = 1) async throws -> [NormalizedMovie] {
        guard isConfigured, let url = APIEndpoint.tmdbDiscover(genreId: genreId, page: page).url else { return [] }
        let json = try await client.fetchRawJSON(url)
        let results = json["results"] as? [[String: Any]] ?? []
        return results.compactMap { normalizeItem($0) }
    }
    
    // MARK: - Search
    public func search(query: String, page: Int = 1) async throws -> [NormalizedMovie] {
        guard isConfigured, let url = APIEndpoint.tmdbSearch(query: query, page: page).url else { return [] }
        let json = try await client.fetchRawJSON(url)
        let results = json["results"] as? [[String: Any]] ?? []
        return results.compactMap { normalizeItem($0) }
    }
    
    // MARK: - Movie Detail
    public func getDetail(id: String) async throws -> NormalizedMovie? {
        guard isConfigured, let url = APIEndpoint.tmdbDetail(id: id).url else { return nil }
        let json = try await client.fetchRawJSON(url)
        return normalizeItem(json)
    }
    
    // MARK: - Normalizer
    private func normalizeItem(_ dict: [String: Any]) -> NormalizedMovie? {
        guard let idNum = dict["id"] as? Int else { return nil }
        let id = String(idNum)
        let title = (dict["title"] as? String) ?? (dict["name"] as? String) ?? "Unknown"
        let originTitle = (dict["original_title"] as? String) ?? (dict["original_name"] as? String) ?? title
        let posterPath = (dict["poster_path"] as? String) ?? ""
        let backdropPath = (dict["backdrop_path"] as? String) ?? ""
        let overview = (dict["overview"] as? String) ?? ""
        let voteAverage = (dict["vote_average"] as? Double) ?? 8.0
        let releaseDate = (dict["release_date"] as? String) ?? (dict["first_air_date"] as? String) ?? ""
        let year = Int(releaseDate.prefix(4)) ?? Calendar.current.component(.year, from: Date())
        let mediaType = (dict["media_type"] as? String) ?? "movie"
        let runtime = (dict["runtime"] as? Int) ?? 110
        
        let slug = title.lowercased()
            .folding(options: .diacriticInsensitive, locale: .current)
            .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        
        return NormalizedMovie(
            id: id,
            slug: slug.isEmpty ? "movie-\(id)" : slug,
            name: title,
            originName: originTitle,
            poster: ImageProxy.resolve(posterPath),
            thumb: ImageProxy.resolveBackdrop(backdropPath),
            year: year,
            quality: "4K UHD",
            lang: "Vietsub",
            episodeCurrent: "Full",
            description: overview,
            tmdbId: id,
            mediaType: mediaType,
            averageRating: voteAverage,
            runtimeMinutes: runtime
        )
    }
}
