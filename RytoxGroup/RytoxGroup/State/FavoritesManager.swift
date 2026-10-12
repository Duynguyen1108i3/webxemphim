//
//  FavoritesManager.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Favorites and My List state manager
//

import SwiftUI
import Combine

public final class FavoritesManager: ObservableObject {
    public static let shared = FavoritesManager()
    
    @Published public var favorites: [NormalizedMovie] = []
    
    private let favoritesKey = "rytox_favorites_movies"
    
    private init() {
        loadFavorites()
    }
    
    public func isFavorite(movieId: String) -> Bool {
        favorites.contains(where: { $0.id == movieId || $0.slug == movieId })
    }
    
    @MainActor
    public func toggleFavorite(_ movie: NormalizedMovie) {
        HapticFeedback.selection()
        if let idx = favorites.firstIndex(where: { $0.id == movie.id || $0.slug == movie.slug }) {
            favorites.remove(at: idx)
        } else {
            favorites.insert(movie, at: 0)
        }
        saveFavorites()
    }
    
    @MainActor
    public func removeFavorite(movieId: String) {
        HapticFeedback.light()
        favorites.removeAll(where: { $0.id == movieId || $0.slug == movieId })
        saveFavorites()
    }
    
    private func saveFavorites() {
        do {
            let data = try JSONEncoder().encode(favorites)
            UserDefaults.standard.set(data, forKey: favoritesKey)
        } catch {
            // Encode error
        }
    }
    
    private func loadFavorites() {
        guard let data = UserDefaults.standard.data(forKey: favoritesKey) else { return }
        do {
            let decoded = try JSONDecoder().decode([NormalizedMovie].self, from: data)
            self.favorites = decoded
        } catch {
            // Decode error
        }
    }
}
