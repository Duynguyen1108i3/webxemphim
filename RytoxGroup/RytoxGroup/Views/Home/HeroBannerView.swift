//
//  HeroBannerView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Cinematic Hero Banner with Ken Burns animation matching web hero section
//

import SwiftUI

public struct HeroBannerView: View {
    public let movie: NormalizedMovie
    public var onPlay: () -> Void
    public var onDetails: () -> Void
    
    @State private var isZoomed = false
    
    public init(movie: NormalizedMovie, onPlay: @escaping () -> Void, onDetails: @escaping () -> Void) {
        self.movie = movie
        self.onPlay = onPlay
        self.onDetails = onDetails
    }
    
    public var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Backdrop Image with Ken Burns Zoom
            GeometryReader { proxy in
                let w = proxy.size.width
                let h = proxy.size.height
                
                AsyncImage(url: URL(string: movie.thumb.isEmpty ? movie.poster : movie.thumb)) { phase in
                    if let img = phase.image {
                        img
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: w, height: h)
                            .scaleEffect(isZoomed ? 1.08 : 1.0)
                            .animation(.easeInOut(duration: 16).repeatForever(autoreverses: true), value: isZoomed)
                    } else {
                        Color.appCardDark
                    }
                }
                .clipped()
            }
            .frame(height: 480)
            
            // Cinema Mask Gradient Overlays
            VStack {
                LinearGradient(
                    colors: [Color.black.opacity(0.85), Color.clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 120)
                
                Spacer()
                
                LinearGradient(
                    stops: [
                        .init(color: .clear, location: 0.0),
                        .init(color: Color.appDarkBg.opacity(0.7), location: 0.5),
                        .init(color: Color.appDarkBg, location: 1.0)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 240)
            }
            .frame(height: 480)
            .allowsHitTesting(false)
            
            // Title & Info Content
            VStack(alignment: .leading, spacing: 10) {
                // Badges
                HStack(spacing: 8) {
                    BadgeView(.quality(movie.quality))
                    BadgeView(.language(movie.lang))
                    Text("\(movie.year)")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white.opacity(0.85))
                }
                
                // Stacked Hero Title
                Text(movie.name)
                    .font(.system(size: 32, weight: .black))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .shadow(color: Color.black.opacity(0.9), radius: 14, x: 0, y: 4)
                
                // Synopsis Preview
                if !movie.description.isEmpty {
                    Text(movie.description)
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(.white.opacity(0.75))
                        .lineLimit(2)
                        .shadow(color: Color.black.opacity(0.8), radius: 6, x: 0, y: 2)
                }
                
                // Actions
                HStack(spacing: 12) {
                    Button(action: {
                        HapticFeedback.medium()
                        onPlay()
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "play.fill")
                            Text("Xem Phim")
                        }
                    }
                    .buttonStyle(EmberButtonStyle(cornerRadius: 12))
                    
                    Button(action: {
                        HapticFeedback.light()
                        onDetails()
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "info.circle")
                            Text("Chi Tiết")
                        }
                    }
                    .buttonStyle(GlassButtonStyle(cornerRadius: 12))
                }
                .padding(.top, 4)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 24)
        }
        .frame(height: 480)
        .onAppear {
            isZoomed = true
        }
    }
}
