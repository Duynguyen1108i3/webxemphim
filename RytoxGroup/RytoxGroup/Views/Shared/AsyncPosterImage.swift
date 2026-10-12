//
//  AsyncPosterImage.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Async poster image with SVG gradient fallback & smooth crossfade
//

import SwiftUI

public struct AsyncPosterImage: View {
    public let urlString: String?
    public var cornerRadius: CGFloat = 12
    public var contentMode: ContentMode = .fill
    public var placeholderAspectRatio: CGFloat = 2.0 / 3.0
    
    public init(
        urlString: String?,
        cornerRadius: CGFloat = 12,
        contentMode: ContentMode = .fill,
        placeholderAspectRatio: CGFloat = 2.0 / 3.0
    ) {
        self.urlString = urlString
        self.cornerRadius = cornerRadius
        self.contentMode = contentMode
        self.placeholderAspectRatio = placeholderAspectRatio
    }
    
    public var body: some View {
        Group {
            if let str = urlString, let url = URL(string: str), !str.isEmpty {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        fallbackGradient
                            .overlay(
                                ProgressView()
                                    .tint(.white.opacity(0.6))
                                    .scaleEffect(0.8)
                            )
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: contentMode)
                    case .failure:
                        fallbackGradient
                            .overlay(
                                Image(systemName: "film")
                                    .font(.system(size: 24, weight: .light))
                                    .foregroundColor(.white.opacity(0.35))
                            )
                    @unknown default:
                        fallbackGradient
                    }
                }
            } else {
                fallbackGradient
                    .overlay(
                        Image(systemName: "film")
                            .font(.system(size: 24, weight: .light))
                            .foregroundColor(.white.opacity(0.35))
                    )
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }
    
    private var fallbackGradient: some View {
        LinearGradient(
            colors: [
                Color(hex: "1f2937"),
                Color(hex: "111827"),
                Color.appCardDark
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}
