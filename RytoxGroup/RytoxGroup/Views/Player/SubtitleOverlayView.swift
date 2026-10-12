//
//  SubtitleOverlayView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Custom WebVTT & SRT subtitle overlay renderer
//

import SwiftUI

public struct SubtitleOverlayView: View {
    public let text: String
    
    public init(text: String) {
        self.text = text
    }
    
    public var body: some View {
        if !text.isEmpty {
            Text(text)
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(Color.black.opacity(0.75))
                )
                .shadow(color: .black, radius: 4, x: 0, y: 2)
                .padding(.horizontal, 24)
                .padding(.bottom, 28)
        }
    }
}
