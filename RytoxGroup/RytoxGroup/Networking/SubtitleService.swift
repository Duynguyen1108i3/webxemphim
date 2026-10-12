//
//  SubtitleService.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Subtitle aggregator querying Stremio subtitle addons matching web implementation
//

import Foundation

public final class SubtitleService {
    public static let shared = SubtitleService()
    private let client = NetworkClient.shared
    
    private init() {}
    
    public func fetchSubtitles(
        imdbId: String?,
        mediaType: String = "movie",
        season: Int = 1,
        episode: Int = 1
    ) async -> [SubtitleTrack] {
        guard let imdbId = imdbId, !imdbId.isEmpty else { return [] }
        
        var tracks: [SubtitleTrack] = []
        let queryKey = mediaType == "movie" ? "\(imdbId)" : "\(imdbId):\(season):\(episode)"
        
        for addonRoot in AppConfig.defaultSubtitleAddons {
            guard let url = URL(string: "\(addonRoot)/subtitles/\(mediaType)/\(queryKey).json") else {
                continue
            }
            
            do {
                let json = try await client.fetchRawJSON(url)
                if let subs = json["subtitles"] as? [[String: Any]] {
                    for s in subs {
                        if let subUrl = s["url"] as? String,
                           let lang = (s["lang"] as? String) ?? (s["language"] as? String) {
                            let label = (s["label"] as? String) ?? lang.uppercased()
                            tracks.append(SubtitleTrack(language: lang, label: label, url: subUrl))
                        }
                    }
                }
            } catch {
                continue
            }
        }
        return tracks
    }
}
