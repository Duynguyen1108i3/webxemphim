//
//  NotificationDropdownView.swift
//  RytoxGroup
//
//  Created for iOS 16.0 - 18.0
//  Live movie notification updates sheet
//

import SwiftUI

public struct NotificationDropdownView: View {
    public let latestMovies: [NormalizedMovie]
    public var onSelectMovie: (NormalizedMovie) -> Void
    @Environment(\.dismiss) private var dismiss
    
    public init(latestMovies: [NormalizedMovie], onSelectMovie: @escaping (NormalizedMovie) -> Void) {
        self.latestMovies = latestMovies
        self.onSelectMovie = onSelectMovie
    }
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color.appDarkBg.ignoresSafeArea()
                
                if latestMovies.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "bell.slash")
                            .font(.system(size: 40, weight: .light))
                            .foregroundColor(.white.opacity(0.3))
                        Text("Không có thông báo mới")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                    }
                } else {
                    List {
                        ForEach(latestMovies) { movie in
                            Button(action: {
                                dismiss()
                                onSelectMovie(movie)
                            }) {
                                HStack(spacing: 14) {
                                    AsyncPosterImage(urlString: movie.poster, cornerRadius: 8)
                                        .frame(width: 50, height: 75)
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Phim mới cập nhật!")
                                            .font(.system(size: 11, weight: .bold))
                                            .foregroundColor(Color.appEmber)
                                        
                                        Text(movie.name)
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundColor(.white)
                                            .lineLimit(1)
                                        
                                        Text("\(movie.episodeCurrent) • \(movie.year)")
                                            .font(.system(size: 12))
                                            .foregroundColor(.white.opacity(0.5))
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(.white.opacity(0.3))
                                }
                                .padding(.vertical, 6)
                            }
                            .listRowBackground(Color.clear)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Thông Báo Mới")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Đóng") { dismiss() }
                        .foregroundColor(.white)
                }
            }
        }
    }
}
