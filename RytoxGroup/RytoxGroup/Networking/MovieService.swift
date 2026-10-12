//
//  MovieService.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Unified Movie Facade & Fallback Streaming Engine mirroring movieApi.ts
//

import Foundation

public final class MovieService {
    public static let shared = MovieService()
    
    private let phim4k = Phim4KAdapter.shared
    private let tmdb = TMDBAdapter.shared
    private let animapper = AniMapperAdapter.shared
    private let subtitles = SubtitleService.shared
    private let cache = CacheManager.shared
    
    private init() {}
    
    // MARK: - 1. Get New Movies (Trending)
    public func getNewMovies(page: Int = 1) async -> [NormalizedMovie] {
        let cacheKey = "movies_new_\(page)"
        if let cached: [NormalizedMovie] = cache.get(forKey: cacheKey) {
            return cached
        }
        
        do {
            if tmdb.isConfigured {
                let results = try await tmdb.getTrending(page: page)
                if !results.isEmpty {
                    cache.set(results, forKey: cacheKey, ttlSeconds: AppConfig.apiCacheTTLSeconds)
                    return results
                }
            }
            let results = try await phim4k.getNewMovies(page: page)
            cache.set(results, forKey: cacheKey, ttlSeconds: AppConfig.apiCacheTTLSeconds)
            return results
        } catch {
            return []
        }
    }
    
    // MARK: - 2. Get By Genre
    public func getByGenre(slug: String, page: Int = 1) async -> [NormalizedMovie] {
        let cacheKey = "movies_genre_\(slug)_\(page)"
        if let cached: [NormalizedMovie] = cache.get(forKey: cacheKey) {
            return cached
        }
        
        do {
            let results = try await phim4k.getByGenre(slug: slug, page: page)
            cache.set(results, forKey: cacheKey, ttlSeconds: AppConfig.apiCacheTTLSeconds)
            return results
        } catch {
            return []
        }
    }
    
    // MARK: - 3. Get By Country
    public func getByCountry(slug: String, page: Int = 1) async -> [NormalizedMovie] {
        let cacheKey = "movies_country_\(slug)_\(page)"
        if let cached: [NormalizedMovie] = cache.get(forKey: cacheKey) {
            return cached
        }
        
        do {
            let results = try await phim4k.getByCountry(slug: slug, page: page)
            cache.set(results, forKey: cacheKey, ttlSeconds: AppConfig.apiCacheTTLSeconds)
            return results
        } catch {
            return []
        }
    }
    
    // MARK: - 4. Get By Special List (phim-bo, phim-le, hoat-hinh, tv-shows)
    public func getByList(type: String, page: Int = 1) async -> [NormalizedMovie] {
        let cacheKey = "movies_list_\(type)_\(page)"
        if let cached: [NormalizedMovie] = cache.get(forKey: cacheKey) {
            return cached
        }
        
        do {
            let results = try await phim4k.getByList(type: type, page: page)
            cache.set(results, forKey: cacheKey, ttlSeconds: AppConfig.apiCacheTTLSeconds)
            return results
        } catch {
            return []
        }
    }
    
    // MARK: - 5. Search Movies
    public func searchMovies(query: String, page: Int = 1) async -> [NormalizedMovie] {
        let cleanQuery = Validators.sanitize(query)
        guard !cleanQuery.isEmpty else { return [] }
        
        do {
            if tmdb.isConfigured {
                let tmdbResults = try await tmdb.search(query: cleanQuery, page: page)
                if !tmdbResults.isEmpty { return tmdbResults }
            }
            return try await phim4k.search(query: cleanQuery, limit: 24)
        } catch {
            return []
        }
    }
    
    // MARK: - 6. Get Movie Detail
    public func getMovieDetail(slug: String) async -> NormalizedMovie? {
        let cacheKey = "movie_detail_\(slug)"
        if let cached: NormalizedMovie = cache.get(forKey: cacheKey) {
            return cached
        }
        
        do {
            if let detail = try await phim4k.getDetail(slug: slug) {
                cache.set(detail, forKey: cacheKey, ttlSeconds: 600)
                return detail
            }
        } catch {
            // Error handling
        }
        return nil
    }
    
    // MARK: - 7. HLS Streaming Playback & Fallback Matrix (Reverse Engineered from Section 2.2)
    public func getPlayback(movie: NormalizedMovie, episodeId: String? = nil) async -> PlaybackSource? {
        // Fetch full detail if seasons are not hydrated yet
        var activeMovie = movie
        if activeMovie.seasons == nil || (activeMovie.seasons?.isEmpty ?? true) {
            if let hydrated = await getMovieDetail(slug: movie.slug) {
                activeMovie = hydrated
            }
        }
        
        // Priority 1: Check Phim4K direct .m3u8 streams
        if let seasons = activeMovie.seasons, !seasons.isEmpty {
            for season in seasons {
                let ep: MovieEpisode?
                if let epId = episodeId, !epId.isEmpty {
                    ep = season.episodes.first(where: { $0.id == epId })
                } else {
                    ep = season.episodes.first
                }
                
                if let targetEp = ep {
                    // Check direct HLS link
                    if let m3u8 = targetEp.linkM3u8, !m3u8.isEmpty, m3u8.contains(".m3u8") {
                        let subs = await subtitles.fetchSubtitles(
                            imdbId: activeMovie.imdbId,
                            mediaType: activeMovie.mediaType ?? "movie",
                            season: targetEp.seasonNumber,
                            episode: targetEp.episodeNumber
                        )
                        return PlaybackSource(
                            streamUrl: m3u8,
                            embedUrl: targetEp.linkEmbed,
                            isDirectHls: true,
                            serverName: "\(season.title) (Direct HLS)",
                            quality: activeMovie.quality,
                            subtitles: subs
                        )
                    }
                    
                    // Priority 2: PhimAPI embed player
                    if let embed = targetEp.linkEmbed, !embed.isEmpty {
                        return PlaybackSource(
                            streamUrl: nil,
                            embedUrl: embed,
                            isDirectHls: false,
                            serverName: "\(season.title) (Embed)",
                            quality: activeMovie.quality,
                            subtitles: []
                        )
                    }
                }
            }
        }
        
        // Priority 3: Fallback Matrix (vidsrc.cc, multiembed, etc.)
        let tmdbOrImdb = activeMovie.tmdbId ?? activeMovie.imdbId ?? activeMovie.id
        if !tmdbOrImdb.isEmpty {
            let embedUrl = "https://vidsrc.cc/v2/embed/movie/\(tmdbOrImdb)"
            return PlaybackSource(
                streamUrl: nil,
                embedUrl: embedUrl,
                isDirectHls: false,
                serverName: "Vidsrc VIP (1080p)",
                quality: "1080p",
                subtitles: []
            )
        }
        
        return nil
    }
    
    // MARK: - 8. Get Home Rows (Catalog composition)
    public func getHomeRows() async -> [MovieRowItem] {
        async let trendingTask = getNewMovies(page: 1)
        async let seriesTask = getByList(type: "phim-bo", page: 1)
        async let singleTask = getByList(type: "phim-le", page: 1)
        async let animeTask = getByList(type: "hoat-hinh", page: 1)
        async let actionTask = getByGenre(slug: "hanh-dong", page: 1)
        async let romanceTask = getByGenre(slug: "tinh-cam", page: 1)
        async let horrorTask = getByGenre(slug: "kinh-di", page: 1)
        
        let (trending, series, single, anime, action, romance, horror) = await (
            trendingTask, seriesTask, singleTask, animeTask, actionTask, romanceTask, horrorTask
        )
        
        var rows: [MovieRowItem] = []
        if !trending.isEmpty {
            rows.append(MovieRowItem(title: "🔥 Thịnh Hành Hôm Nay", slug: "trending", movies: trending))
        }
        if !series.isEmpty {
            rows.append(MovieRowItem(title: "📺 Phim Bộ Chọn Lọc", slug: "phim-bo", movies: series))
        }
        if !single.isEmpty {
            rows.append(MovieRowItem(title: "🎬 Phim Lẻ Chiếu Rạp", slug: "phim-le", movies: single))
        }
        if !anime.isEmpty {
            rows.append(MovieRowItem(title: "🌸 Anime Nhật Bản & Hoạt Hình", slug: "hoat-hinh", movies: anime))
        }
        if !action.isEmpty {
            rows.append(MovieRowItem(title: "💥 Hành Động & Kịch Tính", slug: "hanh-dong", movies: action))
        }
        if !romance.isEmpty {
            rows.append(MovieRowItem(title: "💖 Tình Cảm Lãng Mạn", slug: "tinh-cam", movies: romance))
        }
        if !horror.isEmpty {
            rows.append(MovieRowItem(title: "👻 Kinh Dị Rùng Rợn", slug: "kinh-di", movies: horror))
        }
        return rows
    }
    
    // MARK: - 9. Get Anime Rows
    public func getAnimeRows() async -> [MovieRowItem] {
        do {
            let animeTrending = try await animapper.getTrendingAnime(page: 1)
            let animeCatalog = try await phim4k.getByList(type: "hoat-hinh", page: 1)
            
            return [
                MovieRowItem(title: "⭐ Anime Thịnh Hành", slug: "anime-trending", movies: animeTrending),
                MovieRowItem(title: "🍿 Anime Mới Cập Nhật", slug: "anime-new", movies: animeCatalog)
            ]
        } catch {
            return []
        }
    }
}
