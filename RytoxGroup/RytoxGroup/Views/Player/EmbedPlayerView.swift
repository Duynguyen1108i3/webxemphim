//
//  EmbedPlayerView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  WKWebView wrapper for fallback embed streaming servers
//

import SwiftUI
import WebKit

public struct EmbedPlayerView: View {
    public let embedUrl: String
    public var onClose: () -> Void
    
    public init(embedUrl: String, onClose: @escaping () -> Void) {
        self.embedUrl = embedUrl
        self.onClose = onClose
    }
    
    public var body: some View {
        ZStack(alignment: .topLeading) {
            Color.black.ignoresSafeArea()
            
            CustomWebView(urlString: embedUrl)
                .ignoresSafeArea()
            
            // Floating Close Button
            Button(action: {
                HapticFeedback.light()
                onClose()
            }) {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 42, height: 42)
                    .liquidGlassPill()
            }
            .padding(.leading, 20)
            .padding(.top, 20)
        }
    }
}

private struct CustomWebView: UIViewRepresentable {
    let urlString: String
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.backgroundColor = .black
        webView.isOpaque = false
        webView.scrollView.backgroundColor = .black
        
        if let url = URL(string: urlString) {
            var request = URLRequest(url: url)
            request.setValue("https://rytoxgroup.com", forHTTPHeaderField: "Referer")
            webView.load(request)
        }
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
