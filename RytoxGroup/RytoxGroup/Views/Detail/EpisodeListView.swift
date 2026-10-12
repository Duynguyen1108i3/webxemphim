//
//  EpisodeListView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Episode selector with watch progress tracking for TV series & Anime
//

import SwiftUI

public struct EpisodeListView: View {
    public let seasons: [MovieSeason]
    public var onSelectEpisode: (MovieEpisode) -> Void
    
    @State private var selectedSeasonIndex = 0
    
    public init(seasons: [MovieSeason], onSelectEpisode: @escaping (MovieEpisode) -> Void) {
        self.seasons = seasons
        self.onSelectEpisode = onSelectEpisode
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Season / Server Selector Tabs
            if seasons.count > 1 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(seasons.enumerated()), id: \.offset) { index, season in
                            Button(action: {
                                HapticFeedback.selection()
                                selectedSeasonIndex = index
                            }) {
                                Text(season.title)
                            }
                            .buttonStyle(GlassPillButtonStyle(isSelected: selectedSeasonIndex == index))
                        }
                    }
                }
            }
            
            // Episodes List Grid
            if selectedSeasonIndex < seasons.count {
                let currentSeason = seasons[selectedSeasonIndex]
                
                LazyVGrid(
                    columns: [
                        GridItem(.flexible(), spacing: 10),
                        GridItem(.flexible(), spacing: 10),
                        GridItem(.flexible(), spacing: 10),
                        GridItem(.flexible(), spacing: 10)
                    ],
                    spacing: 10
                ) {
                    ForEach(currentSeason.episodes) { ep in
                        Button(action: {
                            HapticFeedback.light()
                            onSelectEpisode(ep)
                        }) {
                            VStack(spacing: 4) {
                                Image(systemName: "play.fill")
                                    .font(.system(size: 11))
                                    .foregroundColor(Color.appEmber)
                                
                                Text(ep.title)
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .liquidGlassCard(cornerRadius: 10)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
}
