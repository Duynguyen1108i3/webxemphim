//
//  APIEndpoint.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Unified API endpoints for multi-source media aggregator & backend
//

import Foundation

public enum APIEndpoint {
    // MARK: - PhimAPI Endpoints
    case phimApiNewMovies(page: Int)
    case phimApiGenre(slug: String, page: Int)
    case phimApiCountry(slug: String, page: Int)
    case phimApiSearch(query: String, limit: Int)
    case phimApiDetail(slug: String)
    case phimApiList(type: String, page: Int)
    
    // MARK: - TMDB Endpoints
    case tmdbTrending(page: Int)
    case tmdbDiscover(genreId: Int, page: Int)
    case tmdbSearch(query: String, page: Int)
    case tmdbDetail(id: String)
    case tmdbVideos(id: String)
    
    // MARK: - Backend Auth & User Endpoints
    case backendCsrf
    case backendLogin
    case backendRegister
    case backendLogout
    case backendMe
    case backendProfiles
    case backendWatchProgress(profileId: String)
    case backendWatchHistory(profileId: String)
    case backendFavorites(profileId: String)
    
    public var url: URL? {
        switch self {
        case .phimApiNewMovies(let page):
            return URL(string: "\(AppConfig.phimApiBaseURL)/danh-sach/phim-moi-cap-nhat?page=\(page)")
            
        case .phimApiGenre(let slug, let page):
            return URL(string: "\(AppConfig.phimApiBaseURL)/v1/api/the-loai/\(slug)?page=\(page)")
            
        case .phimApiCountry(let slug, let page):
            return URL(string: "\(AppConfig.phimApiBaseURL)/v1/api/quoc-gia/\(slug)?page=\(page)")
            
        case .phimApiSearch(let query, let limit):
            let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
            return URL(string: "\(AppConfig.phimApiBaseURL)/v1/api/tim-kiem?keyword=\(encoded)&limit=\(limit)")
            
        case .phimApiDetail(let slug):
            return URL(string: "\(AppConfig.phimApiBaseURL)/phim/\(slug)")
            
        case .phimApiList(let type, let page):
            return URL(string: "\(AppConfig.phimApiBaseURL)/v1/api/danh-sach/\(type)?page=\(page)")
            
        case .tmdbTrending(let page):
            return URL(string: "\(AppConfig.tmdbBaseURL)/trending/all/day?api_key=\(AppConfig.tmdbApiKey)&page=\(page)&language=vi-VN")
            
        case .tmdbDiscover(let genreId, let page):
            return URL(string: "\(AppConfig.tmdbBaseURL)/discover/movie?api_key=\(AppConfig.tmdbApiKey)&with_genres=\(genreId)&page=\(page)&sort_by=popularity.desc&language=vi-VN")
            
        case .tmdbSearch(let query, let page):
            let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
            return URL(string: "\(AppConfig.tmdbBaseURL)/search/multi?api_key=\(AppConfig.tmdbApiKey)&query=\(encoded)&page=\(page)&language=vi-VN")
            
        case .tmdbDetail(let id):
            return URL(string: "\(AppConfig.tmdbBaseURL)/movie/\(id)?api_key=\(AppConfig.tmdbApiKey)&append_to_response=credits,similar,videos&language=vi-VN")
            
        case .tmdbVideos(let id):
            return URL(string: "\(AppConfig.tmdbBaseURL)/movie/\(id)/videos?api_key=\(AppConfig.tmdbApiKey)")
            
        case .backendCsrf:
            return URL(string: "\(AppConfig.backendBaseURL)/auth/csrf")
            
        case .backendLogin:
            return URL(string: "\(AppConfig.backendBaseURL)/auth/login")
            
        case .backendRegister:
            return URL(string: "\(AppConfig.backendBaseURL)/auth/register")
            
        case .backendLogout:
            return URL(string: "\(AppConfig.backendBaseURL)/auth/logout")
            
        case .backendMe:
            return URL(string: "\(AppConfig.backendBaseURL)/users/me")
            
        case .backendProfiles:
            return URL(string: "\(AppConfig.backendBaseURL)/users/me/profiles")
            
        case .backendWatchProgress(let profileId):
            return URL(string: "\(AppConfig.backendBaseURL)/users/me/profiles/\(profileId)/watch-progress")
            
        case .backendWatchHistory(let profileId):
            return URL(string: "\(AppConfig.backendBaseURL)/users/me/profiles/\(profileId)/watch-history")
            
        case .backendFavorites(let profileId):
            return URL(string: "\(AppConfig.backendBaseURL)/users/me/profiles/\(profileId)/favorites")
        }
    }
}
