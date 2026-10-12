//
//  MovieRowView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Horizontal scrolling row matching MovieRow.tsx on web
//

import SwiftUI

public struct MovieRowView: View {
    public let row: MovieRowItem
    public var onSelectMovie: (NormalizedMovie) -> Void
    
    public init(row: MovieRowItem, onSelectMovie: @escaping (NormalizedMovie) -> Void) {
        self.row = row
        self.onSelectMovie = onSelectMovie
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Row Title Header
            HStack {
                Text(row.title)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                    .shadow(color: Color.black.opacity(0.6), radius: 4, x: 0, y: 1)
                
                Spacer()
            }
            .padding(.horizontal, 18)
            
            // Horizontal Scroll Carousel
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 14) {
                    ForEach(row.movies) { movie in
                        MovieCardView(movie: movie) {
                            onSelectMovie(movie)
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 4)
            }
        }
    }
}
