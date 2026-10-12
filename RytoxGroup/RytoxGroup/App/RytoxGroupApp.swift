//
//  RytoxGroupApp.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  App entry point with AVAudioSession setup and global environment configuration
//

import SwiftUI
import AVFoundation

@main
struct RytoxGroupApp: App {
    @StateObject private var theme = ThemeManager.shared
    @StateObject private var auth = AuthManager.shared
    @StateObject private var playback = PlaybackManager.shared
    @StateObject private var favorites = FavoritesManager.shared
    
    init() {
        configureAudioSession()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(theme)
                .environmentObject(auth)
                .environmentObject(playback)
                .environmentObject(favorites)
                .background(Color.appDarkBg)
        }
    }
    
    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .moviePlayback,
                options: [.allowAirPlay, .duckOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Audio session configuration error: \(error)")
        }
    }
}
