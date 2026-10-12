//
//  Phim4KAdapter.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Direct Swift translation of apps/frontend/src/lib/api/phim4k.api.ts
//

import Foundation

public final class Phim4KAdapter {
    public static let shared = Phim4KAdapter()
    private let client = NetworkClient.shared
    
    private init() {}
    
    // MARK: - New Movies List
    public func getNewMovies(page: Int = 1) async throws -> [NormalizedMovie] {
        guard let url = APIEndpoint.phimApiNewMovies(page: page).url else { return [] }
        let json = try await client.fetchRawJSON(url)
        let items = json["items"] as? [[String: Any]] ?? []
        return items.compactMap { normalizeItem($0) }
    }
    
    // MARK: - Category / Genre Movies
    public func getByGenre(slug: String, page: Int = 1) async throws -> [NormalizedMovie] {
        guard let url = APIEndpoint.phimApiGenre(slug: slug, page: page).url else { return [] }
        let json = try await client.fetchRawJSON(url)
        guard let data = json["data"] as? [String: Any],
              let items = data["items"] as? [[String: Any]] else {
            return []
        }
        let cdn = (data["APP_DOMAIN_CDN_IMAGE"] as? String) ?? AppConfig.defaultCdnImage
        return items.compactMap { normalizeItem($0, cdn: cdn) }
    }
    
    // MARK: - Country Movies
    public func getByCountry(slug: String, page: Int = 1) async throws -> [NormalizedMovie] {
        guard let url = APIEndpoint.phimApiCountry(slug: slug, page: page).url else { return [] }
        let json = try await client.fetchRawJSON(url)
        guard let data = json["data"] as? [String: Any],
              let items = data["items"] as? [[String: Any]] else {
            return []
        }
        let cdn = (data["APP_DOMAIN_CDN_IMAGE"] as? String) ?? AppConfig.defaultCdnImage
        return items.compactMap { normalizeItem($0, cdn: cdn) }
    }
    
    // MARK: - Special Lists (phim-bo, phim-le, hoat-hinh, tv-shows)
    public func getByList(type: String, page: Int = 1) async throws -> [NormalizedMovie] {
        guard let url = APIEndpoint.phimApiList(type: type, page: page).url else { return [] }
        let json = try await client.fetchRawJSON(url)
        guard let data = json["data"] as? [String: Any],
              let items = data["items"] as? [[String: Any]] else {
            return []
        }
        let cdn = (data["APP_DOMAIN_CDN_IMAGE"] as? String) ?? AppConfig.defaultCdnImage
        return items.compactMap { normalizeItem($0, cdn: cdn) }
    }
    
    // MARK: - Search Movies
    public func search(query: String, limit: Int = 24) async throws -> [NormalizedMovie] {
        guard let url = APIEndpoint.phimApiSearch(query: query, limit: limit).url else { return [] }
        let json = try await client.fetchRawJSON(url)
        guard let data = json["data"] as? [String: Any],
              let items = data["items"] as? [[String: Any]] else {
            return []
        }
        let cdn = (data["APP_DOMAIN_CDN_IMAGE"] as? String) ?? AppConfig.defaultCdnImage
        return items.compactMap { normalizeItem($0, cdn: cdn) }
    }
    
    // MARK: - Movie Detail & Episodes
    public func getDetail(slug: String) async throws -> NormalizedMovie? {
        guard let url = APIEndpoint.phimApiDetail(slug: slug).url else { return nil }
        let json = try await client.fetchRawJSON(url)
        guard let movieDict = json["movie"] as? [String: Any] else {
            return nil
        }
        
        let episodesRaw = json["episodes"] as? [[String: Any]] ?? []
        let parsedSeasons = parseEpisodes(episodesRaw)
        
        return normalizeDetail(movieDict, seasons: parsedSeasons)
    }
    
    // MARK: - Normalizers
    private func normalizeItem(_ dict: [String: Any], cdn: String? = nil) -> NormalizedMovie? {
        guard let slug = dict["slug"] as? String,
              let name = dict["name"] as? String else {
            return nil
        }
        
        let id = (dict["_id"] as? String) ?? (dict["id"] as? String) ?? slug
        let originName = (dict["origin_name"] as? String) ?? ""
        let thumbPath = (dict["thumb_url"] as? String) ?? (dict["poster_url"] as? String) ?? ""
        let posterPath = (dict["poster_url"] as? String) ?? thumbPath
        let year = (dict["year"] as? Int) ?? Calendar.current.component(.year, from: Date())
        let quality = (dict["quality"] as? String) ?? "FHD"
        let lang = (dict["lang"] as? String) ?? "Vietsub"
        let epCurrent = (dict["episode_current"] as? String) ?? "Full"
        
        return NormalizedMovie(
            id: id,
            slug: slug,
            name: name,
            originName: originName,
            poster: ImageProxy.resolve(posterPath, cdnBase: cdn),
            thumb: ImageProxy.resolve(thumbPath, cdnBase: cdn),
            year: year,
            quality: quality,
            lang: lang,
            episodeCurrent: epCurrent
        )
    }
    
    private func normalizeDetail(_ dict: [String: Any], seasons: [MovieSeason]) -> NormalizedMovie {
        let slug = (dict["slug"] as? String) ?? ""
        let id = (dict["_id"] as? String) ?? slug
        let name = (dict["name"] as? String) ?? ""
        let originName = (dict["origin_name"] as? String) ?? ""
        let thumbPath = (dict["thumb_url"] as? String) ?? ""
        let posterPath = (dict["poster_url"] as? String) ?? thumbPath
        let year = (dict["year"] as? Int) ?? Calendar.current.component(.year, from: Date())
        let quality = (dict["quality"] as? String) ?? "FHD"
        let lang = (dict["lang"] as? String) ?? "Vietsub"
        let epCurrent = (dict["episode_current"] as? String) ?? "Full"
        let content = (dict["content"] as? String) ?? ""
        let cleanContent = Formatters.cleanHtml(content)
        let cast = (dict["actor"] as? [String]) ?? []
        let director = (dict["director"] as? [String])?.first ?? ""
        
        // Parse categories
        var categories: [MovieCategory] = []
        if let cats = dict["category"] as? [[String: Any]] {
            for c in cats {
                if let cName = c["name"] as? String, let cSlug = c["slug"] as? String {
                    categories.append(MovieCategory(name: cName, slug: cSlug))
                }
            }
        }
        
        // Parse countries
        var countries: [MovieCountry] = []
        if let cnts = dict["country"] as? [[String: Any]] {
            for c in cnts {
                if let cName = c["name"] as? String, let cSlug = c["slug"] as? String {
                    countries.append(MovieCountry(name: cName, slug: cSlug))
                }
            }
        }
        
        let runtime = (dict["time"] as? String)?.components(separatedBy: " ").compactMap { Int($0) }.first ?? 120
        let trailer = (dict["trailer_url"] as? String)
        
        return NormalizedMovie(
            id: id,
            slug: slug,
            name: name,
            originName: originName,
            poster: ImageProxy.resolve(posterPath),
            thumb: ImageProxy.resolve(thumbPath),
            year: year,
            quality: quality,
            lang: lang,
            episodeCurrent: epCurrent,
            description: cleanContent,
            cast: cast,
            director: director,
            category: categories,
            country: countries,
            seasons: seasons,
            runtimeMinutes: runtime,
            trailerUrl: trailer
        )
    }
    
    private func parseEpisodes(_ rawList: [[String: Any]]) -> [MovieSeason] {
        var seasons: [MovieSeason] = []
        
        for (index, server) in rawList.enumerated() {
            let serverName = (server["server_name"] as? String) ?? "Server #\(index + 1)"
            let serverData = (server["server_data"] as? [[String: Any]]) ?? []
            
            var episodes: [MovieEpisode] = []
            for (epIdx, ep) in serverData.enumerated() {
                let name = (ep["name"] as? String) ?? "Tập \(epIdx + 1)"
                let slug = (ep["slug"] as? String) ?? "tap-\(epIdx + 1)"
                let linkM3u8 = ep["link_m3u8"] as? String
                let linkEmbed = ep["link_embed"] as? String
                let filename = ep["filename"] as? String
                
                episodes.append(
                    MovieEpisode(
                        id: "\(slug)_\(epIdx)",
                        title: name,
                        synopsis: "",
                        seasonNumber: index + 1,
                        episodeNumber: epIdx + 1,
                        linkM3u8: linkM3u8,
                        linkEmbed: linkEmbed,
                        filename: filename
                    )
                )
            }
            
            seasons.append(
                MovieSeason(
                    id: "season_\(index + 1)",
                    title: serverName,
                    seasonNumber: index + 1,
                    episodes: episodes
                )
            )
        }
        return seasons
    }
}
