//
//  ImageProxy.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Dynamic CDN resolution matching apps/frontend/src/lib/api/imageProxy.ts
//

import Foundation

public enum ImageProxy {
    /// Resolves full image URL given raw poster/thumb path
    public static func resolve(_ path: String?, cdnBase: String? = nil) -> String {
        guard let path = path, !path.isEmpty else {
            return ""
        }
        
        // If already full HTTP/HTTPS URL
        if path.hasPrefix("http://") || path.hasPrefix("https://") {
            return path
        }
        
        // If TMDB path starting with /
        if path.hasPrefix("/") && !path.contains("phim") {
            return "\(AppConfig.tmdbImageBaseURL)/w500\(path)"
        }
        
        // Otherwise use CDN base or default phimimg.com
        let base = cdnBase ?? AppConfig.defaultCdnImage
        let cleanBase = base.hasSuffix("/") ? String(base.dropLast()) : base
        let cleanPath = path.hasPrefix("/") ? String(path.dropFirst()) : path
        
        return "\(cleanBase)/\(cleanPath)"
    }
    
    /// High-resolution backdrop image resolution
    public static func resolveBackdrop(_ path: String?, cdnBase: String? = nil) -> String {
        guard let path = path, !path.isEmpty else {
            return ""
        }
        if path.hasPrefix("http://") || path.hasPrefix("https://") {
            return path
        }
        if path.hasPrefix("/") {
            return "\(AppConfig.tmdbImageBaseURL)/original\(path)"
        }
        let base = cdnBase ?? AppConfig.defaultCdnImage
        let cleanBase = base.hasSuffix("/") ? String(base.dropLast()) : base
        let cleanPath = path.hasPrefix("/") ? String(path.dropFirst()) : path
        return "\(cleanBase)/\(cleanPath)"
    }
}
