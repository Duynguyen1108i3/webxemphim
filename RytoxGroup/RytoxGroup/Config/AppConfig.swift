//
//  AppConfig.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Pure Liquid Glass Streaming Client
//

import Foundation

public enum AppConfig {
    // MARK: - App Identity
    public static let appName = "RytoxGroup"
    public static let bundleId = "com.rytoxgroup.streaming"
    public static let appVersion = "2.0.0"
    public static let buildNumber = "1"
    
    // MARK: - Backend API
    /// Default backend endpoint (can be configured in Settings)
    public static var backendBaseURL: String {
        get {
            UserDefaults.standard.string(forKey: "backend_api_url") ?? "http://localhost:4000/api"
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "backend_api_url")
        }
    }
    
    // MARK: - TMDB Integration
    /// Optional TMDB API key for high quality metadata
    public static var tmdbApiKey: String {
        get {
            UserDefaults.standard.string(forKey: "tmdb_api_key") ?? ""
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "tmdb_api_key")
        }
    }
    public static let tmdbBaseURL = "https://api.themoviedb.org/3"
    public static let tmdbImageBaseURL = "https://image.tmdb.org/t/p"
    
    // MARK: - Phim4K (PhimAPI) Integration
    public static let phimApiBaseURL = "https://phimapi.com"
    public static let defaultCdnImage = "https://phimimg.com"
    
    // MARK: - AniMapper Integration
    public static let aniMapperBaseURL = "https://api.animapper.net"
    
    // MARK: - Cinemeta (Stremio Catalog) Integration
    public static let cinemetaBaseURL = "https://v3-cinemeta.strem.io"
    
    // MARK: - Stremio Subtitles Addons
    public static let defaultSubtitleAddons: [String] = [
        "https://opensubtitles-v3.strem.io",
        "https://subtitles-v3.strem.io"
    ]
    
    // MARK: - Fallback Embed Video Servers
    public static let embedServers: [String] = [
        "https://vidsrc.cc/v2/embed",
        "https://multiembed.mov/directstream.php",
        "https://vidsrc.to/embed",
        "https://vidlink.pro"
    ]
    
    // MARK: - Performance & Cache
    public static let requestTimeoutSeconds: TimeInterval = 15.0
    public static let apiCacheTTLSeconds: TimeInterval = 300.0 // 5 minutes
    public static let searchDebounceMilliseconds: Int = 400
    public static let watchProgressHeartbeatInterval: TimeInterval = 10.0
}
