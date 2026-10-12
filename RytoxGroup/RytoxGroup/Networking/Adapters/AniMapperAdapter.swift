//
//  AniMapperAdapter.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Direct Swift translation of apps/frontend/src/lib/api/animapper.api.ts
//

import Foundation

public final class AniMapperAdapter {
    public static let shared = AniMapperAdapter()
    private let client = NetworkClient.shared
    
    private init() {}
    
    // MARK: - Anime Trending Rows
    public func getTrendingAnime(page: Int = 1) async throws -> [NormalizedMovie] {
        guard let url = URL(string: "\(AppConfig.aniMapperBaseURL)/api/v1/anime/trending?page=\(page)") else {
            return []
        }
        
        do {
            let json = try await client.fetchRawJSON(url)
            let data = json["data"] as? [[String: Any]] ?? []
            return data.compactMap { normalizeAnime($0) }
        } catch {
            // Fallback to Phim4K Hoạt Hình
            return try await Phim4KAdapter.shared.getByList(type: "hoat-hinh", page: page)
        }
    }
    
    // MARK: - Normalizer
    private func normalizeAnime(_ dict: [String: Any]) -> NormalizedMovie? {
        guard let id = dict["id"] as? String ?? (dict["_id"] as? String),
              let title = dict["title"] as? String else {
            return nil
        }
        
        let poster = (dict["poster"] as? String) ?? (dict["coverImage"] as? String) ?? ""
        let banner = (dict["banner"] as? String) ?? poster
        let desc = (dict["description"] as? String) ?? ""
        let year = (dict["year"] as? Int) ?? Calendar.current.component(.year, from: Date())
        let totalEp = (dict["totalEpisodes"] as? Int) ?? 12
        
        let slug = title.lowercased()
            .folding(options: .diacriticInsensitive, locale: .current)
            .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        
        return NormalizedMovie(
            id: id,
            slug: slug.isEmpty ? "anime-\(id)" : slug,
            name: title,
            originName: (dict["romajiTitle"] as? String) ?? title,
            poster: poster,
            thumb: banner,
            year: year,
            quality: "1080p FHD",
            lang: "Vietsub",
            episodeCurrent: "Tập \(totalEp)",
            description: Formatters.cleanHtml(desc),
            category: [MovieCategory(name: "Anime", slug: "hoat-hinh")]
        )
    }
}
