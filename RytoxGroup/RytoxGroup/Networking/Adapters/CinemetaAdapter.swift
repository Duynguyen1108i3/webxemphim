//
//  CinemetaAdapter.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Direct Swift translation of apps/frontend/src/lib/api/cinemeta.api.ts
//

import Foundation

public final class CinemetaAdapter {
    public static let shared = CinemetaAdapter()
    private let client = NetworkClient.shared
    
    private init() {}
    
    public func getMetadata(imdbId: String, type: String = "movie") async throws -> [String: Any]? {
        guard let url = URL(string: "\(AppConfig.cinemetaBaseURL)/meta/\(type)/\(imdbId).json") else {
            return nil
        }
        do {
            let json = try await client.fetchRawJSON(url)
            return json["meta"] as? [String: Any]
        } catch {
            return nil
        }
    }
}
